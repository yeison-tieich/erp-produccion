
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await prisma.cliente.findMany({
            include: {
                _count: {
                    select: { productos: true }
                }
            }
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching clients' });
    }
};

export const getClientDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const client = await prisma.cliente.findUnique({
            where: { id: Number(id) },
            include: {
                productos: {
                    include: {
                        rutas: true,
                        listaMateriales: { include: { materiaPrima: true } }
                    }
                }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching client details' });
    }
};

export const updateClient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, contacto, direccion } = req.body;
    try {
        const client = await prisma.cliente.update({
            where: { id: Number(id) },
            data: { nombre, contacto, direccion }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error updating client' });
    }
};
