import { Request, Response } from 'express';
import prisma from '../prisma';

// CONFIGURATIONS
export const getSettings = async (req: Request, res: Response) => {
    try {
        let config = await prisma.configuracion.findFirst();
        if (!config) {
            config = await prisma.configuracion.create({ data: {} });
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const config = await prisma.configuracion.findFirst();
        const data = { ...req.body };
        
        // Handle numeric fields
        if (data.densidad_acero_default) data.densidad_acero_default = Number(data.densidad_acero_default);
        if (data.horas_turno_default) data.horas_turno_default = Number(data.horas_turno_default);
        if (data.decimales_produccion) data.decimales_produccion = Number(data.decimales_produccion);
        if (data.decimales_costos) data.decimales_costos = Number(data.decimales_costos);
        if (data.decimales_medidas) data.decimales_medidas = Number(data.decimales_medidas);
        if (data.umbral_stock_minimo) data.umbral_stock_minimo = Number(data.umbral_stock_minimo);
        if (data.dias_retraso_alerta) data.dias_retraso_alerta = Number(data.dias_retraso_alerta);

        let result;
        if (config) {
            result = await prisma.configuracion.update({
                where: { id: config.id },
                data
            });
        } else {
            result = await prisma.configuracion.create({ data });
        }
        res.json(result);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error updating settings' });
    }
};

// USER SETTINGS
export const getUserSettings = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        let userConfig = await prisma.configuracionUsuario.findUnique({
            where: { usuario_id: userId }
        });
        
        if (!userConfig) {
            userConfig = await prisma.configuracionUsuario.create({
                data: { usuario_id: userId }
            });
        }
        res.json(userConfig);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user settings' });
    }
};

export const updateUserSettings = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const result = await prisma.configuracionUsuario.upsert({
            where: { usuario_id: userId },
            update: req.body,
            create: {
                ...req.body,
                usuario_id: userId
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user settings' });
    }
};

// OPERATIONS CATALOG
export const getOperationsCatalog = async (req: Request, res: Response) => {
    try {
        const operations = await prisma.operacionCatalog.findMany({
            orderBy: { orden: 'asc' }
        });
        res.json(operations);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching operations catalog' });
    }
};

export const createOperation = async (req: Request, res: Response) => {
    try {
        const { costo_hora, ...rest } = req.body;
        const operation = await prisma.operacionCatalog.create({
            data: {
                ...rest,
                costo_hora: costo_hora ? Number(costo_hora) : 0
            }
        });
        res.status(201).json(operation);
    } catch (error) {
        res.status(500).json({ error: 'Error creating operation' });
    }
};

export const updateOperation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { costo_hora, ...rest } = req.body;
        const operation = await prisma.operacionCatalog.update({
            where: { id: Number(id) },
            data: {
                ...rest,
                costo_hora: costo_hora !== undefined ? Number(costo_hora) : undefined
            }
        });
        res.json(operation);
    } catch (error) {
        res.status(500).json({ error: 'Error updating operation' });
    }
};

export const deleteOperation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.operacionCatalog.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting operation' });
    }
};
