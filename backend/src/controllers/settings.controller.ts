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
const THEME_FIELDS = [
    'tema',
    'color_primario',
    'color_secundario',
    'color_superficie',
    'color_borde',
    'color_texto'
] as const;

const getAdministratorTheme = async () => {
    const administrator = await prisma.usuario.findFirst({
        where: { rol: 'Administrador' },
        orderBy: { id: 'asc' },
        select: { id: true, configuracion: true }
    });

    if (!administrator) return null;

    const settings = administrator.configuracion ??
        await prisma.configuracionUsuario.create({ data: { usuario_id: administrator.id } });

    return Object.fromEntries(THEME_FIELDS.map(field => [field, settings[field]]));
};

export const getUserSettings = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { rol: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        let userConfig = await prisma.configuracionUsuario.findUnique({
            where: { usuario_id: userId }
        });
        
        if (!userConfig) {
            userConfig = await prisma.configuracionUsuario.create({
                data: { usuario_id: userId }
            });
        }

        const administratorTheme = user.rol === 'Administrador' ? null : await getAdministratorTheme();
        res.json({ ...userConfig, ...(administratorTheme ?? {}) });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'Error fetching user settings' });
    }
};

export const updateUserSettings = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { rol: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const data = user.rol === 'Administrador'
            ? req.body
            : {
                ...(req.body.notificaciones_app !== undefined && {
                    notificaciones_app: req.body.notificaciones_app
                }),
                ...(req.body.notificaciones_email !== undefined && {
                    notificaciones_email: req.body.notificaciones_email
                })
            };

        const result = await prisma.configuracionUsuario.upsert({
            where: { usuario_id: userId },
            update: data,
            create: {
                ...data,
                usuario_id: userId
            }
        });

        const administratorTheme = user.rol === 'Administrador' ? null : await getAdministratorTheme();
        res.json({ ...result, ...(administratorTheme ?? {}) });
    } catch (error) {
        console.error('Error updating user settings:', error);
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
