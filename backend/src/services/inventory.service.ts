import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface ConsumptionItem {
    materia_prima_id: number;
    cantidad_consumida: number;
}

export interface ConsumeMaterialsOptions {
    customConsumptions?: ConsumptionItem[];
    usuarioNombre?: string;
    observacion?: string;
    targetStatus?: string; // 'Completada' | 'Cerrada'
}

export class InventoryService {

    /**
     * Calcula la cantidad requerida de una materia prima para una cantidad a fabricar,
     * considerando la optimización por láminas (piezas_lamina_4x8) si aplica.
     */
    static calculateRequiredQuantity(
        itemCantidadRequerida: number,
        cantidadFabricar: number,
        piezasLamina?: string | null
    ): { cantidad: number; unidadCalculo: string } {
        if (piezasLamina) {
            const piezasPorLamina = Number(piezasLamina);
            if (piezasPorLamina > 0) {
                const laminas = Math.ceil(cantidadFabricar / piezasPorLamina);
                return {
                    cantidad: laminas,
                    unidadCalculo: `Láminas (${piezasPorLamina} pzas/lámina)`
                };
            }
        }
        return {
            cantidad: Number(itemCantidadRequerida) * cantidadFabricar,
            unidadCalculo: 'Unidades estándar'
        };
    }

    /**
     * Reserva materia prima para una Orden de Trabajo.
     * Incrementa stock_reservado sin descontar stock físico.
     */
    static async reserveMaterialsForOrder(
        tx: TransactionClient,
        ordenTrabajoId: number,
        usuarioNombre: string = 'Sistema'
    ) {
        const order = await tx.ordenTrabajo.findUnique({
            where: { id: ordenTrabajoId },
            include: {
                producto: {
                    include: {
                        listaMateriales: {
                            include: { materiaPrima: true }
                        }
                    }
                },
                materialesProyecto: true
            }
        });

        if (!order) throw new Error(`Orden de Trabajo ${ordenTrabajoId} no encontrada.`);

        // 1. OTs de Producción en Serie (usan BOM de Producto)
        if (order.tipo_orden !== 'PROYECTO_ESPECIAL' && order.producto) {
            for (const item of order.producto.listaMateriales) {
                const { cantidad: cantidadRequerida, unidadCalculo } = this.calculateRequiredQuantity(
                    Number(item.cantidad_requerida),
                    order.cantidad_fabricar,
                    order.piezas_lamina || order.producto.piezas_lamina_4x8
                );

                const mp = await tx.materiaPrima.findUnique({ where: { id: item.materia_prima_id } });
                if (!mp) throw new Error(`Materia prima ${item.materia_prima_id} no encontrada.`);

                const stockActual = Number(mp.stock_actual);
                const stockReservado = Number(mp.stock_reservado);
                const stockDisponible = Math.max(0, stockActual - stockReservado);
                const cantidadReservar = Math.min(cantidadRequerida, stockDisponible);
                const faltante = Math.max(0, cantidadRequerida - stockDisponible);

                if (cantidadReservar > 0) {
                    await tx.materiaPrima.update({
                        where: { id: mp.id },
                        data: { stock_reservado: { increment: cantidadReservar } }
                    });

                    await tx.movimientoInventarioMP.create({
                        data: {
                            materia_prima_id: mp.id,
                            tipo_movimiento: 'RESERVA_OT',
                            cantidad: cantidadReservar,
                            stock_anterior: stockActual,
                            stock_posterior: stockActual,
                            referencia_id: order.numero_ot,
                            orden_trabajo_id: order.id,
                            usuario_nombre: usuarioNombre,
                            observacion: `Reserva parcial para OT ${order.numero_ot} (${order.cantidad_fabricar} pzas de ${order.producto.nombre_producto}) - disponible ${stockDisponible} de ${cantidadRequerida} (${unidadCalculo})`
                        }
                    });
                }

                if (faltante > 0) {
                    await tx.movimientoInventarioMP.create({
                        data: {
                            materia_prima_id: mp.id,
                            tipo_movimiento: 'PENDIENTE_ABASTECIMIENTO',
                            cantidad: faltante,
                            stock_anterior: stockActual,
                            stock_posterior: stockActual,
                            referencia_id: order.numero_ot,
                            orden_trabajo_id: order.id,
                            usuario_nombre: usuarioNombre,
                            observacion: `Faltante de abastecimiento para OT ${order.numero_ot}. Requiere ${cantidadRequerida} (${unidadCalculo}), disponible ${stockDisponible}. Debe comprarse ${faltante}.`
                        }
                    });
                }
            }
        }
    }

    /**
     * Libera las reservas activas de una Orden de Trabajo (al ser cancelada).
     */
    static async releaseOrderReservations(
        tx: TransactionClient,
        ordenTrabajoId: number,
        usuarioNombre: string = 'Sistema',
        motivo: string = 'Cancelación de OT'
    ) {
        const order = await tx.ordenTrabajo.findUnique({
            where: { id: ordenTrabajoId }
        });

        if (!order) throw new Error(`Orden ${ordenTrabajoId} no encontrada.`);

        const activeReservationMovements = await tx.movimientoInventarioMP.findMany({
            where: {
                orden_trabajo_id: ordenTrabajoId,
                tipo_movimiento: { in: ['RESERVA_OT', 'En proceso'] }
            }
        });

        const liberationMovements = await tx.movimientoInventarioMP.findMany({
            where: {
                orden_trabajo_id: ordenTrabajoId,
                tipo_movimiento: { in: ['LIBERACION_RESERVA', 'CONSUMO_OT'] }
            }
        });

        // Calcular reserva neta pendiente por cada materia prima
        const netReservationsByMP = new Map<number, number>();

        for (const mov of activeReservationMovements) {
            const current = netReservationsByMP.get(mov.materia_prima_id) || 0;
            netReservationsByMP.set(mov.materia_prima_id, current + Number(mov.cantidad));
        }

        for (const mov of liberationMovements) {
            const current = netReservationsByMP.get(mov.materia_prima_id) || 0;
            netReservationsByMP.set(mov.materia_prima_id, current - Math.abs(Number(mov.cantidad)));
        }

        for (const [materiaPrimaId, pendingReserve] of netReservationsByMP.entries()) {
            if (pendingReserve <= 0) continue;

            const mp = await tx.materiaPrima.findUnique({ where: { id: materiaPrimaId } });
            if (!mp) continue;

            const amountToDecrement = Math.min(Number(mp.stock_reservado), pendingReserve);
            const stockActual = Number(mp.stock_actual);

            await tx.materiaPrima.update({
                where: { id: materiaPrimaId },
                data: { stock_reservado: { decrement: amountToDecrement } }
            });

            await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: materiaPrimaId,
                    tipo_movimiento: 'LIBERACION_RESERVA',
                    cantidad: -amountToDecrement,
                    stock_anterior: stockActual,
                    stock_posterior: stockActual,
                    referencia_id: order.numero_ot,
                    orden_trabajo_id: order.id,
                    usuario_nombre: usuarioNombre,
                    observacion: `${motivo}: liberación de ${amountToDecrement} ${mp.unidad_medida_stock} reservados`
                }
            });
        }
    }

    /**
     * Consume materias primas al completar o cerrar una OT.
     * Operación estrictamente ATÓMICA e IDEMPOTENTE.
     */
    static async consumeMaterialsForOrder(
        tx: TransactionClient,
        ordenTrabajoId: number,
        options: ConsumeMaterialsOptions = {}
    ) {
        const {
            customConsumptions,
            usuarioNombre = 'Sistema',
            observacion = 'Cierre / Completado de OT',
            targetStatus = 'Completada'
        } = options;

        const order = await tx.ordenTrabajo.findUnique({
            where: { id: ordenTrabajoId },
            include: {
                producto: {
                    include: {
                        listaMateriales: {
                            include: { materiaPrima: true }
                        }
                    }
                },
                materialesProyecto: true,
                tareas: true,
                movimientosInventario: true
            }
        });

        if (!order) throw new Error(`Orden ${ordenTrabajoId} no encontrada.`);

        // ========================================================
        // VALIDACIÓN DE IDEMPOTENCIA:
        // Si la OT ya tiene materiales_consumidos = true O ya tiene
        // movimientos de CONSUMO_OT registrados, NO volver a descontar.
        // ========================================================
        const hasConsumptionMovement = order.movimientosInventario.some(
            m => m.tipo_movimiento === 'CONSUMO_OT' || m.tipo_movimiento === 'CONSUMO'
        );

        if (order.materiales_consumidos || hasConsumptionMovement) {
            console.log(`[InventoryService] OT ${order.numero_ot} ya tiene materiales consumidos. Omitiendo descuento para evitar duplicidad.`);
            // Asegurar que el estado de la OT coincida con targetStatus
            const updatedOrder = await tx.ordenTrabajo.update({
                where: { id: order.id },
                data: {
                    estado_ot: targetStatus,
                    materiales_consumidos: true,
                    fecha_fin_real: order.fecha_fin_real || new Date()
                }
            });
            return {
                alreadyConsumed: true,
                order: updatedOrder,
                consumptions: []
            };
        }

        // ========================================================
        // DETERMINAR MATERIALES A CONSUMIR:
        // 1. Si se pasan consumos específicos (ej. consumo real != reservado)
        // 2. Si existen reservas registradas para esta OT
        // 3. Fallback: calcular del BOM del producto o materialesProyecto
        // ========================================================
        interface ResolvedConsumption {
            materia_prima_id: number;
            materiaPrima: any;
            cantidadAConsumir: number;
            cantidadReservada: number;
        }

        const itemsToProcess: ResolvedConsumption[] = [];

        // Obtener reservas activas previas de esta OT
        const activeReservations = order.movimientosInventario.filter(
            m => m.tipo_movimiento === 'RESERVA_OT' || m.tipo_movimiento === 'En proceso'
        );

        const reservationsByMP = new Map<number, number>();
        for (const res of activeReservations) {
            const current = reservationsByMP.get(res.materia_prima_id) || 0;
            reservationsByMP.set(res.materia_prima_id, current + Number(res.cantidad));
        }

        if (customConsumptions && customConsumptions.length > 0) {
            for (const c of customConsumptions) {
                const mp = await tx.materiaPrima.findUnique({ where: { id: c.materia_prima_id } });
                if (!mp) throw new Error(`Materia prima ${c.materia_prima_id} no encontrada.`);
                itemsToProcess.push({
                    materia_prima_id: c.materia_prima_id,
                    materiaPrima: mp,
                    cantidadAConsumir: Number(c.cantidad_consumida),
                    cantidadReservada: reservationsByMP.get(c.materia_prima_id) || 0
                });
            }
        } else if (reservationsByMP.size > 0) {
            // Consumir según reservas activas
            for (const [mpId, reservedQty] of reservationsByMP.entries()) {
                const mp = await tx.materiaPrima.findUnique({ where: { id: mpId } });
                if (!mp) continue;
                itemsToProcess.push({
                    materia_prima_id: mpId,
                    materiaPrima: mp,
                    cantidadAConsumir: reservedQty,
                    cantidadReservada: reservedQty
                });
            }
        } else if (order.tipo_orden !== 'PROYECTO_ESPECIAL' && order.producto?.listaMateriales?.length) {
            // OTs sin reserva previa pero con BOM
            for (const item of order.producto.listaMateriales) {
                const { cantidad } = this.calculateRequiredQuantity(
                    Number(item.cantidad_requerida),
                    order.cantidad_fabricar,
                    order.piezas_lamina || order.producto.piezas_lamina_4x8
                );
                const mp = await tx.materiaPrima.findUnique({ where: { id: item.materia_prima_id } });
                if (!mp) continue;
                itemsToProcess.push({
                    materia_prima_id: mp.id,
                    materiaPrima: mp,
                    cantidadAConsumir: cantidad,
                    cantidadReservada: 0
                });
            }
        }

        // ========================================================
        // VALIDACIÓN DE STOCK FÍSICO ANTES DE DESCONTAR:
        // No permitir stock negativo ni inventar material no disponible.
        // ========================================================
        const executedConsumptions = [];

        for (const item of itemsToProcess) {
            const currentMP = await tx.materiaPrima.findUnique({ where: { id: item.materia_prima_id } });
            if (!currentMP) continue;

            const stockAnterior = Number(currentMP.stock_actual);
            const cantidadDisponible = Math.max(0, Math.min(item.cantidadAConsumir, stockAnterior));
            const faltante = Math.max(0, item.cantidadAConsumir - stockAnterior);
            const stockPosterior = stockAnterior - cantidadDisponible;

            // La reserva a decrementar es como máximo la reserva que tenía esta OT
            // y nunca mayor a lo que la MP tiene en stock_reservado actualmente
            const reservaADecrementar = Math.min(
                Number(currentMP.stock_reservado),
                item.cantidadReservada
            );

            if (cantidadDisponible > 0) {
                await tx.materiaPrima.update({
                    where: { id: item.materia_prima_id },
                    data: {
                        stock_actual: { decrement: cantidadDisponible },
                        stock_reservado: { decrement: reservaADecrementar }
                    }
                });

                const mov = await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: item.materia_prima_id,
                        tipo_movimiento: 'CONSUMO_OT',
                        cantidad: -cantidadDisponible,
                        stock_anterior: stockAnterior,
                        stock_posterior: stockPosterior,
                        referencia_id: order.numero_ot,
                        orden_trabajo_id: order.id,
                        usuario_nombre: usuarioNombre,
                        observacion: `${observacion} - OT ${order.numero_ot}. Consumo real de ${cantidadDisponible} ${currentMP.unidad_medida_stock}. Reserva liberada: ${reservaADecrementar}.`
                    }
                });

                executedConsumptions.push(mov);
            }

            if (faltante > 0) {
                await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: item.materia_prima_id,
                        tipo_movimiento: 'PENDIENTE_ABASTECIMIENTO',
                        cantidad: faltante,
                        stock_anterior: stockAnterior,
                        stock_posterior: stockAnterior,
                        referencia_id: order.numero_ot,
                        orden_trabajo_id: order.id,
                        usuario_nombre: usuarioNombre,
                        observacion: `Faltante de materiales para OT ${order.numero_ot}. Requerido ${item.cantidadAConsumir}, consumido ${cantidadDisponible}, pendiente ${faltante} ${currentMP.unidad_medida_stock}.`
                    }
                });
            }

            // 3. Si hubo devolución / sobrante (se reservó más de lo consumido):
            if (item.cantidadReservada > item.cantidadAConsumir) {
                const sobrante = item.cantidadReservada - item.cantidadAConsumir;
                await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: item.materia_prima_id,
                        tipo_movimiento: 'DEVOLUCION_SOBRANTE',
                        cantidad: sobrante,
                        stock_anterior: stockPosterior,
                        stock_posterior: stockPosterior, // El stock físico no varía porque solo fue reserva no usada
                        referencia_id: order.numero_ot,
                        orden_trabajo_id: order.id,
                        usuario_nombre: usuarioNombre,
                        observacion: `Sobrante de material OT ${order.numero_ot}. ${sobrante} ${currentMP.unidad_medida_stock} devueltos al stock disponible.`
                    }
                });
            }
        }

        // ========================================================
        // ACTUALIZAR ESTADO DE LA ORDEN DE TRABAJO:
        // ========================================================
        const updatedOrder = await tx.ordenTrabajo.update({
            where: { id: order.id },
            data: {
                estado_ot: targetStatus,
                materiales_consumidos: true,
                fecha_consumo: new Date(),
                fecha_fin_real: order.fecha_fin_real || new Date()
            }
        });

        // ========================================================
        // NOTA: El ingreso al stock de producto terminado NO se
        // ejecuta en el consumo de materias primas; se gestiona
        // exclusivamente a través de registerFinishedProductEntry
        // al completar la operación «VERIFICACIÓN Y EMPAQUE».
        // ========================================================

        return {
            alreadyConsumed: false,
            order: updatedOrder,
            consumptions: executedConsumptions
        };
    }

    /**
     * Determina si una tarea corresponde a la operación de "VERIFICACIÓN Y EMPAQUE"
     * que habilita el ingreso de producto terminado al catálogo.
     */
    static isVerificationAndPackagingTask(task: {
        rutaFabricacion?: { nombre_operacion?: string | null } | null;
    }): boolean {
        const rawName = task.rutaFabricacion?.nombre_operacion || '';
        const clean = rawName
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        if (clean === 'VERIFICACION DE MEDIDA') return false;

        return (
            clean === 'VERIFICACION Y EMPAQUE' ||
            clean === 'VERIFICACION' ||
            clean === 'EMPAQUE' ||
            clean.includes('VERIFICACION Y EMPAQUE') ||
            clean.includes('EMPAQUE') ||
            clean.includes('VERIFICACION')
        );
    }

    /**
     * Verifica si una tarea es la responsable de ingresar producto terminado al catálogo.
     * Reglas de negocio:
     * 1. Las operaciones anteriores NO deben generar entradas de producto terminado.
     * 2. Si la orden posee tareas de VERIFICACIÓN Y EMPAQUE, exclusivamente ellas ingresan stock.
     * 3. Fallback: Si la ruta del producto no tiene ninguna operación de verificación/empaque,
     *    únicamente la última tarea de la ruta puede ingresar producto terminado.
     */
    static isEligibleForFinishedStockEntry(
        currentTask: { id: number; secuencia_ot?: number | null; rutaFabricacion?: { no_operacion?: number | null; nombre_operacion?: string | null } | null },
        allOrderTasks: Array<{ id: number; secuencia_ot?: number | null; rutaFabricacion?: { no_operacion?: number | null; nombre_operacion?: string | null } | null }>
    ): boolean {
        if (InventoryService.isVerificationAndPackagingTask(currentTask)) {
            return true;
        }

        const hasVerificationTask = allOrderTasks.some(t => InventoryService.isVerificationAndPackagingTask(t));
        if (hasVerificationTask) {
            return false;
        }

        const sorted = [...allOrderTasks].sort(
            (a, b) => (b.secuencia_ot ?? b.rutaFabricacion?.no_operacion ?? b.id) - (a.secuencia_ot ?? a.rutaFabricacion?.no_operacion ?? a.id)
        );
        return sorted.length > 0 && sorted[0].id === currentTask.id;
    }

    /**
     * Registra el ingreso de producto terminado al catálogo de productos de forma transaccional,
     * atómica e idempotente, respetando entregas parciales y deltas aprobados.
     */
    static async registerFinishedProductEntry(
        tx: any,
        params: {
            ordenTrabajoId: number;
            tareaId: number;
            cantidadBuenaAprobada: number;
            usuarioNombre?: string;
            observacion?: string;
        }
    ) {
        const { ordenTrabajoId, tareaId, cantidadBuenaAprobada, usuarioNombre, observacion } = params;

        const task = await tx.tareaProduccion.findUnique({
            where: { id: tareaId },
            include: {
                rutaFabricacion: true,
                ordenTrabajo: {
                    include: {
                        producto: true,
                        tareas: {
                            include: { rutaFabricacion: true }
                        }
                    }
                }
            }
        });

        if (!task) {
            throw new Error(`Tarea ${tareaId} no encontrada.`);
        }

        const order = task.ordenTrabajo;
        if (!order) {
            throw new Error(`Orden asociada a la tarea ${tareaId} no encontrada.`);
        }

        if (!order.producto_id) {
            return {
                executed: false,
                reason: 'La orden no tiene producto_id asociado en catálogo.'
            };
        }

        // CONDICIÓN 1: Las operaciones anteriores no deben generar entradas de producto terminado.
        const isEligible = InventoryService.isEligibleForFinishedStockEntry(task, order.tareas);
        if (!isEligible) {
            return {
                executed: false,
                reason: `La operación "${task.rutaFabricacion?.nombre_operacion || 'Operación previa'}" no genera entradas de producto terminado (solo Verificación y Empaque).`
            };
        }

        // CONDICIÓN 2 & 6: Registrar únicamente la cantidad aprobada y soportar entregas parciales mediante delta
        const aprobadaActual = Math.max(0, Number(cantidadBuenaAprobada || 0));
        const yaIngresada = Math.max(0, Number(task.cantidad_ingresada_stock || 0));
        const delta = aprobadaActual - yaIngresada;

        // CONDICIONES 3, 4, 5: Si no hay incremento positivo (re-guardado sin cambios o delta <= 0), no generar entrada
        if (delta <= 0) {
            return {
                executed: false,
                delta: 0,
                alreadyCredited: yaIngresada,
                reason: 'No hay unidades adicionales aprobadas para ingresar al stock.'
            };
        }

        // Clave de idempotencia única a nivel de transacción y PostgreSQL
        const idempotencyKey = `PROD_OT_${order.id}_TASK_${task.id}_P_${order.producto_id}_FROM_${yaIngresada}_TO_${aprobadaActual}`;

        const existingMovement = await tx.movimientoProducto.findUnique({
            where: { idempotency_key: idempotencyKey }
        });

        if (existingMovement) {
            return {
                executed: false,
                alreadyExists: true,
                movement: existingMovement,
                reason: 'El movimiento para esta entrega ya fue registrado previamente (idempotente).'
            };
        }

        // Transacción Atómica: Lectura de stock anterior y actualización de stock posterior
        const producto = await tx.producto.findUnique({
            where: { id: order.producto_id }
        });

        if (!producto) {
            throw new Error(`Producto ${order.producto_id} no encontrado.`);
        }

        const stockAnterior = producto.stock_actual;
        const stockPosterior = stockAnterior + delta;

        // 1. Actualizar stock del producto
        await tx.producto.update({
            where: { id: order.producto_id },
            data: {
                stock_actual: { increment: delta }
            }
        });

        // 2. Crear movimiento de producto con control antiduplicados
        const opName = task.rutaFabricacion?.nombre_operacion || 'VERIFICACIÓN Y EMPAQUE';
        let movimiento;
        try {
            movimiento = await tx.movimientoProducto.create({
                data: {
                    producto_id: order.producto_id,
                    orden_trabajo_id: order.id,
                    tarea_id: task.id,
                    tipo_movimiento: 'PRODUCCION_OT',
                    cantidad: delta,
                    referencia: order.numero_ot,
                    idempotency_key: idempotencyKey,
                    stock_anterior: stockAnterior,
                    stock_posterior: stockPosterior,
                    usuario: usuarioNombre || 'Sistema',
                    observacion: observacion || `Ingreso de producto terminado: ${opName} (OT ${order.numero_ot}). Entrega: +${delta} uds (Total aprobadas: ${aprobadaActual}).`
                }
            });
        } catch (err: any) {
            if (err?.code === 'P2002' || err?.message?.includes('idempotency_key')) {
                console.log(`[InventoryService] Idempotencia interceptó solicitud simultánea: ${idempotencyKey}`);
                const existing = await tx.movimientoProducto.findUnique({ where: { idempotency_key: idempotencyKey } });
                return {
                    executed: false,
                    alreadyExists: true,
                    movement: existing,
                    reason: 'Entrada duplicada prevenida por clave de idempotencia única.'
                };
            }
            throw err;
        }

        // 3. Marcar tarea con la cantidad ingresada al stock
        await tx.tareaProduccion.update({
            where: { id: task.id },
            data: {
                cantidad_ingresada_stock: aprobadaActual,
                ingreso_stock_procesado: true,
                fecha_ingreso_stock: new Date()
            }
        });

        // 4. Actualizar total aprobado en la Orden de Trabajo
        const allVerificationTasks = order.tareas.filter((t: any) => 
            t.id === task.id ? true : InventoryService.isVerificationAndPackagingTask(t)
        );
        const totalAprobadoOT = allVerificationTasks.reduce((sum: number, t: any) => {
            if (t.id === task.id) return sum + aprobadaActual;
            return sum + (Number(t.cantidad_ingresada_stock || t.cantidad_buena) || 0);
        }, 0);

        await tx.ordenTrabajo.update({
            where: { id: order.id },
            data: {
                cantidad_aprobada: totalAprobadoOT
            }
        });

        return {
            executed: true,
            delta,
            stockAnterior,
            stockPosterior,
            idempotencyKey,
            movimiento
        };
    }

    /**
     * Revisa inconsistencias globales en el inventario.
     */
    static async checkInventoryConsistency() {
        const materials = await prisma.materiaPrima.findMany({
            include: {
                movimientos: {
                    take: 5,
                    orderBy: { fecha_hora: 'desc' }
                }
            }
        });

        const issues: Array<{
            tipo: string;
            severidad: 'CRITICA' | 'ALTA' | 'MEDIA';
            mensaje: string;
            detalles: any;
        }> = [];

        for (const m of materials) {
            const stockActual = Number(m.stock_actual);
            const stockReservado = Number(m.stock_reservado);
            const stockDisponible = stockActual - stockReservado;

            if (stockActual < 0) {
                issues.push({
                    tipo: 'STOCK_NEGATIVO',
                    severidad: 'CRITICA',
                    mensaje: `Material "${m.nombre_mp}" (${m.sku_mp}) tiene stock físico negativo: ${stockActual} ${m.unidad_medida_stock}.`,
                    detalles: { materia_prima_id: m.id, sku_mp: m.sku_mp, stock_actual: stockActual }
                });
            }

            if (stockReservado < 0) {
                issues.push({
                    tipo: 'RESERVA_NEGATIVA',
                    severidad: 'CRITICA',
                    mensaje: `Material "${m.nombre_mp}" (${m.sku_mp}) tiene reserva negativa: ${stockReservado}.`,
                    detalles: { materia_prima_id: m.id, sku_mp: m.sku_mp, stock_reservado: stockReservado }
                });
            }

            if (stockReservado > stockActual) {
                issues.push({
                    tipo: 'RESERVA_EXCEDE_STOCK',
                    severidad: 'ALTA',
                    mensaje: `Material "${m.nombre_mp}" tiene reserva (${stockReservado}) superior al stock físico (${stockActual}). Disponible: ${stockDisponible}.`,
                    detalles: { materia_prima_id: m.id, sku_mp: m.sku_mp, stock_actual: stockActual, stock_reservado: stockReservado, stock_disponible: stockDisponible }
                });
            }
        }

        // Revisar OTs completadas / cerradas sin consumo registrado
        const completedOTs = await prisma.ordenTrabajo.findMany({
            where: {
                estado_ot: { in: ['Completada', 'Cerrada', 'Finalizada'] }
            },
            include: {
                producto: {
                    include: {
                        listaMateriales: {
                            include: { materiaPrima: true }
                        }
                    }
                },
                materialesProyecto: true,
                movimientosInventario: true
            }
        });

        for (const ot of completedOTs) {
            const hasConsumption = ot.movimientosInventario.some(
                m => m.tipo_movimiento === 'CONSUMO_OT' || m.tipo_movimiento === 'CONSUMO'
            );

            const hasMaterials = (ot.producto?.listaMateriales?.length || 0) > 0 || (ot.materialesProyecto?.length || 0) > 0;

            if (hasMaterials && !hasConsumption && !ot.materiales_consumidos) {
                issues.push({
                    tipo: 'OT_CERRADA_SIN_CONSUMO',
                    severidad: 'ALTA',
                    mensaje: `OT ${ot.numero_ot} (${ot.estado_ot}) tiene materiales asociados pero nunca registró el consumo de materia prima.`,
                    detalles: {
                        orden_trabajo_id: ot.id,
                        numero_ot: ot.numero_ot,
                        estado_ot: ot.estado_ot,
                        producto: ot.producto?.nombre_producto,
                        materiales_count: ot.producto?.listaMateriales?.length || ot.materialesProyecto?.length
                    }
                });
            }

            // OTs cerradas o canceladas con reservas aún activas
            const totalReserved = ot.movimientosInventario
                .filter(m => m.tipo_movimiento === 'RESERVA_OT' || m.tipo_movimiento === 'En proceso')
                .reduce((acc, m) => acc + Number(m.cantidad), 0);

            const totalReleased = ot.movimientosInventario
                .filter(m => m.tipo_movimiento === 'LIBERACION_RESERVA' || m.tipo_movimiento === 'CONSUMO_OT')
                .reduce((acc, m) => acc + Math.abs(Number(m.cantidad)), 0);

            if (totalReserved > totalReleased + 0.001) {
                issues.push({
                    tipo: 'OT_FINALIZADA_CON_RESERVA_PENDIENTE',
                    severidad: 'MEDIA',
                    mensaje: `OT ${ot.numero_ot} (${ot.estado_ot}) retiene reservas pendientes no liberadas (${(totalReserved - totalReleased).toFixed(2)} unidades).`,
                    detalles: {
                        orden_trabajo_id: ot.id,
                        numero_ot: ot.numero_ot,
                        estado_ot: ot.estado_ot,
                        reserva_pendiente: totalReserved - totalReleased
                    }
                });
            }
        }

        return {
            consistent: issues.length === 0,
            totalInconsistencias: issues.length,
            conteoPorTipo: issues.reduce((acc: any, i) => {
                acc[i.tipo] = (acc[i.tipo] || 0) + 1;
                return acc;
            }, {}),
            issues
        };
    }

    /**
     * Obtiene el listado de OTs completadas con su estado de materiales para auditoría administrativa.
     */
    static async getCompletedOTsAudit() {
        const ots = await prisma.ordenTrabajo.findMany({
            where: {
                estado_ot: { in: ['Completada', 'Cerrada', 'Finalizada'] }
            },
            include: {
                producto: {
                    include: {
                        listaMateriales: {
                            include: { materiaPrima: true }
                        }
                    }
                },
                materialesProyecto: true,
                movimientosInventario: true
            },
            orderBy: { id: 'desc' }
        });

        return ots.map(ot => {
            const hasConsumption = ot.movimientosInventario.some(
                m => m.tipo_movimiento === 'CONSUMO_OT' || m.tipo_movimiento === 'CONSUMO'
            );

            const activeReservations = ot.movimientosInventario.filter(
                m => m.tipo_movimiento === 'RESERVA_OT' || m.tipo_movimiento === 'En proceso'
            );

            const totalReserved = activeReservations.reduce((acc, m) => acc + Number(m.cantidad), 0);

            const totalConsumed = ot.movimientosInventario
                .filter(m => m.tipo_movimiento === 'CONSUMO_OT' || m.tipo_movimiento === 'CONSUMO')
                .reduce((acc, m) => acc + Math.abs(Number(m.cantidad)), 0);

            const requiredMaterials = (ot.producto?.listaMateriales || []).map(item => {
                const { cantidad } = this.calculateRequiredQuantity(
                    Number(item.cantidad_requerida),
                    ot.cantidad_fabricar,
                    ot.piezas_lamina || ot.producto?.piezas_lamina_4x8
                );
                return {
                    materia_prima_id: item.materia_prima_id,
                    nombre_mp: item.materiaPrima.nombre_mp,
                    sku_mp: item.materiaPrima.sku_mp,
                    cantidad_requerida: cantidad,
                    unidad: item.materiaPrima.unidad_medida_stock
                };
            });

            return {
                id: ot.id,
                numero_ot: ot.numero_ot,
                estado_ot: ot.estado_ot,
                fecha_creacion: ot.fecha_creacion,
                producto: ot.producto ? {
                    id: ot.producto.id,
                    nombre_producto: ot.producto.nombre_producto,
                    sku_producto: ot.producto.sku_producto
                } : null,
                cantidad_fabricar: ot.cantidad_fabricar,
                materiales_requeridos: requiredMaterials,
                materiales_consumidos_flag: ot.materiales_consumidos,
                has_consumo_movement: hasConsumption,
                total_reservado: totalReserved,
                total_consumido: totalConsumed,
                estado_inventario: hasConsumption ? 'CONSUMIDO' : (requiredMaterials.length > 0 ? 'PENDIENTE_CONSUMO' : 'SIN_MATERIALES')
            };
        });
    }

    /**
     * Reconcilia de forma controlada una OT completada que no registró consumo.
     */
    static async reconcileOrder(ordenTrabajoId: number, usuarioNombre: string = 'Administrador') {
        return await prisma.$transaction(async (tx) => {
            return await this.consumeMaterialsForOrder(tx, ordenTrabajoId, {
                usuarioNombre,
                observacion: `Reconciliación manual administrativa de inventario por ${usuarioNombre}`,
                targetStatus: 'Completada'
            });
        });
    }

    /**
     * Limpia de forma controlada reservas huérfanas en materiales con OTs finalizadas o canceladas.
     */
    static async cleanStrandedReservations(usuarioNombre: string = 'Administrador') {
        return await prisma.$transaction(async (tx) => {
            // Buscar todas las OTs en proceso o pendientes (las únicas que legítimamente deben retener reservas)
            const activeOTs = await tx.ordenTrabajo.findMany({
                where: { estado_ot: { in: ['Pendiente', 'En Progreso', 'Iniciada'] } },
                select: { id: true }
            });
            const activeOTIds = activeOTs.map(o => o.id);

            // Buscar todas las reservas de OTs activas
            const legitimateReservations = await tx.movimientoInventarioMP.findMany({
                where: {
                    orden_trabajo_id: { in: activeOTIds },
                    tipo_movimiento: { in: ['RESERVA_OT', 'En proceso'] }
                }
            });

            const legitimateLiberations = await tx.movimientoInventarioMP.findMany({
                where: {
                    orden_trabajo_id: { in: activeOTIds },
                    tipo_movimiento: { in: ['LIBERACION_RESERVA', 'CONSUMO_OT'] }
                }
            });

            // Suma legítima requerida de reservas por materia prima
            const legitimateMap = new Map<number, number>();

            for (const r of legitimateReservations) {
                const cur = legitimateMap.get(r.materia_prima_id) || 0;
                legitimateMap.set(r.materia_prima_id, cur + Number(r.cantidad));
            }

            for (const l of legitimateLiberations) {
                const cur = legitimateMap.get(l.materia_prima_id) || 0;
                legitimateMap.set(l.materia_prima_id, Math.max(0, cur - Math.abs(Number(l.cantidad))));
            }

            const materials = await tx.materiaPrima.findMany();
            const corrections = [];

            for (const m of materials) {
                const actualReservado = Number(m.stock_reservado);
                const legitimoReservado = legitimateMap.get(m.id) || 0;

                if (Math.abs(actualReservado - legitimoReservado) > 0.0001) {
                    await tx.materiaPrima.update({
                        where: { id: m.id },
                        data: { stock_reservado: legitimoReservado }
                    });

                    await tx.movimientoInventarioMP.create({
                        data: {
                            materia_prima_id: m.id,
                            tipo_movimiento: 'AJUSTE_RESERVA',
                            cantidad: legitimoReservado - actualReservado,
                            stock_anterior: Number(m.stock_actual),
                            stock_posterior: Number(m.stock_actual),
                            referencia_id: 'SANEAMIENTO_RESERVAS',
                            usuario_nombre: usuarioNombre,
                            observacion: `Ajuste de reserva huérfana de ${actualReservado} a ${legitimoReservado} por saneamiento del sistema.`
                        }
                    });

                    corrections.push({
                        materia_prima_id: m.id,
                        sku_mp: m.sku_mp,
                        nombre_mp: m.nombre_mp,
                        reserva_anterior: actualReservado,
                        reserva_corregida: legitimoReservado
                    });
                }
            }

            return {
                message: `Se sanearon reservas en ${corrections.length} materias primas.`,
                corrections
            };
        });
    }

    /**
     * Datos agregados y serie para el Dashboard de Stock de Materia Prima.
     */
    static async getInventoryDashboardData(filters: { categoria?: string; search?: string; estado?: string } = {}) {
        const where: any = {};
        if (filters.categoria && filters.categoria !== 'TODAS') {
            where.categoria_mp = filters.categoria;
        }

        const materials = await prisma.materiaPrima.findMany({
            where,
            orderBy: { nombre_mp: 'asc' }
        });

        let stockTotalGeneral = 0;
        let stockReservadoGeneral = 0;
        let stockDisponibleGeneral = 0;
        let bajoMinimoCount = 0;
        let agotadasCount = 0;

        const chartItems = [];
        const alertsList = [];

        for (const m of materials) {
            const actual = Number(m.stock_actual);
            const reservado = Number(m.stock_reservado);
            const disponible = actual - reservado;
            const minimo = Number(m.punto_reorden);

            stockTotalGeneral += actual;
            stockReservadoGeneral += reservado;
            stockDisponibleGeneral += disponible;

            let estado = 'NORMAL';
            if (disponible <= 0) {
                estado = 'AGOTADO';
                agotadasCount++;
            } else if (disponible <= minimo) {
                estado = 'BAJO_MINIMO';
                bajoMinimoCount++;
            }

            if (estado !== 'NORMAL') {
                alertsList.push({
                    id: m.id,
                    sku_mp: m.sku_mp,
                    nombre_mp: m.nombre_mp,
                    categoria_mp: m.categoria_mp,
                    unidad: m.unidad_medida_stock,
                    stock_actual: actual,
                    stock_reservado: reservado,
                    stock_disponible: disponible,
                    punto_reorden: minimo,
                    estado,
                    prioridad: estado === 'AGOTADO' ? 'ALTA' : 'MEDIA'
                });
            }

            // Filtrado secundario por estado o búsqueda
            let matchSearch = true;
            if (filters.search) {
                const term = filters.search.toLowerCase();
                matchSearch = m.nombre_mp.toLowerCase().includes(term) ||
                              m.sku_mp.toLowerCase().includes(term) ||
                              (m.descripcion || '').toLowerCase().includes(term);
            }

            let matchEstado = true;
            if (filters.estado && filters.estado !== 'TODOS') {
                matchEstado = estado === filters.estado;
            }

            if (matchSearch && matchEstado) {
                chartItems.push({
                    id: m.id,
                    sku_mp: m.sku_mp,
                    nombre_mp: m.nombre_mp,
                    categoria_mp: m.categoria_mp,
                    unidad: m.unidad_medida_stock,
                    stock_total: actual,
                    stock_reservado: Math.max(0, reservado),
                    stock_disponible: Math.max(0, disponible),
                    punto_reorden: minimo,
                    estado
                });
            }
        }

        // Últimos 15 movimientos
        const recentMovements = await prisma.movimientoInventarioMP.findMany({
            take: 15,
            orderBy: { fecha_hora: 'desc' },
            include: {
                materiaPrima: {
                    select: { id: true, nombre_mp: true, sku_mp: true, unidad_medida_stock: true }
                },
                ordenTrabajo: {
                    select: { id: true, numero_ot: true, estado_ot: true }
                }
            }
        });

        // Verificación de consistencia rápida
        const consistency = await this.checkInventoryConsistency();

        return {
            kpis: {
                stock_total: Number(stockTotalGeneral.toFixed(2)),
                stock_reservado: Number(stockReservadoGeneral.toFixed(2)),
                stock_disponible: Number(stockDisponibleGeneral.toFixed(2)),
                total_referencias: materials.length,
                referencias_bajo_minimo: bajoMinimoCount,
                referencias_agotadas: agotadasCount
            },
            chartData: chartItems,
            alerts: alertsList,
            recentMovements,
            consistency
        };
    }

    /**
     * Obtiene las OTs que tienen material reservado para una materia prima dada.
     */
    static async getMaterialReservedOTs(materiaPrimaId: number) {
        const reservations = await prisma.movimientoInventarioMP.findMany({
            where: {
                materia_prima_id: materiaPrimaId,
                tipo_movimiento: { in: ['RESERVA_OT', 'En proceso'] },
                ordenTrabajo: {
                    estado_ot: { in: ['Pendiente', 'En Progreso', 'Iniciada'] }
                }
            },
            include: {
                ordenTrabajo: {
                    include: { producto: true }
                }
            },
            orderBy: { fecha_hora: 'desc' }
        });

        return reservations.map(r => ({
            movimiento_id: r.id,
            orden_trabajo_id: r.orden_trabajo_id,
            numero_ot: r.ordenTrabajo?.numero_ot || r.referencia_id,
            estado_ot: r.ordenTrabajo?.estado_ot || 'En proceso',
            cantidad_reservada: Number(r.cantidad),
            fecha_reserva: r.fecha_hora,
            producto: r.ordenTrabajo?.producto?.nombre_producto || 'Sin producto asignado',
            cantidad_fabricar: r.ordenTrabajo?.cantidad_fabricar || 0
        }));
    }
}
