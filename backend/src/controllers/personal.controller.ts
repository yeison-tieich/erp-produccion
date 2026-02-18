
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getPersonal = async (req: Request, res: Response) => {
    try {
        const personal = await prisma.personal.findMany();
        res.json(personal);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching personal' });
    }
};

export const createPersonal = async (req: Request, res: Response) => {
    try {
        const person = await prisma.personal.create({ data: req.body });
        res.json(person);
    } catch (error) {
        res.status(500).json({ error: 'Error creating personal' });
    }
};

export const updatePersonal = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const person = await prisma.personal.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.json(person);
    } catch (error) {
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
                fecha: new Date(fecha),
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
