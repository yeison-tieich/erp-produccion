import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar' | 'exportar';

const getPermissionAction = (req: Request): PermissionAction => {
    if (req.method === 'GET') {
        return /\/(export|excel|pdf|csv|download|report)(\/|$|\?)/i.test(req.originalUrl)
            ? 'exportar'
            : 'ver';
    }
    if (req.method === 'POST') return 'crear';
    if (req.method === 'PUT' || req.method === 'PATCH') return 'editar';
    if (req.method === 'DELETE') return 'eliminar';
    return 'ver';
};

export const authorizeModulePermission = (module: string) =>
    async (
        req: Request & { user?: { id: number; rol: string }; modulePermissionAllowed?: boolean },
        res: Response,
        next: NextFunction
    ) => {
        try {
            if (!req.user) return res.sendStatus(401);

            const user = await prisma.usuario.findUnique({
                where: { id: req.user.id },
                select: { rol: true, permisos: true }
            });
            if (!user) return res.sendStatus(401);
            if (user.rol === 'Administrador') return next();
            if (!user.permisos) return next();

            let permissions: Record<string, Record<string, boolean>>;
            try {
                permissions = JSON.parse(user.permisos);
            } catch (error) {
                console.error(`Invalid permission matrix for user ${req.user.id}:`, error);
                return res.status(403).json({ error: 'La matriz de permisos del usuario no es válida.' });
            }

            const action = getPermissionAction(req);
            const allowed = permissions[module]?.[action];
            if (typeof allowed !== 'boolean') return next();
            if (!allowed) {
                return res.status(403).json({ error: `No tiene permiso para ${action} en el módulo ${module}.` });
            }

            req.modulePermissionAllowed = true;
            return next();
        } catch (error) {
            console.error(`Error checking permissions for module ${module}:`, error);
            return res.status(500).json({ error: 'No se pudieron verificar los permisos del usuario.' });
        }
    };
