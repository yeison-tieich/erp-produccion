
import { Request, Response } from 'express';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.producto.findMany({
            select: {
                id: true,
                sku_producto: true,
                nombre_producto: true,
                descripcion: true,
                cliente_id: true,
                acabado: true,
                imagen_url: true,
                stock_actual: true,
                ancho_tira: true,
                medidas_pieza: true,
                piezas_lamina_4x8: true,
                piezas_lamina_2x1: true,
                empaque_de: true,
                cliente: true,
                listaMateriales: {
                    include: { materiaPrima: true }
                },
                rutas: true
            },
            orderBy: { id: 'desc' } // Orden descendente - más recientes primero
        });
        res.json(products);
    } catch (error) {
        console.error('getProducts error:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    const {
        sku_producto, nombre_producto, descripcion, cliente_id, acabado,
        imagen_url, stock_actual, ubicacion,
        medidas_pieza, piezas_lamina_4x8, piezas_lamina_2x1, empaque_de,
        materials, routes
    } = req.body;
    try {
        const product = await prisma.producto.create({
            data: {
                sku_producto,
                nombre_producto,
                descripcion,
                cliente_id: cliente_id ? Number(cliente_id) : null,
                acabado,
                imagen_url,
                stock_actual: Number(stock_actual) || 0,
                ubicacion,
                medidas_pieza,
                piezas_lamina_4x8,
                piezas_lamina_2x1,
                empaque_de,
                listaMateriales: {
                    create: (materials || []).map((m: any) => ({
                        materia_prima_id: m.id,
                        cantidad_requerida: m.cantidad
                    }))
                },
                rutas: {
                    create: (routes || []).map((r: any) => ({
                        no_operacion: r.no,
                        nombre_operacion: r.nombre,
                        centro_trabajo: r.centro,
                        piezas_por_hora_estimado: r.piezas_hora
                    }))
                }
            }
        });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating product' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sku_producto, nombre_producto, descripcion, cliente_id, acabado, ancho_tira, medidas_pieza, empaque_de } = req.body;
    try {
        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: {
                sku_producto,
                nombre_producto,
                descripcion,
                cliente_id: cliente_id ? Number(cliente_id) : null,
                acabado,
                ancho_tira,
                medidas_pieza,
                empaque_de
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error updating product' });
    }
};

export const adjustProductStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, tipo } = req.body; // tipo: 'entrada' | 'salida'
    try {
        const currentProduct = await prisma.producto.findUnique({ where: { id: Number(id) } });
        if (!currentProduct) return res.status(404).json({ error: 'Product not found' });

        const adjustment = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad);

        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: {
                stock_actual: {
                    increment: adjustment
                }
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error adjusting stock' });
    }
};

export const uploadProductImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // multer will have written the file to disk
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        // Save public path to DB as /images/<filename>
        const publicPath = `/images/${file.filename}`;

        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: { imagen_url: publicPath }
        });

        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error uploading image' });
    }
};
