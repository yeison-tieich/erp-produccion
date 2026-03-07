// Ajuste manual de stock (positivo o negativo)
export const adjustStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, referencia_id } = req.body; // cantidad puede ser positiva o negativa
    try {
        const result = await prisma.$transaction(async (tx) => {
            const material = await tx.materiaPrima.update({
                where: { id: Number(id) },
                data: { stock_actual: { increment: Number(cantidad) } },
            });
            await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: Number(id),
                    tipo_movimiento: 'Ajuste',
                    cantidad: Number(cantidad),
                    referencia_id,
                },
            });
            return material;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error ajustando stock' });
    }
};

// Obtener historial de movimientos de un material
export const getMaterialMovements = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const movimientos = await prisma.movimientoInventarioMP.findMany({
            where: { materia_prima_id: Number(id) },
            include: { materiaPrima: true },
            orderBy: { fecha_hora: 'desc' }
        });
        res.json(movimientos);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching movements' });
    }
};

import { Request, Response } from 'express';
import prisma from '../prisma';

export const getMaterials = async (req: Request, res: Response) => {
    try {
        const materials = await prisma.materiaPrima.findMany();
        res.json(materials);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching materials' });
    }
};

export const createMaterial = async (req: Request, res: Response) => {
    try {
        const material = await prisma.materiaPrima.create({ data: req.body });
        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error creating material' });
    }
};

export const addStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, referencia_id } = req.body; // cantidad should be positive
    try {
        const result = await prisma.$transaction(async (tx) => {
            const material = await tx.materiaPrima.update({
                where: { id: Number(id) },
                data: { stock_actual: { increment: Number(cantidad) } },
            });

            await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: Number(id),
                    tipo_movimiento: 'Ingreso Compra',
                    cantidad: Number(cantidad),
                    referencia_id,
                },
            });
            return material;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error adding stock' });
    }
};

export const updateMaterial = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre_mp, categoria_mp, unidad_medida_stock, punto_reorden } = req.body;
    try {
        const material = await prisma.materiaPrima.update({
            where: { id: Number(id) },
            data: {
                nombre_mp,
                categoria_mp,
                unidad_medida_stock,
                punto_reorden: Number(punto_reorden)
            }
        });
        res.json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error updating material' });
    }
};
