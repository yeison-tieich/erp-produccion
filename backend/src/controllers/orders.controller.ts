
import { Request, Response } from 'express';
import prisma from '../prisma';

export const createOrder = async (req: Request, res: Response) => {
    const {
        tipo_orden,
        producto_id,
        cantidad_fabricar,
        cliente,
        orden_compra_cliente,
        fecha_entrega_req,
        prioridad,
        descripcion_proyecto,
        materiales_proyecto,
        tareas_personalizadas
    } = req.body;

    console.log('[createOrder] Called with:', { tipo_orden, producto_id, cantidad_fabricar });

    try {
        console.log('[createOrder] START', { tipo_orden, producto_id, cantidad_fabricar });
        // Normalize numeric fields coming from the frontend (may be strings)
        const prodIdNum = producto_id ? Number(producto_id) : null;
        const cantidadNum = cantidad_fabricar ? Number(cantidad_fabricar) : 0;

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
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 99);
            const numero_ot = `OT-${timestamp}-${random}`;

            // 3. Crear orden base
            const newOrder = await tx.ordenTrabajo.create({
                data: {
                    numero_ot,
                    tipo_orden: tipo_orden || 'PRODUCCION_SERIE',
                    producto_id: tipo_orden === 'PROYECTO_ESPECIAL' ? null : prodIdNum,
                    cantidad_pedido: cantidadNum || 0,
                    cantidad_fabricar: cantidadNum || 0,
                    cliente,
                    orden_compra_cliente,
                    fecha_entrega_req: fecha_entrega_req ? new Date(fecha_entrega_req) : null,
                    prioridad: prioridad || 'ESTANDAR',
                    descripcion_proyecto: tipo_orden === 'PROYECTO_ESPECIAL' ? descripcion_proyecto : null,
                    estado_ot: 'Pendiente'
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

                // b) Crear solo la primera tarea de la ruta del producto si existe
                if (producto.rutas.length > 0) {
                    const primeraRuta = producto.rutas[0];
                    await tx.tareaProduccion.create({
                        data: {
                            orden_trabajo_id: newOrder.id,
                            ruta_fabricacion_id: primeraRuta.id,
                            estado_tarea: 'Pendiente'
                        }
                    });
                }

                // c) Reservar materiales basándose en láminas si está definido piezas_lamina_4x8
                for (const item of producto.listaMateriales) {
                    let cantidadADescontar = Number(item.cantidad_requerida) * cantidadNum;
                    let unidadDescuento = 'Piezas generales';

                    // Si el producto tiene definido el número de piezas por lámina (piezas_lamina_4x8),
                    // calcular cuántas láminas se necesitan y descontar láminas en lugar de piezas
                    if (producto.piezas_lamina_4x8) {
                        const piezasPorLamina = Number(producto.piezas_lamina_4x8);
                        if (piezasPorLamina > 0) {
                            // Calcular láminas necesarias (redondear hacia arriba)
                            const laminasNecesarias = Math.ceil(cantidadNum / piezasPorLamina);
                            cantidadADescontar = laminasNecesarias;
                            unidadDescuento = `Láminas (${piezasPorLamina} piezas/lámina)`;
                        }
                    }

                    // Validar que haya stock disponible (después de contar las reservadas)
                    const stockDisponible = Number(item.materiaPrima.stock_actual) - Number(item.materiaPrima.stock_reservado);
                    if (stockDisponible < cantidadADescontar) {
                        throw new Error(
                            `Stock insuficiente para ${item.materiaPrima.nombre_mp}: ` +
                            `requiere ${cantidadADescontar} ${unidadDescuento}, disponible ${stockDisponible}`
                        );
                    }

                    await tx.materiaPrima.update({
                        where: { id: item.materia_prima_id },
                        data: { stock_reservado: { increment: cantidadADescontar } }
                    });
                    // Registrar movimiento de inventario tipo 'Reserva OT'
                    await tx.movimientoInventarioMP.create({
                        data: {
                            materia_prima_id: item.materia_prima_id,
                            tipo_movimiento: 'Reserva OT',
                            cantidad: cantidadADescontar,
                            referencia_id: `OT-${numero_ot}`
                        }
                    });
                }
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
        const orders = await prisma.ordenTrabajo.findMany({
            include: {
                producto: {
                    include: { cliente: true }
                },
                tareas: true
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
                        rutas: true
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
                materialesProyecto: true
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
    const { producto_id, cantidad_fabricar, cliente, fecha_entrega_req, estado_ot } = req.body;
    try {
        const order = await prisma.ordenTrabajo.update({
            where: { id: Number(id) },
            data: {
                producto_id,
                cantidad_fabricar,
                cliente,
                fecha_entrega_req: new Date(fecha_entrega_req),
                estado_ot
            }
        });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error updating order' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado_ot } = req.body;
    try {
        const order = await prisma.ordenTrabajo.update({
            where: { id: Number(id) },
            data: { estado_ot }
        });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error updating order status' });
    }
};

export const duplicateOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const original = await prisma.ordenTrabajo.findUnique({
            where: { id: Number(id) },
            include: { producto: { include: { rutas: true } } }
        });
        if (!original) return res.status(404).json({ error: 'Order not found' });

        const newOrder = await prisma.ordenTrabajo.create({
            data: {
                numero_ot: `OT-${Date.now()}`,
                producto_id: original.producto_id,
                cantidad_pedido: original.cantidad_pedido,
                cantidad_fabricar: original.cantidad_fabricar,
                cliente: original.cliente,
                orden_compra_cliente: original.orden_compra_cliente,
                fecha_entrega_req: original.fecha_entrega_req,
                estado_ot: 'Pendiente'
            }
        });

        if (original.producto?.rutas) {
            await prisma.tareaProduccion.createMany({
                data: original.producto.rutas.map(ruta => ({
                    orden_trabajo_id: newOrder.id,
                    ruta_fabricacion_id: ruta.id,
                    estado_tarea: 'Pendiente'
                }))
            });
        }

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

            // 2. Find and revert stock reservations
            const reservationMovements = await tx.movimientoInventarioMP.findMany({
                where: {
                    referencia_id: order.numero_ot,
                    tipo_movimiento: 'Reserva OT',
                },
            });

            for (const movement of reservationMovements) {
                await tx.materiaPrima.update({
                    where: { id: movement.materia_prima_id },
                    data: {
                        stock_reservado: {
                            decrement: movement.cantidad,
                        },
                    },
                });
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
