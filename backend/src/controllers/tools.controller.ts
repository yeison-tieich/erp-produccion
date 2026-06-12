
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getTools = async (req: Request, res: Response) => {
    try {
        const tools = await prisma.herramientaConsumible.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(tools);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tools' });
    }
};

export const getToolById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const tool = await prisma.herramientaConsumible.findUnique({
            where: { id: Number(id) },
            include: {
                prestamos: {
                    include: {
                        personal: true
                    },
                    orderBy: { fecha_prestamo: 'desc' }
                }
            }
        });
        if (!tool) return res.status(404).json({ error: 'Tool not found' });
        res.json(tool);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tool details' });
    }
};

export const createTool = async (req: Request, res: Response) => {
    try {
        const { cantidad_total, ...rest } = req.body;
        const tool = await prisma.herramientaConsumible.create({
            data: {
                ...rest,
                cantidad_total: Number(cantidad_total),
                cantidad_disponible: Number(cantidad_total),
                estado: 'DISPONIBLE'
            }
        });
        res.status(201).json(tool);
    } catch (error) {
        res.status(500).json({ error: 'Error creating tool' });
    }
};

export const updateTool = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { cantidad_total, cantidad_disponible, ...rest } = req.body;
        const tool = await prisma.herramientaConsumible.update({
            where: { id: Number(id) },
            data: {
                ...rest,
                cantidad_total: cantidad_total !== undefined ? Number(cantidad_total) : undefined,
                cantidad_disponible: cantidad_disponible !== undefined ? Number(cantidad_disponible) : undefined,
            }
        });
        res.json(tool);
    } catch (error) {
        res.status(500).json({ error: 'Error updating tool' });
    }
};

export const deleteTool = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.herramientaConsumible.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Tool deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting tool' });
    }
};
