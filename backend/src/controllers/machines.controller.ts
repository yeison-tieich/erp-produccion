
import { Request, Response } from 'express';
import prisma from '../prisma';

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
        const machine = await prisma.maquina.create({ data: req.body });
        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Error creating machine' });
    }
};

export const updateMachine = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const machine = await prisma.maquina.update({
            where: { id: Number(id) },
            data: req.body
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
