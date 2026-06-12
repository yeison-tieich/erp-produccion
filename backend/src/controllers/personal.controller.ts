
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getPersonal = async (req: Request, res: Response) => {
    try {
        const personal = await prisma.personal.findMany({
            include: {
                registrosTiempo: true
            }
        });
        res.json(personal);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching personal' });
    }
};

export const createPersonal = async (req: Request, res: Response) => {
    try {
        const { nombre, cedula, cargo, salario, kpi_puntualidad, eficiencia, calificacion, area, activo } = req.body;
        const person = await prisma.personal.create({
            data: {
                nombre,
                cedula,
                cargo,
                salario: salario ? Number(salario) : undefined,
                kpi_puntualidad: kpi_puntualidad ? Number(kpi_puntualidad) : undefined,
                eficiencia: eficiencia ? Number(eficiencia) : undefined,
                calificacion,
                area: area || '',
                activo: activo !== undefined ? Boolean(activo) : true
            }
        });
        res.json(person);
    } catch (error) {
        console.error('Error creating personal:', error);
        res.status(500).json({ error: 'Error creating personal' });
    }
};

export const updatePersonal = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { nombre, cedula, cargo, salario, kpi_puntualidad, eficiencia, calificacion, area, activo } = req.body;
        const person = await prisma.personal.update({
            where: { id: Number(id) },
            data: {
                nombre,
                cedula,
                cargo,
                salario: salario !== undefined ? (salario === '' ? null : Number(salario)) : undefined,
                kpi_puntualidad: kpi_puntualidad !== undefined ? (kpi_puntualidad === '' ? null : Number(kpi_puntualidad)) : undefined,
                eficiencia: eficiencia !== undefined ? (eficiencia === '' ? null : Number(eficiencia)) : undefined,
                calificacion,
                area: area !== undefined ? area : undefined,
                activo: activo !== undefined ? Boolean(activo) : undefined
            }
        });
        res.json(person);
    } catch (error) {
        console.error('Error updating personal:', error);
        res.status(500).json({ error: 'Error updating personal' });
    }
};

export const getPersonalDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const person = await prisma.personal.findUnique({
            where: { id: Number(id) },
            include: {
                registrosTiempo: { orderBy: { fecha: 'desc' } },
                dotaciones: { orderBy: { fecha_entrega: 'desc' } },
                tareas: {
                    include: {
                        ordenTrabajo: true,
                        rutaFabricacion: true
                    }
                },
                prestamosHerramientas: {
                    include: {
                        herramienta: true
                    },
                    orderBy: { fecha_prestamo: 'desc' }
                }
            }
        });
        if (!person) return res.status(404).json({ error: 'Personal not found' });
        res.json(person);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching personal details' });
    }
};

export const addTimeLog = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tipo, fecha, horas, motivo } = req.body;
    try {
        const log = await prisma.registroTiempoLaboral.create({
            data: {
                personal_id: Number(id),
                tipo,
                fecha: new Date(fecha + 'T12:00:00'),
                horas: Number(horas),
                motivo
            }
        });
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: 'Error adding time log' });
    }
};

export const addDotacion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { item, cantidad, comentarios } = req.body;
    try {
        const dotacion = await prisma.dotacionEPP.create({
            data: {
                personal_id: Number(id),
                item,
                cantidad: Number(cantidad),
                comentarios
            }
        });
        res.json(dotacion);
    } catch (error) {
        res.status(500).json({ error: 'Error adding dotacion' });
    }
};

export const toggleTimeLogPayment = async (req: Request, res: Response) => {
    const { logId } = req.params;
    const { pagado } = req.body;
    try {
        const log = await prisma.registroTiempoLaboral.update({
            where: { id: Number(logId) },
            data: { pagado: Boolean(pagado) }
        });
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: 'Error updating payment status' });
    }
};

export const updateTimeLog = async (req: Request, res: Response) => {
    const { logId } = req.params;
    const { tipo, fecha, horas, motivo } = req.body;
    try {
        const log = await prisma.registroTiempoLaboral.update({
            where: { id: Number(logId) },
            data: {
                tipo,
                fecha: new Date(fecha + 'T12:00:00'),
                horas: Number(horas),
                motivo
            }
        });
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: 'Error updating time log' });
    }
};

export const deletePersonal = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Delete related records first or use cascade if configured (SQLite needs manual help sometimes or Prisma handles it)
        await prisma.$transaction([
            prisma.registroTiempoLaboral.deleteMany({ where: { personal_id: Number(id) } }),
            prisma.dotacionEPP.deleteMany({ where: { personal_id: Number(id) } }),
            prisma.personal.delete({ where: { id: Number(id) } })
        ]);
        res.json({ message: 'Personal deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting personal' });
    }
};

export const bulkAddOvertime = async (req: Request, res: Response) => {
    const { items, fecha } = req.body;
    try {
        const operations = items.map((item: any) => {
            const totalHours = Number(item.horas_diurnas || 0) + Number(item.horas_nocturnas || 0) + Number(item.horas_festivas || 0);
            return prisma.registroTiempoLaboral.create({
                data: {
                    personal_id: Number(item.personal_id),
                    tipo: 'Hora Extra',
                    fecha: new Date(fecha + 'T12:00:00'),
                    horas: totalHours,
                    horas_diurnas: Number(item.horas_diurnas || 0),
                    horas_nocturnas: Number(item.horas_nocturnas || 0),
                    horas_festivas: Number(item.horas_festivas || 0),
                    costo_total: item.costo_total ? Number(item.costo_total) : 0,
                    motivo: item.motivo || ''
                }
            });
        });

        await prisma.$transaction(operations);
        res.json({ message: 'Registros guardados exitosamente' });
    } catch (error) {
        console.error('Error in bulkAddOvertime:', error);
        res.status(500).json({ error: 'Error al registrar horas extras masivamente' });
    }
};
