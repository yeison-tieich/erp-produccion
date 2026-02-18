
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

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Generar número de OT de 4 dígitos secuencial
            const lastOrder = await tx.ordenTrabajo.findFirst({
                orderBy: { id: 'desc' }
            });
            const nextNumber = lastOrder ? (parseInt(lastOrder.numero_ot) || 1000) + 1 : 1001;
            const numero_ot = nextNumber.toString().padStart(4, '0');

            // Crear orden base
            const newOrder = await tx.ordenTrabajo.create({
                data: {
                    numero_ot,
                    tipo_orden: tipo_orden || 'PRODUCCION_SERIE',
                    producto_id: tipo_orden === 'PROYECTO_ESPECIAL' ? null : producto_id,
                    cantidad_pedido: cantidad_fabricar || 0,
                    cantidad_fabricar: cantidad_fabricar || 0,
                    cliente,
                    orden_compra_cliente,
                    fecha_entrega_req: fecha_entrega_req ? new Date(fecha_entrega_req) : null,
                    prioridad: prioridad || 'ESTANDAR',
                    descripcion_proyecto: tipo_orden === 'PROYECTO_ESPECIAL' ? descripcion_proyecto : null,
                    estado_ot: 'Pendiente'
                }
            });

            // FLUJO PARA PRODUCCIÓN EN SERIE
            if (tipo_orden !== 'PROYECTO_ESPECIAL' && producto_id) {
                const producto = await tx.producto.findUnique({
                    where: { id: producto_id },
                    include: { rutas: true, listaMateriales: true }
                });

                if (!producto) throw new Error("Producto no encontrado");

                // Crear tareas desde la ruta del producto
                if (producto.rutas.length > 0) {
                    await tx.tareaProduccion.createMany({
                        data: producto.rutas.map(ruta => ({
                            orden_trabajo_id: newOrder.id,
                            ruta_fabricacion_id: ruta.id,
                            estado_tarea: 'Pendiente'
                        }))
                    });
                } else {
                    // If product has no defined routes, create a placeholder route and a single task so it appears in task lists
                    const placeholderRuta = await tx.rutaFabricacion.create({
                        data: {
                            producto_id: producto.id,
                            no_operacion: 10,
                            nombre_operacion: 'Operación por definir',
                            centro_trabajo: 'TBD'
                        }
                    });

                    await tx.tareaProduccion.create({
                        data: {
                            orden_trabajo_id: newOrder.id,
                            ruta_fabricacion_id: placeholderRuta.id,
                            estado_tarea: 'Pendiente'
                        }
                    });
                }

                // Reservar materiales
                for (const item of producto.listaMateriales) {
                    const totalReserva = Number(item.cantidad_requerida) * Number(cantidad_fabricar);
                    await tx.materiaPrima.update({
                        where: { id: item.materia_prima_id },
                        data: { stock_reservado: { increment: totalReserva } }
                    });
                }
            }

            // FLUJO PARA PROYECTOS ESPECIALES
            if (tipo_orden === 'PROYECTO_ESPECIAL') {
                // Crear materiales del proyecto si se proporcionaron
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
            }

            return newOrder;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating order' });
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
        await prisma.ordenTrabajo.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting order' });
    }
};
