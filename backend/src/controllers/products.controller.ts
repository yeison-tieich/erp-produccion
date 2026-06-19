
import { Request, Response } from 'express';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary } from '../utils/cloudinary';

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
                plano_pdf_url: true,
                activo: true,
                precio_venta: true,
                cliente: true,
                listaMateriales: {
                    include: { materiaPrima: true }
                },
                rutas: {
                    where: { activo: true },
                    orderBy: { no_operacion: 'asc' }
                }
            },
            orderBy: { id: 'desc' }
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
        precio_venta, materials, routes
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
                precio_venta: precio_venta ? Number(precio_venta) : 0,
                listaMateriales: {
                    create: (materials || []).map((m: any) => ({
                        materia_prima_id: Number(m.materia_prima_id),
                        cantidad_requerida: Number(m.cantidad_requerida) || 1
                    }))
                },
                rutas: {
                    create: (routes || []).map((r: any) => ({
                        no_operacion: Number(r.no),
                        nombre_operacion: r.nombre,
                        centro_trabajo: r.centro,
                        piezas_por_hora_estimado: r.piezas_hora ? Number(r.piezas_hora) : null,
                        tiempo_estandar: r.tiempo_estandar ? Number(r.tiempo_estandar) : null
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
    const { 
        sku_producto, nombre_producto, descripcion, cliente_id, acabado, 
        ancho_tira, medidas_pieza, empaque_de, activo, precio_venta, materials 
    } = req.body;
    try {
        // Update product basic info
        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: {
                sku_producto,
                nombre_producto,
                descripcion,
                cliente_id: cliente_id ? Number(cliente_id) : null,
                acabado,
                ancho_tira: ancho_tira ? Number(ancho_tira) : null,
                medidas_pieza,
                empaque_de,
                activo: activo !== undefined ? Boolean(activo) : undefined,
                precio_venta: precio_venta !== undefined ? Number(precio_venta) : undefined,
            }
        });

        // Update materials if provided
        if (materials && Array.isArray(materials)) {
            // Delete existing associations
            await prisma.listaMateriales.deleteMany({
                where: { producto_id: Number(id) }
            });

            // Create new associations
            if (materials.length > 0) {
                await prisma.listaMateriales.createMany({
                    data: materials.map((m: any) => ({
                        producto_id: Number(id),
                        materia_prima_id: Number(m.materia_prima_id),
                        cantidad_requerida: Number(m.cantidad_requerida) || 1
                    }))
                });
            }
        }

        res.json(product);
    } catch (error) {
        console.error('updateProduct error:', error);
        res.status(500).json({ error: 'Error updating product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Before deleting product, we might need to delete related records or handling constraints
        // For simplicity, we'll try to delete. If there are dependent records, it might fail.
        // Usually, it's better to soft delete by setting activo = false.
        // But user asked for a "delete button".
        
        await prisma.listaMateriales.deleteMany({ where: { producto_id: Number(id) } });
        await prisma.rutaFabricacion.deleteMany({ where: { producto_id: Number(id) } });
        
        await prisma.producto.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('deleteProduct error:', error);
        res.status(500).json({ error: 'Error deleting product. It might be linked to orders.' });
    }
};

export const adjustProductStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, tipo, referencia } = req.body; // tipo: 'entrada' | 'salida' | 'ajuste'
    try {
        const product = await prisma.$transaction(async (tx) => {
            const val = Number(cantidad);
            const adjustment = tipo === 'salida' ? -Math.abs(val) : Math.abs(val);

            const updatedProduct = await tx.producto.update({
                where: { id: Number(id) },
                data: {
                    stock_actual: {
                        increment: adjustment
                    }
                }
            });

            await tx.movimientoProducto.create({
                data: {
                    producto_id: Number(id),
                    tipo_movimiento: tipo,
                    cantidad: val,
                    referencia: referencia || 'Ajuste manual'
                }
            });

            return updatedProduct;
        });

        res.json(product);
    } catch (error) {
        console.error('adjustProductStock error:', error);
        res.status(500).json({ error: 'Error adjusting stock' });
    }
};

export const getProductMovements = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const movements = await prisma.movimientoProducto.findMany({
            where: { producto_id: Number(id) },
            orderBy: { fecha: 'desc' }
        });
        res.json(movements);
    } catch (error) {
        console.error('getProductMovements error:', error);
        res.status(500).json({ error: 'Error fetching product movements' });
    }
};

export const uploadProductImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await uploadToCloudinary(file.buffer, 'products');
        const imageUrl = result.secure_url;

        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: { imagen_url: imageUrl }
        });

        res.json(product);
    } catch (error) {
        console.error('uploadProductImage error:', error);
        res.status(500).json({ error: 'Error uploading image to Cloudinary' });
    }
};

export const uploadProductPDF = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await uploadToCloudinary(file.buffer, 'products');
        const pdfUrl = result.secure_url;

        const product = await prisma.producto.update({
            where: { id: Number(id) },
            data: { plano_pdf_url: pdfUrl }
        });

        res.json(product);
    } catch (error) {
        console.error('uploadProductPDF error:', error);
        res.status(500).json({ error: 'Error uploading PDF to Cloudinary' });
    }
};
export const updateProductRoutes = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { routes } = req.body; // Array of { id?, no, nombre, centro, piezas_hora, tiempo_estandar }
    
    const productId = Number(id);
    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    try {
        console.log(`Updating routes for product ${productId}...`);
        
        // We'll do this in a transaction for atomicity of the updates/creates
        await prisma.$transaction(async (tx) => {
            // 1. Get current routes to identify which ones to delete
            const currentRoutes = await tx.rutaFabricacion.findMany({
                where: { producto_id: productId }
            });

            const incomingIds = routes.filter((r: any) => r.id).map((r: any) => Number(r.id));
            const routesToDelete = currentRoutes.filter(r => !incomingIds.includes(r.id));

            // 2. Process incoming routes (Update or Create)
            for (const r of routes) {
                const no = Number(r.no);
                const piecesPerHour = (r.piezas_hora !== null && r.piezas_hora !== '') ? Number(r.piezas_hora) : null;
                const standardTime = (r.tiempo_estandar !== null && r.tiempo_estandar !== '') ? Number(r.tiempo_estandar) : null;

                const routeData = {
                    no_operacion: no,
                    nombre_operacion: String(r.nombre || ''),
                    centro_trabajo: String(r.centro || ''),
                    piezas_por_hora_estimado: (piecesPerHour !== null && !isNaN(piecesPerHour)) ? Math.round(piecesPerHour) : null,
                    tiempo_estandar: (standardTime !== null && !isNaN(standardTime)) ? standardTime : null
                };

                if (r.id) {
                    // Update existing route
                    await tx.rutaFabricacion.update({
                        where: { id: Number(r.id) },
                        data: routeData
                    });
                } else {
                    // Create new route
                    await tx.rutaFabricacion.create({
                        data: {
                            ...routeData,
                            producto_id: productId
                        }
                    });
                }
            }

            // 3. Attempt to delete routes that are no longer in the list
            // Note: If a route is in use, this will throw and roll back the transaction.
            // This is actually GOOD because it prevents inconsistent states where a step 
            // is "removed" from the product but still has active tasks.
            for (const r of routesToDelete) {
                // Check if it's in use by any tasks
                const inUse = await tx.tareaProduccion.findFirst({
                    where: { ruta_fabricacion_id: r.id }
                });

                if (inUse) {
                    // Soft delete: mark as inactive instead of deleting
                    await tx.rutaFabricacion.update({
                        where: { id: r.id },
                        data: { activo: false }
                    });
                } else {
                    // Hard delete: safe to remove from DB
                    await tx.rutaFabricacion.delete({
                        where: { id: r.id }
                    });
                }
            }
        });
        
        console.log(`Product routes for ID ${productId} updated successfully.`);
        res.json({ message: 'Ruta de producción actualizada con éxito' });
    } catch (error) {
        console.error('updateProductRoutes error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error updating product routes';
        res.status(500).json({ error: errorMessage });
    }
};
