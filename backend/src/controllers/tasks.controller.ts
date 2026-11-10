
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

            // Ingreso atómico e idempotente de producto terminado (exclusivo para Verificación y Empaque)
            const buenaAprobada = cantidad_buena !== undefined ? Number(cantidad_buena) : Number(task.cantidad_buena || 0);
            await InventoryService.registerFinishedProductEntry(tx, {
                ordenTrabajoId: task.orden_trabajo_id,
                tareaId: task.id,
                cantidadBuenaAprobada: buenaAprobada,
                usuarioNombre: (req as any).user?.nombre || 'Operario',
                observacion: `Ingreso por finalización de tarea (OT ${task.ordenTrabajo.numero_ot})`
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
        estado_tarea,
        usuario_ultima_edicion
    } = req.body;
    try {
        const currentTask = await prisma.tareaProduccion.findUnique({
            where: { id: Number(id) },
            include: { ordenTrabajo: true }
        });

        if (!currentTask) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        const nextStart = fecha_hora_inicio !== undefined ? (fecha_hora_inicio ? new Date(fecha_hora_inicio) : null) : currentTask.fecha_hora_inicio;
        const nextEnd = fecha_hora_fin !== undefined ? (fecha_hora_fin ? new Date(fecha_hora_fin) : null) : currentTask.fecha_hora_fin;

        if (nextStart && nextEnd && nextEnd < nextStart) {
            return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
        }

        const updateData: any = {};
        if (prioridad) updateData.prioridad = prioridad;
        if (fecha) updateData.fecha = new Date(fecha);
        if (tiempo_estimado_min !== undefined) updateData.tiempo_estimado_min = Number(tiempo_estimado_min);
        if (comentarios !== undefined || usuario_ultima_edicion !== undefined) {
            const normalizedComment = comentarios !== undefined ? String(comentarios).trim() : '';
            const timestamp = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
            const editor = usuario_ultima_edicion ? String(usuario_ultima_edicion).trim() || 'Sistema' : 'Sistema';
            const auditSuffix = `\n[Última edición: ${editor} • ${timestamp}]`;
            updateData.comentarios = normalizedComment ? `${normalizedComment}${auditSuffix}` : auditSuffix.replace(/^\n/, '');
        }
        if (estado_tarea) updateData.estado_tarea = estado_tarea;

        if (fecha_hora_inicio !== undefined) updateData.fecha_hora_inicio = fecha_hora_inicio ? new Date(fecha_hora_inicio) : null;
        if (fecha_hora_fin !== undefined) updateData.fecha_hora_fin = fecha_hora_fin ? new Date(fecha_hora_fin) : null;
        if (costo_real !== undefined) updateData.costo_real = Number(costo_real);
        if (cantidad_buena !== undefined) updateData.cantidad_buena = Number(cantidad_buena);
        if (cantidad_mala !== undefined) updateData.cantidad_mala = Number(cantidad_mala);

        let calculatedRealMinutes: number | undefined;
        if (duracion_real_min !== undefined) {
            calculatedRealMinutes = Math.max(0, Number(duracion_real_min));
        } else if (nextStart && nextEnd) {
            calculatedRealMinutes = Math.max(0, Math.round((nextEnd.getTime() - nextStart.getTime()) / 60000));
        }

        if (calculatedRealMinutes !== undefined) {
            updateData.duracion_real_min = calculatedRealMinutes;
            updateData.tiempo_real_min = calculatedRealMinutes;
        }

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

        const orderTasks = await prisma.tareaProduccion.findMany({
            where: { orden_trabajo_id: updatedTask.orden_trabajo_id },
            include: { rutaFabricacion: true }
        });

        const totalDuration = orderTasks.reduce((acc, task) => acc + Number(task.duracion_real_min || task.tiempo_real_min || 0), 0);
        const totalCost = orderTasks.reduce((acc, task) => acc + Number(task.costo_real || 0), 0);
        const allDone = orderTasks.every(task => task.estado_tarea === 'Finalizada' || task.estado_tarea === 'Completada');

        await prisma.ordenTrabajo.update({
            where: { id: updatedTask.orden_trabajo_id },
            data: {
                duracion_total_real_min: totalDuration,
                costo_total_real: totalCost,
                estado_ot: allDone ? 'Completada' : currentTask.ordenTrabajo.estado_ot
            }
        });

        // Si la tarea editada es de Verificación y Empaque y está finalizada, sincronizar stock (solo si hubo delta positivo)
        if (
            updatedTask.cantidad_buena !== undefined &&
            updatedTask.cantidad_buena !== null &&
            (updatedTask.estado_tarea === 'Finalizada' || updatedTask.estado_tarea === 'Completada')
        ) {
            await prisma.$transaction(async (tx) => {
                await InventoryService.registerFinishedProductEntry(tx, {
                    ordenTrabajoId: updatedTask.orden_trabajo_id,
                    tareaId: updatedTask.id,
                    cantidadBuenaAprobada: Number(updatedTask.cantidad_buena),
                    usuarioNombre: usuario_ultima_edicion || (req as any).user?.nombre || 'Supervisor',
                    observacion: `Ajuste de cantidad aprobada en tarea (OT ${currentTask.ordenTrabajo.numero_ot})`
                });
            });
        }

        res.json(updatedTask);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando detalles de tarea', details: error.message });
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

