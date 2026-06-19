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
}
