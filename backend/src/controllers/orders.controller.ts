
import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary } from '../utils/cloudinary';
import { InventoryService } from '../services/inventory.service';

export const createOrder = async (req: Request, res: Response) => {
    const {
        tipo_orden,
        producto_id,
            proyecto_especial_id,
        cantidad_fabricar,
        cliente,
        orden_compra_cliente,
        fecha_entrega_req,
        prioridad,
        descripcion_proyecto,
        materiales_proyecto,
        tareas_personalizadas,
        piezas_lamina,
        precio_venta,
        po_pdf_url,
        imagen_url,
        acabado,
        ancho_tira
    } = req.body;

    console.log('[createOrder] Called with:', { tipo_orden, producto_id, cantidad_fabricar });

    try {
        console.log('[createOrder] START', { tipo_orden, producto_id, cantidad_fabricar });
        // Normalize numeric fields coming from the frontend (may be strings)
        const prodIdNum = producto_id ? Number(producto_id) : null;
            const proyectoEspecialId = proyecto_especial_id ? Number(proyecto_especial_id) : null;
        const cantidadNum = cantidad_fabricar ? Number(cantidad_fabricar) : 0;

            if (proyectoEspecialId !== null && (!Number.isInteger(proyectoEspecialId) || tipo_orden !== 'PROYECTO_ESPECIAL')) {
                throw new Error('El vínculo a proyecto especial solo aplica a OTs de proyecto especial');
            }
        if (tipo_orden !== 'PROYECTO_ESPECIAL') {
            if (!prodIdNum) throw new Error('Producto requerido para orden de producción en serie');
            if (!cantidadNum || isNaN(cantidadNum) || cantidadNum <= 0) {
                throw new Error('Cantidad a fabricar inválida');
            }
        }
        // Validar unicidad de orden de compra para el mismo cliente (si aplica)
        if (orden_compra_cliente && cliente) {
            const existeOC = await prisma.ordenTrabajo.findFirst({
                where: {
                    orden_compra_cliente,
                    cliente
                }
            });
            if (existeOC) throw new Error('Ya existe una orden con ese número de orden de compra para este cliente');
        }

        // Validar stock de materiales para producción en serie
            if (tipo_orden !== 'PROYECTO_ESPECIAL' && prodIdNum) {
                const producto = await prisma.producto.findUnique({
                    where: { id: prodIdNum },
                    include: { listaMateriales: { include: { materiaPrima: true } } }
                });
                if (!producto) throw new Error('Producto no encontrado');
                
                for (const item of producto.listaMateriales) {
                    let cantidadAValidar = Number(item.cantidad_requerida) * cantidadNum;
                    
                    // Si el producto tiene piezas_lamina_4x8 definido, calcular láminas
                    if (producto.piezas_lamina_4x8) {
                        const piezasPorLamina = Number(producto.piezas_lamina_4x8);
                        if (piezasPorLamina > 0) {
                            cantidadAValidar = Math.ceil(cantidadNum / piezasPorLamina);
                        }
                    }
                    
                    const stockDisponible = Number(item.materiaPrima.stock_actual) - Number(item.materiaPrima.stock_reservado);
                    if (stockDisponible < cantidadAValidar) {
                        throw new Error(`Stock insuficiente para ${item.materiaPrima.nombre_mp}: requiere ${cantidadAValidar}, disponible ${stockDisponible}`);
                    }
                }
            }

            const result = await prisma.$transaction(async (tx) => {
            // 2. Generar número de OT único usando timestamp + random
                    if (proyectoEspecialId !== null) {
                        const proyecto = await tx.proyectoEspecial.findUnique({ where: { id: proyectoEspecialId }, select: { id: true } });
                        if (!proyecto) throw new Error('Proyecto especial no encontrado');
                    }
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 99);
            const numero_ot = `OT-${timestamp}-${random}`;

            // 3. Crear orden base
            const newOrder = await tx.ordenTrabajo.create({
                data: {
                    numero_ot,
                    tipo_orden: tipo_orden || 'PRODUCCION_SERIE',
                    producto_id: tipo_orden === 'PROYECTO_ESPECIAL' ? null : prodIdNum,
                        proyecto_especial_id: proyectoEspecialId,
                    cantidad_pedido: cantidadNum || 0,
                    cantidad_fabricar: cantidadNum || 0,
                    cliente,
                    orden_compra_cliente,
                    fecha_entrega_req: fecha_entrega_req ? new Date(fecha_entrega_req) : null,
                    prioridad: prioridad || 'ESTANDAR',
                    descripcion_proyecto: tipo_orden === 'PROYECTO_ESPECIAL' ? descripcion_proyecto : null,
                    estado_ot: 'Pendiente',
                    // Manual or inherited fields
                    imagen_url: imagen_url || null,
                    acabado: acabado || null,
                    ancho_tira: ancho_tira ? Number(ancho_tira) : null,
                    piezas_lamina: piezas_lamina || null,
                    precio_venta: precio_venta ? Number(precio_venta) : 0,
                    po_pdf_url: po_pdf_url || null
                }
            });

            // 4. Lógica para PRODUCCIÓN EN SERIE
            if (tipo_orden !== 'PROYECTO_ESPECIAL' && prodIdNum) {
                // a) Validar existencia de producto y stock de materiales (a implementar)
                const producto = await tx.producto.findUnique({
                    where: { id: prodIdNum },
                    include: { 
                        rutas: {
                            orderBy: { no_operacion: 'asc' }
                        }, 
                        listaMateriales: { include: { materiaPrima: true } } 
                    }
                });
                if (!producto) throw new Error("Producto no encontrado");
                
                // Inherit fields from product if not manually provided
                await tx.ordenTrabajo.update({
                    where: { id: newOrder.id },
                    data: {
                        acabado: newOrder.acabado || producto.acabado,
                        ancho_tira: newOrder.ancho_tira || producto.ancho_tira,
                        piezas_lamina: newOrder.piezas_lamina || producto.piezas_lamina_4x8, // Defaulting to 4x8 for now or could be dynamic
                        imagen_url: newOrder.imagen_url || producto.imagen_url,
                        precio_venta: precio_venta ? Number(precio_venta) : producto.precio_venta
                    }
                });

                // b) Crear todas las tareas de la ruta del producto
                if (producto.rutas.length > 0) {
                    await tx.tareaProduccion.createMany({
                data: producto.rutas.map(ruta => ({
                    orden_trabajo_id: newOrder.id,
                    ruta_fabricacion_id: ruta.id,
                    secuencia_ot: ruta.no_operacion,
                    estado_tarea: 'Pendiente'
                }))
                    });
                }

                // c) Reservar materiales mediante InventoryService
                await InventoryService.reserveMaterialsForOrder(
                    tx,
                    newOrder.id,
                    (req as any).user?.nombre || cliente || 'Sistema'
                );
            }

            // 5. Lógica para PROYECTOS ESPECIALES
            if (tipo_orden === 'PROYECTO_ESPECIAL') {
                // a) Crear materiales del proyecto
                if (materiales_proyecto && materiales_proyecto.length > 0) {
                    await tx.materialProyecto.createMany({
                        data: materiales_proyecto.map((m: any) => ({
                            orden_trabajo_id: newOrder.id,
                            cantidad: m.cantidad,
                            unidad: m.unidad,
                            descripcion: m.descripcion,
                            especificaciones: m.especificaciones || null,
                            ancho_tira: m.ancho_tira || null,
                            observaciones: m.observaciones || null
                        }))
                    });
                }
                // b) Crear tareas desde OperacionCatalog
                const tempProduct = await tx.producto.create({
                    data: {
                        sku_producto: `PROJ-${numero_ot}`,
                        nombre_producto: descripcion_proyecto || `Proyecto ${numero_ot}`,
                        descripcion: descripcion_proyecto || undefined
                    }
                });
                const operaciones = await tx.operacionCatalog.findMany({ orderBy: { orden: 'asc' } });
                for (let i = 0; i < operaciones.length; i++) {
                    const op = operaciones[i];
                    const ruta = await tx.rutaFabricacion.create({
                        data: {
                            producto_id: tempProduct.id,
                            no_operacion: (i + 1) * 10,
                            nombre_operacion: op.nombre_operacion,
                            centro_trabajo: op.centro_trabajo || 'General'
                        }
                    });
                    await tx.tareaProduccion.create({
                        data: {
                            orden_trabajo_id: newOrder.id,
                            ruta_fabricacion_id: ruta.id,
                            estado_tarea: 'Pendiente'
                        }
                    });
                }
                // TODO: Reservar materiales y registrar movimiento si aplica
            }

            // 6. Registrar auditoría básica
            // TODO: Extender a tabla de auditoría en el futuro
            console.log(`[AUDITORÍA] Orden creada: OT-${numero_ot} por ${cliente || 'sistema'}`);

            return newOrder;
        });

            res.json(result);
    } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : 'Error creating order';
        res.status(500).json({ error: msg });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    try {
        const clientId = Number(req.query.clientId);
        let where = undefined;

        if (req.query.clientId !== undefined) {
            if (!Number.isInteger(clientId) || clientId <= 0) {
                return res.status(400).json({ error: 'clientId no es vÃ¡lido' });
            }

            const client = await prisma.cliente.findUnique({
                where: { id: clientId },
                select: { nombre: true }
            });

            if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

            // Incluye Ã³rdenes modernas asociadas por producto y las histÃ³ricas
            // que solo guardaron el nombre del cliente.
            where = {
                OR: [
                    { producto: { is: { cliente_id: clientId } } },
                    { cliente: client.nombre }
                ]
            };
        }

        const orders = await prisma.ordenTrabajo.findMany({
            where,
            include: {
                producto: {
                    include: { cliente: true }
                },
                    proyectoEspecial: { select: { id: true, codigo: true, descripcion_tecnica: true } },
                tareas: {
                    include: { rutaFabricacion: true }
                },
                inspecciones: { select: { id: true, codigo: true, tipo: true, estado_resultado: true, fecha_inspeccion: true } },
                noConformidades: { select: { id: true, codigo: true, estado: true, tipo_defecto: true } }
            },
            orderBy: { id: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log('Fetching order details for ID:', id);
    try {
        const order = await prisma.ordenTrabajo.findUnique({
            where: { id: Number(id) },
            include: {
                producto: {
                    include: {
                        cliente: true,
                        listaMateriales: { include: { materiaPrima: true } },
                        rutas: {
                            where: { activo: true },
                            orderBy: { no_operacion: 'asc' }
                        }
                    }
                },
                tareas: {
                    orderBy: {
                        rutaFabricacion: {
                            no_operacion: 'asc'
                        }
                    },
                    include: {
                        rutaFabricacion: true,
                        personal: true,
                        maquina: true
                    }
                },
                materialesProyecto: true,
                    proyectoEspecial: { select: { id: true, codigo: true, descripcion_tecnica: true } },
                inspecciones: { include: { inspector: true, mediciones: true } },
                noConformidades: { include: { responsable: true, accionesCorrectivas: true } }
            }
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching order details' });
    }
};

export const updateOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        producto_id, 
        cantidad_fabricar, 
        cliente, 
        fecha_entrega_req, 
        estado_ot,
        acabado,
        ancho_tira,
        piezas_lamina,
        precio_venta
    } = req.body;
    const userName = (req as any).user?.nombre || 'Supervisor';

    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.ordenTrabajo.findUnique({
                where: { id: Number(id) }
            });
            if (!currentOrder) throw new Error('Orden no encontrada');

            // Si el estado cambia a Completada o Cerrada:
            if (estado_ot && (estado_ot === 'Completada' || estado_ot === 'Cerrada') && currentOrder.estado_ot !== estado_ot) {
                await InventoryService.consumeMaterialsForOrder(tx, Number(id), {
                    usuarioNombre: userName,
                    observacion: `Consumo por actualización a ${estado_ot}`,
                    targetStatus: estado_ot
                });
            } else if (estado_ot === 'Cancelada' && currentOrder.estado_ot !== 'Cancelada') {
                await InventoryService.releaseOrderReservations(tx, Number(id), userName, 'Cancelación de OT en edición');
            }

            const order = await tx.ordenTrabajo.update({
                where: { id: Number(id) },
                data: {
                    producto_id: producto_id ? Number(producto_id) : undefined,
                    cantidad_fabricar: cantidad_fabricar ? Number(cantidad_fabricar) : undefined,
                    cliente,
                    fecha_entrega_req: fecha_entrega_req ? new Date(fecha_entrega_req) : undefined,
                    estado_ot: estado_ot || undefined,
                    acabado,
                    ancho_tira: ancho_tira ? Number(ancho_tira) : undefined,
                    piezas_lamina,
                    precio_venta: precio_venta !== undefined ? Number(precio_venta) : undefined
                }
            });
            return order;
        });

        res.json(result);
    } catch (error: any) {
        console.error('updateOrder error:', error);
        res.status(500).json({ error: error.message || 'Error updating order' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado_ot } = req.body;
    const userName = (req as any).user?.nombre || 'Supervisor';

    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.ordenTrabajo.findUnique({
                where: { id: Number(id) },
                include: { tareas: true }
            });

            if (!currentOrder) throw new Error('Orden no encontrada');

            if (currentOrder.estado_calidad === 'Retenida' && (estado_ot === 'Completada' || estado_ot === 'Despachada' || estado_ot === 'Entregada')) {
                throw new Error('Bloqueo de Calidad: No se puede despachar ni completar una OT retenida. Requiere autorización o liberación previa de Calidad.');
            }

            if (estado_ot === 'Cancelada' && currentOrder.estado_ot !== 'Cancelada') {
                if (currentOrder.estado_ot === 'Completada' || currentOrder.materiales_consumidos) {
                    throw new Error('Una OT completada o con materiales consumidos no puede cancelarse directamente. Registre un ajuste o reversión.');
                }
                await InventoryService.releaseOrderReservations(tx, currentOrder.id, userName, 'Cancelación de OT');
            }

            if ((estado_ot === 'Completada' || estado_ot === 'Cerrada') && currentOrder.estado_ot !== estado_ot) {
                await InventoryService.consumeMaterialsForOrder(tx, currentOrder.id, {
                    usuarioNombre: userName,
                    observacion: `Consumo por cierre/completado manual de OT`,
                    targetStatus: estado_ot
                });
            }

            const order = await tx.ordenTrabajo.update({
                where: { id: Number(id) },
                data: {
                    estado_ot,
                    fecha_fin_real: (estado_ot === 'Completada' || estado_ot === 'Cerrada') ? new Date() : currentOrder.fecha_fin_real
                }
            });

            if ((estado_ot === 'Completada' || estado_ot === 'Cerrada') && currentOrder.estado_ot !== 'Completada') {
                // Update Machine statistics automatically
                const totalWorkingHrs = (currentOrder.duracion_total_real_min || 0) / 60;
                const totalStopMin = currentOrder.tareas.reduce((sum, t) => sum + (t.tiempo_parada_min || 0), 0);
                const totalStopHrs = totalStopMin / 60;

                const machineIds = Array.from(new Set(currentOrder.tareas.map(t => t.maquina_id).filter(Boolean))) as number[];
                if (currentOrder.maquina_id && !machineIds.includes(currentOrder.maquina_id)) {
                    machineIds.push(currentOrder.maquina_id);
                }

                for (const mId of machineIds) {
                    await tx.maquina.update({
                        where: { id: mId },
                        data: {
                            horas_acumuladas: { increment: totalWorkingHrs },
                            tiempo_detenido_hrs: { increment: totalStopHrs },
                            total_ordenes: { increment: 1 }
                        }
                    });
                }
            }

            return order;
        });

        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error updating order status', details: error.message });
    }
};


export const duplicateOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const original = await prisma.ordenTrabajo.findUnique({
            where: { id: Number(id) },
            include: { producto: { include: { rutas: { where: { activo: true }, orderBy: { no_operacion: 'asc' } }, listaMateriales: { include: { materiaPrima: true } } } } }
        });
        if (!original) return res.status(404).json({ error: 'Order not found' });
        if (!original.producto) return res.status(400).json({ error: 'Solo se pueden duplicar OTs de producción con producto asociado' });

        const newOrder = await prisma.$transaction(async (tx) => {
            const requiredFor = (item: typeof original.producto.listaMateriales[number]) => {
                if (original.producto!.piezas_lamina_4x8) {
                    const piecesPerSheet = Number(original.producto!.piezas_lamina_4x8);
                    if (piecesPerSheet > 0) return Math.ceil(original.cantidad_fabricar / piecesPerSheet);
                }
                return Number(item.cantidad_requerida) * original.cantidad_fabricar;
            };
            for (const item of original.producto!.listaMateriales) {
                const required = requiredFor(item);
                const available = Number(item.materiaPrima.stock_actual) - Number(item.materiaPrima.stock_reservado);
                if (available < required) throw new Error(`Stock insuficiente para duplicar: ${item.materiaPrima.nombre_mp}`);
            }

            const numero_ot = `OT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const created = await tx.ordenTrabajo.create({
            data: {
                numero_ot,
                producto_id: original.producto_id,
                cantidad_pedido: original.cantidad_pedido,
                cantidad_fabricar: original.cantidad_fabricar,
                cliente: original.cliente,
                orden_compra_cliente: original.orden_compra_cliente,
                fecha_entrega_req: original.fecha_entrega_req,
                estado_ot: 'Pendiente',
                acabado: original.acabado,
                ancho_tira: original.ancho_tira,
                piezas_lamina: original.piezas_lamina,
                imagen_url: original.imagen_url,
                precio_venta: original.precio_venta
            }
        });

            await tx.tareaProduccion.createMany({
                data: original.producto.rutas.map(ruta => ({
                    orden_trabajo_id: created.id,
                    ruta_fabricacion_id: ruta.id,
                    secuencia_ot: ruta.no_operacion,
                    estado_tarea: 'Pendiente'
                }))
            });
            await InventoryService.reserveMaterialsForOrder(
                tx,
                created.id,
                (req as any).user?.nombre || original.cliente || 'Sistema'
            );
            return created;
        });

        res.json(newOrder);
    } catch (error) {
        res.status(500).json({ error: 'Error duplicating order' });
    }
};

export const deleteOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const orderId = Number(id);

            // 1. Find the order to get its unique number
            const order = await tx.ordenTrabajo.findUnique({
                where: { id: orderId },
            });

            if (!order) {
                throw new Error('Order not found');
            }

            // 2. Revert stock reservations
            if (order.estado_ot === 'Completada' || order.materiales_consumidos) {
                throw new Error('No se puede eliminar una OT completada o con materiales consumidos; conserve su trazabilidad histórica.');
            }
            if (order.estado_ot !== 'Cancelada') {
                await InventoryService.releaseOrderReservations(
                    tx,
                    orderId,
                    (req as any).user?.nombre || 'Administrador',
                    'Eliminación de OT'
                );
            }

            // 3. Delete related records
            await tx.movimientoInventarioMP.deleteMany({
                where: { orden_trabajo_id: orderId },
            });
            await tx.tareaProduccion.deleteMany({
                where: { orden_trabajo_id: orderId },
            });
            await tx.materialProyecto.deleteMany({
                where: { orden_trabajo_id: orderId },
            });

            // 4. Finally, delete the order itself
            await tx.ordenTrabajo.delete({
                where: { id: orderId },
            });

            return { message: 'Order and all related data deleted successfully' };
        });

        res.json(result);
    } catch (error) {
        console.error('Error deleting order:', error);
        const msg = error instanceof Error ? error.message : 'Could not delete order';
        res.status(500).json({ error: msg });
    }
};

export const addOperationToOrder = async (req: Request, res: Response) => {
    const { id } = req.params; // order id
    const { operacionId } = req.body;
    try {
        const order = await prisma.ordenTrabajo.findUnique({ where: { id: Number(id) } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Determine product to attach ruta to. For project orders we created a temp product with sku PROJ-<numero_ot>
        let productoId = order.producto_id || null;
        if (!productoId) {
            const tempSku = `PROJ-${order.numero_ot}`;
            const temp = await prisma.producto.findFirst({ where: { sku_producto: tempSku } });
            if (temp) productoId = temp.id;
        }

        if (!productoId) return res.status(400).json({ error: 'No product context found to add operation' });

        const oper = await prisma.operacionCatalog.findUnique({ where: { id: Number(operacionId) } });
        if (!oper) return res.status(404).json({ error: 'Operation not found' });

        // create rutaFabricacion and tarea
        const ruta = await prisma.rutaFabricacion.create({ data: {
            producto_id: productoId,
            no_operacion: 10,
            nombre_operacion: oper.nombre_operacion,
            centro_trabajo: oper.centro_trabajo || 'General'
        }});

        const tarea = await prisma.tareaProduccion.create({ data: {
            orden_trabajo_id: order.id,
            ruta_fabricacion_id: ruta.id,
            estado_tarea: 'Pendiente'
        }});

        res.json({ tarea });
    } catch (error) {
        console.error('Error adding operation to order', error);
        res.status(500).json({ error: 'Error adding operation' });
    }
}

export const uploadOrderImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await uploadToCloudinary(file.buffer, 'orders');
        const imageUrl = result.secure_url;

        const order = await prisma.ordenTrabajo.update({
            where: { id: Number(id) },
            data: { imagen_url: imageUrl }
        });

        res.json(order);
    } catch (error) {
        console.error('uploadOrderImage error:', error);
        res.status(500).json({ error: 'Error uploading image to local storage' });
    }
};
