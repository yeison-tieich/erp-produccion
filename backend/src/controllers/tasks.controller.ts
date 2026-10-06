
import { Request, Response } from 'express';
import prisma from '../prisma';
import { calculateWorkingMinutes } from '../utils/time';
import { InventoryService } from '../services/inventory.service';

export const getMyTasks = async (req: Request, res: Response) => {
    try {
        const { personal_id, estado, prioridad, fecha } = req.query;
        const where: any = {};

        if (personal_id) {
            where.personal_id = Number(personal_id);
        }
        if (estado) {
            where.estado_tarea = String(estado);
        }
        if (prioridad) {
            where.prioridad = String(prioridad);
        }
        if (fecha) {
            const searchDate = new Date(String(fecha));
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);

            where.fecha = {
                gte: searchDate,
                lt: nextDay
            };
        }

        const tasks = await prisma.tareaProduccion.findMany({
            where,
            include: {
                ordenTrabajo: { include: { producto: true } },
                rutaFabricacion: true,
                personal: true,
                maquina: true
            },
            orderBy: { id: 'desc' }
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
};

export const updateTaskWorkerStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado_tarea, comentarios } = req.body;
    try {
        const data: any = {};
        if (estado_tarea) data.estado_tarea = estado_tarea;
        if (comentarios !== undefined) data.comentarios = comentarios;
        if (estado_tarea === 'Iniciada' || estado_tarea === 'En Progreso') {
            data.fecha_hora_inicio = new Date();
        }
        if (estado_tarea === 'Finalizada' || estado_tarea === 'Completada') {
            data.fecha_hora_fin = new Date();
        }

        const task = await prisma.tareaProduccion.update({
            where: { id: Number(id) },
            data,
            include: {
                ordenTrabajo: true,
                personal: true,
                maquina: true
            }
        });
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar estado de tarea por operario', details: error.message });
    }
};

export const assignTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { personal_id, maquina_id, prioridad, fecha, tiempo_estimado_min, comentarios } = req.body;
    try {
        const data: any = {};
        if (personal_id !== undefined) data.personal_id = personal_id ? Number(personal_id) : null;
        if (maquina_id !== undefined) data.maquina_id = maquina_id ? Number(maquina_id) : null;
        if (prioridad) data.prioridad = prioridad;
        if (fecha) data.fecha = new Date(fecha);
        if (tiempo_estimado_min !== undefined) data.tiempo_estimado_min = Number(tiempo_estimado_min);
        if (comentarios !== undefined) data.comentarios = comentarios;

        const task = await prisma.tareaProduccion.update({
            where: { id: Number(id) },
            data,
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
            const task = await tx.tareaProduccion.update({
                where: { id: Number(id) },
                data: {
                    estado_tarea: 'Iniciada',
                    fecha_hora_inicio: new Date()
                },
                include: { ordenTrabajo: true }
            });

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
    const { cantidad_buena, cantidad_mala, tiempo_parada_min, duracion_real_min, comentarios } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const originalTask = await tx.tareaProduccion.findUnique({
                where: { id: Number(id) },
            });

            if (!originalTask) {
                throw new Error("Task not found");
            }
            
            const fecha_hora_fin = new Date();
            let duration = duracion_real_min !== undefined ? Number(duracion_real_min) : 0;
            
            if (duracion_real_min === undefined && originalTask.fecha_hora_inicio) {
                duration = calculateWorkingMinutes(originalTask.fecha_hora_inicio, fecha_hora_fin);
            }

            let costo_real = 0;
            if (duration > 0 && originalTask.ruta_fabricacion_id) {
                const ruta = await tx.rutaFabricacion.findUnique({
                    where: { id: originalTask.ruta_fabricacion_id }
                });

                if (ruta) {
                    const catalogOp = await tx.operacionCatalog.findFirst({
                        where: { nombre_operacion: ruta.nombre_operacion }
                    });
                    
                    if (catalogOp && catalogOp.costo_hora) {
                        const calculatedCost = (duration / 60) * Number(catalogOp.costo_hora);
                        costo_real = Number(calculatedCost.toFixed(2));
                    }
                }
            }

            const task = await tx.tareaProduccion.update({
                where: { id: Number(id) },
                data: {
                    estado_tarea: 'Finalizada',
                    fecha_hora_fin: new Date(),
                    cantidad_buena: cantidad_buena !== undefined ? Number(cantidad_buena) : originalTask.cantidad_buena,
                    cantidad_mala: cantidad_mala !== undefined ? Number(cantidad_mala) : originalTask.cantidad_mala,
                    tiempo_parada_min: tiempo_parada_min !== undefined ? Number(tiempo_parada_min) : originalTask.tiempo_parada_min,
                    duracion_real_min: duration,
                    tiempo_real_min: duration,
                    costo_real: costo_real,
                    comentarios: comentarios !== undefined ? comentarios : originalTask.comentarios
                },
                include: { ordenTrabajo: { include: { producto: { include: { listaMateriales: true } } } } }
            });

            const allTasksInOrder = await tx.tareaProduccion.findMany({
                where: { orden_trabajo_id: task.orden_trabajo_id },
                include: { rutaFabricacion: true }
            });

            const totalCost = allTasksInOrder.reduce((acc, t) => acc + Number(t.costo_real || 0), 0);
            const totalDuration = allTasksInOrder.reduce((acc, t) => acc + (t.duracion_real_min || 0), 0);

            const allDone = allTasksInOrder.every(t => t.estado_tarea === 'Finalizada' || t.estado_tarea === 'Completada');

            const completedOrder = await tx.ordenTrabajo.update({
                where: { id: task.orden_trabajo_id },
                data: {
                    costo_total_real: totalCost,
                    duracion_total_real_min: totalDuration,
                    estado_ot: allDone ? 'Completada' : 'En Progreso',
                    fecha_fin_real: allDone ? new Date() : null
                }
            });

            if (allDone && task.ordenTrabajo.estado_ot !== 'Completada') {
                // Consume materials via idempotent service (no-op if already consumed)
                await InventoryService.consumeMaterialsForOrder(tx, task.orden_trabajo_id, {
                    usuarioNombre: (req as any).user?.nombre || 'Operario',
                    observacion: `Consumo automático al finalizar última tarea de OT ${task.ordenTrabajo.numero_ot}`,
                    targetStatus: 'Completada'
                });

                // Update finished product stock
                const lastTask = [...allTasksInOrder].sort((a, b) => (b.secuencia_ot ?? b.rutaFabricacion?.no_operacion ?? b.id) - (a.secuencia_ot ?? a.rutaFabricacion?.no_operacion ?? a.id))[0];
                const cantidadTerminada = Number(lastTask?.cantidad_buena || 0);
                if (completedOrder.producto_id && cantidadTerminada > 0) {
                    await tx.producto.update({ where: { id: completedOrder.producto_id }, data: { stock_actual: { increment: cantidadTerminada } } });
                    await tx.movimientoProducto.create({ data: { producto_id: completedOrder.producto_id, tipo_movimiento: 'PRODUCCION_OT', cantidad: cantidadTerminada, referencia: completedOrder.numero_ot } });
                }
            }

            return task;
        }, {
            maxWait: 10000,
            timeout: 30000
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
    const { orden_trabajo_id, ruta_fabricacion_id, personal_id, maquina_id, prioridad, fecha, tiempo_estimado_min, comentarios } = req.body;
    try {
        const task = await prisma.tareaProduccion.create({
            data: {
                orden_trabajo_id: Number(orden_trabajo_id),
                ruta_fabricacion_id: ruta_fabricacion_id ? Number(ruta_fabricacion_id) : null,
                secuencia_ot: req.body.secuencia_ot !== undefined ? Number(req.body.secuencia_ot) : null,
                personal_id: personal_id ? Number(personal_id) : null,
                maquina_id: maquina_id ? Number(maquina_id) : null,
                prioridad: prioridad || 'MEDIA',
                fecha: fecha ? new Date(fecha) : new Date(),
                tiempo_estimado_min: tiempo_estimado_min ? Number(tiempo_estimado_min) : 0,
                comentarios: comentarios || '',
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

export const updateTaskDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        fecha_hora_inicio, 
        fecha_hora_fin, 
        costo_real, 
        duracion_real_min,
        cantidad_buena,
        cantidad_mala,
        prioridad,
        fecha,
        tiempo_estimado_min,
        comentarios,
        estado_tarea
    } = req.body;
    try {
        const updateData: any = {};
        if (prioridad) updateData.prioridad = prioridad;
        if (fecha) updateData.fecha = new Date(fecha);
        if (tiempo_estimado_min !== undefined) updateData.tiempo_estimado_min = Number(tiempo_estimado_min);
        if (comentarios !== undefined) updateData.comentarios = comentarios;
        if (estado_tarea) updateData.estado_tarea = estado_tarea;

        if (fecha_hora_inicio) updateData.fecha_hora_inicio = new Date(fecha_hora_inicio);
        if (fecha_hora_fin) updateData.fecha_hora_fin = new Date(fecha_hora_fin);
        if (costo_real !== undefined) updateData.costo_real = Number(costo_real);
        if (duracion_real_min !== undefined) updateData.duracion_real_min = Number(duracion_real_min);
        if (cantidad_buena !== undefined) updateData.cantidad_buena = Number(cantidad_buena);
        if (cantidad_mala !== undefined) updateData.cantidad_mala = Number(cantidad_mala);

        const updatedTask = await prisma.tareaProduccion.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                rutaFabricacion: true,
                personal: true,
                maquina: true,
                ordenTrabajo: true
            }
        });

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando detalles de tarea' });
    }
};

export const reorderTasks = async (req: Request, res: Response) => {
    const { orden_trabajo_id, taskIds } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            for (let i = 0; i < taskIds.length; i++) {
                const task = await tx.tareaProduccion.findUnique({ 
                    where: { id: Number(taskIds[i]) },
                    include: { rutaFabricacion: true }
                });

                if (task && task.orden_trabajo_id === Number(orden_trabajo_id)) {
                    await tx.tareaProduccion.update({
                        where: { id: task.id },
                        data: { secuencia_ot: (i + 1) * 10 }
                    });
                }
            }

            const tasks = await tx.tareaProduccion.findMany({
                where: { orden_trabajo_id: Number(orden_trabajo_id) },
                include: { rutaFabricacion: true, ordenTrabajo: true }
            });

            return tasks;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error reordenando tareas' });
    }
};

