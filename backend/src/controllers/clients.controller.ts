
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await prisma.cliente.findMany({
            where: { activo: true },
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

export const updateClientRating = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { calificacion } = req.body;
    try {
        const rating = Number(calificacion);
        if (isNaN(rating) || rating < 0 || rating > 5) {
            return res.status(400).json({ error: 'Calificación debe estar entre 0 y 5' });
        }

        const client = await prisma.cliente.update({
            where: { id: Number(id) },
            data: { calificacion: rating }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error updating client rating' });
    }
};

export const deleteClient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const clientId = Number(id);
    try {
        const client = await prisma.cliente.findUnique({
            where: { id: clientId },
            include: {
                productos: true,
                movimientosInventario: true,
            }
        });

        if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

        const otsCount = await prisma.ordenTrabajo.count({
            where: { cliente: client.nombre }
        });

        const hasHistory = client.productos.length > 0 || client.movimientosInventario.length > 0 || otsCount > 0;

        if (hasHistory) {
            await prisma.cliente.update({
                where: { id: clientId },
                data: { activo: false }
            });
            return res.json({ message: 'Cliente marcado como Inactivo debido a que posee historial asociado', inactivo: true });
        } else {
            await prisma.cliente.delete({
                where: { id: clientId }
            });
            return res.json({ message: 'Cliente eliminado físicamente con éxito', inactivo: false });
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el cliente', details: error.message });
    }
};

export const bindProducts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productIds } = req.body; // Array of numbers
    try {
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ error: 'productIds debe ser un arreglo de IDs' });
        }

        await prisma.producto.updateMany({
            where: { id: { in: productIds.map(Number) } },
            data: { cliente_id: Number(id) }
        });

        res.json({ message: 'Productos vinculados exitosamente' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error al vincular productos', details: error.message });
    }
};

export const unbindProducts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productIds } = req.body; // Array of numbers
    try {
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ error: 'productIds debe ser un arreglo de IDs' });
        }

        await prisma.producto.updateMany({
            where: { 
                id: { in: productIds.map(Number) },
                cliente_id: Number(id)
            },
            data: { cliente_id: null }
        });

        res.json({ message: 'Productos desvinculados exitosamente' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error al desvincular productos', details: error.message });
    }
};

