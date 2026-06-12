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
        const { espesor, ancho, largo, densidad, peso_unitario, ...rest } = req.body;
        const material = await prisma.materiaPrima.create({ 
            data: {
                ...rest,
                espesor: espesor ? Number(espesor) : 0,
                ancho: ancho ? Number(ancho) : 0,
                largo: largo ? Number(largo) : 0,
                densidad: densidad ? Number(densidad) : 7.85,
                peso_unitario: peso_unitario ? Number(peso_unitario) : 0,
                costo_unitario: req.body.costo_unitario ? Number(req.body.costo_unitario) : 0,
            } 
        });
        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error creating material' });
    }
};


export const addStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, referencia_id, imagen_remision_url, cliente_id } = req.body; // cantidad should be positive
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
                    imagen_remision_url,
                    cliente_id: cliente_id ? Number(cliente_id) : null,
                },
            });
            return material;
        });
        res.json(result);
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ error: 'Error adding stock' });
    }
};


export const updateMaterial = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        nombre_mp, 
        categoria_mp, 
        unidad_medida_stock, 
        punto_reorden,
        espesor,
        ancho,
        largo,
        densidad,
        peso_unitario
    } = req.body;
    try {
        const material = await prisma.materiaPrima.update({
            where: { id: Number(id) },
            data: {
                nombre_mp,
                categoria_mp,
                unidad_medida_stock,
                punto_reorden: Number(punto_reorden),
                stock_actual: req.body.stock_actual !== undefined ? Number(req.body.stock_actual) : undefined,
                stock_reservado: req.body.stock_reservado !== undefined ? Number(req.body.stock_reservado) : undefined,
                devoluciones: req.body.devoluciones !== undefined ? Number(req.body.devoluciones) : undefined,
                espesor: espesor !== undefined ? Number(espesor) : undefined,
                ancho: ancho !== undefined ? Number(ancho) : undefined,
                largo: largo !== undefined ? Number(largo) : undefined,
                densidad: densidad !== undefined ? Number(densidad) : undefined,
                peso_unitario: peso_unitario !== undefined ? Number(peso_unitario) : undefined,
                costo_unitario: req.body.costo_unitario !== undefined ? Number(req.body.costo_unitario) : undefined,
            }
        });
        res.json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error updating material' });
    }
};

import { uploadToCloudinary } from '../utils/cloudinary';

export const uploadRemissionImage = async (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await uploadToCloudinary(file.buffer, 'remisiones');
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('uploadRemissionImage error:', error);
        res.status(500).json({ error: 'Error uploading image' });
    }
};



export const reverseMovement = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.movimientoInventarioMP.findUnique({
                where: { id: Number(id) },
                include: { materiaPrima: true }
            });

            if (!movement) throw new Error('Movimiento no encontrado');
            
            // Permitimos revertir consumos (cantidad negativa) o ingresos (cantidad positiva)
            // La idea es generar el movimiento OPUESTO.
            const cantidadOriginal = Number(movement.cantidad);
            const cantidadInversa = -cantidadOriginal;

            // 1. Actualizar stock actual de la materia prima
            await tx.materiaPrima.update({
                where: { id: movement.materia_prima_id },
                data: { stock_actual: { increment: cantidadInversa } }
            });

            // 2. Crear nuevo movimiento de reversión
            const reverseMovement = await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: movement.materia_prima_id,
                    tipo_movimiento: 'Reversión / Devolución',
                    cantidad: cantidadInversa,
                    referencia_id: `REV-${movement.referencia_id || movement.id}`,
                    orden_trabajo_id: movement.orden_trabajo_id,
                    cliente_id: movement.cliente_id
                }
            });

            console.log(`[AUDITORÍA] Movimiento ${id} revertido. Nueva cantidad en stock ajustada por ${cantidadInversa}`);

            return reverseMovement;
        });

        res.json(result);
    } catch (error) {
        console.error('Error in reverseMovement:', error);
        res.status(500).json({ error: 'Error al revertir el movimiento de inventario' });
    }
};

export const getInventoryStats = async (req: Request, res: Response) => {
    try {
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const movementsCount = await prisma.movimientoInventarioMP.count({
            where: {
                tipo_movimiento: 'Ingreso Compra',
                fecha_hora: {
                    gte: firstDayOfMonth
                }
            }
        });

        res.json({ monthlyMovements: movementsCount });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ error: 'Error fetching inventory stats' });
    }
};
