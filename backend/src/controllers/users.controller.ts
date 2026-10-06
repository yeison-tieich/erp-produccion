import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.usuario.findMany({
            select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                cargo: true,
                activo: true,
                permisos: true,
                personal_id: true
            },
            orderBy: { id: 'asc' }
        });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { nombre, email, password, rol, cargo, permisos, personal_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const user = await prisma.usuario.create({
            data: {
                nombre,
                email,
                password_hash: hashedPassword,
                rol: rol || 'Operario',
                cargo,
                permisos: typeof permisos === 'object' ? JSON.stringify(permisos) : permisos,
                personal_id: personal_id ? Number(personal_id) : null
            }
        });
        res.status(201).json(user);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear usuario', details: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, email, password, rol, cargo, activo, permisos, personal_id } = req.body;
    try {
        const updateData: any = {};
        if (nombre) updateData.nombre = nombre;
        if (email) updateData.email = email;
        if (rol) updateData.rol = rol;
        if (cargo !== undefined) updateData.cargo = cargo;
        if (activo !== undefined) updateData.activo = Boolean(activo);
        if (permisos !== undefined) {
            updateData.permisos = typeof permisos === 'object' ? JSON.stringify(permisos) : permisos;
        }
        if (personal_id !== undefined) {
            updateData.personal_id = personal_id ? Number(personal_id) : null;
        }
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.usuario.update({
            where: { id: Number(id) },
            data: updateData
        });

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.usuario.delete({ where: { id: Number(id) } });
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
    }
};

export const getRoles = (req: Request, res: Response) => {
    const roles = [
        'Administrador',
        'Gerencia',
        'Producción',
        'Calidad',
        'Almacén',
        'Compras',
        'Mantenimiento',
        'Operario',
        'Consulta'
    ];
    res.json(roles);
};
