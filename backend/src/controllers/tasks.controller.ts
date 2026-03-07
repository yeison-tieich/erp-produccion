
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getMyTasks = async (req: Request, res: Response) => {
    // Note: Since we use Personal model instead of Usuario for operarios, 
    // we might need a way to link Usuario to Personal if we want strictly "My Tasks".
    // For now, let's return all tasks or filter if personal_id is provided.
    try {
        const tasks = await prisma.tareaProduccion.findMany({
            include: {
                ordenTrabajo: { include: { producto: true } },
                rutaFabricacion: true,
                personal: true,
                maquina: true
            }
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
};

export const assignTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { personal_id, maquina_id } = req.body;
    try {
        const task = await prisma.tareaProduccion.update({
            where: { id: Number(id) },
            data: {
                personal_id: personal_id ? Number(personal_id) : null,
                maquina_id: maquina_id ? Number(maquina_id) : null
            },
            include: {
                personal: true,
                maquina: true
            }
        });
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error assigning task' });
    }
};

export const startTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Task
            const task = await tx.tareaProduccion.update({
                where: { id: Number(id) },
                data: {
                    estado_tarea: 'En Progreso',
                    fecha_hora_inicio: new Date()
                },
                include: { ordenTrabajo: true }
            });

            // 2. If Order is 'Pendiente', move to 'En Progreso'
            if (task.ordenTrabajo.estado_ot === 'Pendiente') {
                await tx.ordenTrabajo.update({
                    where: { id: task.orden_trabajo_id },
                    data: {
                        estado_ot: 'En Progreso',
                        fecha_inicio_real: new Date()
                    }
                });
            }

            return task;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error starting task' });
    }
};

export const finishTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad_buena, cantidad_mala, tiempo_parada_min } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const originalTask = await tx.tareaProduccion.findUnique({
                where: { id: Number(id) },
            });

            if (!originalTask) {
                throw new Error("Task not found");
            }
            
            const fecha_hora_fin = new Date();
            let duration = 0;
            if (originalTask.fecha_hora_inicio) {
                duration = Math.round((fecha_hora_fin.getTime() - originalTask.fecha_hora_inicio.getTime()) / 60000); // in minutes
            }
            // 1. Update Task
            const task = await tx.tareaProduccion.update({
                where: { id: Number(id) },
                data: {
                    estado_tarea: 'Completada',
                    fecha_hora_fin: new Date(),
                    cantidad_buena: Number(cantidad_buena),
                    cantidad_mala: Number(cantidad_mala),
                    tiempo_parada_min: Number(tiempo_parada_min),
                    duracion_real_min: duration
                },
                include: { ordenTrabajo: { include: { producto: { include: { listaMateriales: true } } } } }
            });

            // 2. Recalculate OT Totals (Duration and Costs)
            const allTasksInOrder = await tx.tareaProduccion.findMany({
                where: { orden_trabajo_id: task.orden_trabajo_id }
            });

            const totalCost = allTasksInOrder.reduce((acc, t) => acc + Number(t.costo_real || 0), 0);
            const totalDuration = allTasksInOrder.reduce((acc, t) => acc + (t.duracion_real_min || 0), 0);

            const allDone = allTasksInOrder.every(t => t.estado_tarea === 'Completada');

            await tx.ordenTrabajo.update({
                where: { id: task.orden_trabajo_id },
                data: {
                    costo_total_real: totalCost,
                    duracion_total_real_min: totalDuration,
                    estado_ot: allDone ? 'Completada' : 'En Progreso',
                    fecha_fin_real: allDone ? new Date() : null
                }
            });

            if (allDone) {
                // 4. Consume Stock & Release Reservation
                const ot = await tx.ordenTrabajo.findUnique({
                    where: { id: task.orden_trabajo_id },
                    include: { producto: { include: { listaMateriales: true } } }
                });

                if (ot) {
                    const qty = ot.cantidad_fabricar;
                    for (const item of ot.producto.listaMateriales) {
                        const totalConsumed = Number(item.cantidad_requerida) * Number(qty);
                        await tx.materiaPrima.update({
                            where: { id: item.materia_prima_id },
                            data: {
                                stock_reservado: { decrement: totalConsumed },
                                stock_actual: { decrement: totalConsumed }
                            }
                        });
                        await tx.movimientoInventarioMP.create({
                            data: {
                                materia_prima_id: item.materia_prima_id,
                                tipo_movimiento: 'Consumo OT',
                                cantidad: -totalConsumed,
                                referencia_id: ot.numero_ot
                            }
                        });
                    }
                }
            }

            return task;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error finishing task' });
    }
};
export const deleteTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const task = await prisma.tareaProduccion.findUnique({ where: { id: Number(id) } });
        if (!task) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        await prisma.tareaProduccion.delete({ where: { id: Number(id) } });
        res.json({ message: 'Tarea eliminada' });
    } catch (error) {
        console.error('Error deleting task:', error);
        const msg = error instanceof Error ? error.message : 'Could not delete task';
        res.status(500).json({ error: msg });
    }
};

export const createTarea = async (req: Request, res: Response) => {
    const { orden_trabajo_id, ruta_fabricacion_id, personal_id, maquina_id } = req.body;
    try {
        const task = await prisma.tareaProduccion.create({
            data: {
                orden_trabajo_id: Number(orden_trabajo_id),
                ruta_fabricacion_id: Number(ruta_fabricacion_id),
                personal_id: personal_id ? Number(personal_id) : null,
                maquina_id: maquina_id ? Number(maquina_id) : null,
                estado_tarea: 'Pendiente'
            },
            include: {
                rutaFabricacion: true,
                personal: true,
                maquina: true
            }
        });
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando tarea' });
    }
};

// Actualizar detalles de una tarea (hora inicio/fin, costo, orden)
export const updateTaskDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        fecha_hora_inicio, 
        fecha_hora_fin, 
        costo_real, 
        duracion_real_min,
        cantidad_buena,
        cantidad_mala
    } = req.body;

    try {
        const updateData: any = {};
        if (fecha_hora_inicio) updateData.fecha_hora_inicio = new Date(fecha_hora_inicio);
        if (fecha_hora_fin) updateData.fecha_hora_fin = new Date(fecha_hora_fin);
        if (costo_real !== undefined) updateData.costo_real = Number(costo_real);
        if (duracion_real_min !== undefined) updateData.duracion_real_min = Number(duracion_real_min);
        if (cantidad_buena !== undefined) updateData.cantidad_buena = Number(cantidad_buena);
        if (cantidad_mala !== undefined) updateData.cantidad_mala = Number(cantidad_mala);

        const task = await prisma.tareaProduccion.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                rutaFabricacion: true,
                personal: true,
                maquina: true,
                ordenTrabajo: true
            }
        });

        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando detalles de tarea' });
    }
};

// Reordenar tareas de una orden
export const reorderTasks = async (req: Request, res: Response) => {
    const { orden_trabajo_id, taskIds } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            for (let i = 0; i < taskIds.length; i++) {
                // Update no_operacion en la ruta para reflejar el nuevo orden
                const task = await tx.tareaProduccion.findUnique({ 
                    where: { id: Number(taskIds[i]) },
                    include: { rutaFabricacion: true }
                });

                if (task) {
                    await tx.rutaFabricacion.update({
                        where: { id: task.ruta_fabricacion_id },
                        data: { no_operacion: (i + 1) * 10 }
                    });
                }
            }

            const tasks = await tx.tareaProduccion.findMany({
                where: { orden_trabajo_id: Number(orden_trabajo_id) },
                include: { rutaFabricacion: true, ordenTrabajo: true },
                orderBy: { rutaFabricacion: { no_operacion: 'asc' } }
            });

            return tasks;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error reordenando tareas' });
    }
};
