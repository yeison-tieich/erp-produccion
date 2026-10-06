import { Request, Response } from 'express';
import prisma from '../prisma';
import { getAreaFromDescription } from '../utils/machineUtils';
import { uploadToCloudinary } from '../utils/cloudinary';

export const getMachines = async (req: Request, res: Response) => {
    try {
        const machines = await prisma.maquina.findMany({
            orderBy: { codigo: 'asc' }
        });
        res.json(machines);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machines' });
    }
};

export const createMachine = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body };
        if (!data.area_produccion && data.descripcion) {
            data.area_produccion = getAreaFromDescription(data.descripcion);
        }
        const machine = await prisma.maquina.create({ data });
        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Error creating machine' });
    }
};

export const updateMachine = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = { ...req.body };
        // Si no trae área pero sí descripción, recalculamos el área
        if (!data.area_produccion && data.descripcion) {
            data.area_produccion = getAreaFromDescription(data.descripcion);
        }
        const machine = await prisma.maquina.update({
            where: { id: Number(id) },
            data
        });
        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Error updating machine' });
    }
};

export const deleteMachine = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.maquina.delete({ where: { id: Number(id) } });
        res.json({ message: 'Machine deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting machine' });
    }
};

export const getMachineLoad = async (req: Request, res: Response) => {
    const { week, year } = req.query;

    if (!week || !year) {
        return res.status(400).json({ error: 'Week and year are required' });
    }

    try {
        const machines = await prisma.maquina.findMany({
            include: {
                carga: {
                    where: {
                        semana: Number(week),
                        ano: Number(year),
                    },
                    include: {
                        proyecto: {
                            select: {
                                id: true,
                                descripcion_tecnica: true,
                            }
                        }
                    }
                }
            }
        });
        res.json(machines);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machine load' });
    }
}

export const uploadMachineImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
        const result = await uploadToCloudinary(req.file.buffer, 'machines');
        const imageUrl = result.secure_url;
        const machine = await prisma.maquina.update({
            where: { id: Number(id) },
            data: { foto_url: imageUrl }
        });
        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Error uploading machine image' });
    }
};

// Historial de Trabajo de una Máquina
export const getMachineWorkHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const tasks = await prisma.tareaProduccion.findMany({
            where: { maquina_id: Number(id) },
            include: {
                ordenTrabajo: {
                    include: {
                        producto: true
                    }
                },
                personal: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        let accumulatedMinutes = 0;
        const history = tasks.map(t => {
            const minutes = t.duracion_real_min || t.tiempo_real_min || 0;
            accumulatedMinutes += minutes;
            return {
                id: t.id,
                ot_numero: t.ordenTrabajo?.numero_ot || 'N/A',
                producto: t.ordenTrabajo?.producto?.nombre_producto || 'N/A',
                operario: t.personal?.nombre || 'N/A',
                fecha: t.fecha || t.updatedAt,
                horas_trabajadas: (minutes / 60).toFixed(2),
                tiempo_acumulado_hrs: (accumulatedMinutes / 60).toFixed(2),
                estado: t.estado_tarea || 'Completada'
            };
        });

        res.json(history);
    } catch (error: any) {
        res.status(500).json({ error: 'Error fetching machine history', details: error.message });
    }
};

// Procesos y Productos Habituales
export const getMachineProductProcesses = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const processes = await prisma.productoMaquinaProceso.findMany({
            where: { maquina_id: Number(id) },
            include: { producto: true }
        });
        res.json(processes);
    } catch (error: any) {
        res.status(500).json({ error: 'Error fetching machine product processes', details: error.message });
    }
};

export const addMachineProductProcess = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { producto_id, proceso, tiempo_estandar, tiempo_estandar_min, observaciones } = req.body;
    try {
        const tiempoEstandar = tiempo_estandar || tiempo_estandar_min || 0;
        const processItem = await prisma.productoMaquinaProceso.create({
            data: {
                maquina_id: Number(id),
                producto_id: Number(producto_id),
                proceso,
                tiempo_estandar: tiempoEstandar ? Number(tiempoEstandar) : 0,
                observaciones
            },
            include: { producto: true }
        });
        res.json(processItem);
    } catch (error: any) {
        res.status(500).json({ error: 'Error adding product process to machine', details: error.message });
    }
};

export const deleteMachineProductProcess = async (req: Request, res: Response) => {
    const { processId } = req.params;
    try {
        await prisma.productoMaquinaProceso.delete({
            where: { id: Number(processId) }
        });
        res.json({ message: 'Proceso eliminado de la máquina' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error deleting process from machine', details: error.message });
    }
};

// Sugerencia Automática de Máquina para un Producto
export const suggestMachineForProduct = async (req: Request, res: Response) => {
    const { producto_id } = req.params;
    try {
        // Find most used machine in OTs or in ProductoMaquinaProceso
        const processRelation = await prisma.productoMaquinaProceso.findFirst({
            where: { producto_id: Number(producto_id) },
            include: { maquina: true },
            orderBy: { tiempo_estandar: 'asc' }
        });

        if (processRelation && processRelation.maquina) {
            return res.json({ maquina: processRelation.maquina, motivo: 'Configurada en Procesos Habituales' });
        }

        const otMatch = await prisma.ordenTrabajo.groupBy({
            by: ['maquina_id'],
            where: { producto_id: Number(producto_id), maquina_id: { not: null } },
            _count: { maquina_id: true },
            orderBy: { _count: { maquina_id: 'desc' } },
            take: 1
        });

        if (otMatch.length > 0 && otMatch[0].maquina_id) {
            const machine = await prisma.maquina.findUnique({
                where: { id: otMatch[0].maquina_id }
            });
            if (machine) {
                return res.json({ maquina: machine, motivo: 'Más utilizada históricamente para este producto' });
            }
        }

        const fallbackMachine = await prisma.maquina.findFirst({
            where: { estado: 'Operativa' }
        });

        res.json({ maquina: fallbackMachine, motivo: 'Máquina operativa por defecto' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error suggesting machine', details: error.message });
    }
};

