
import { Request, Response } from 'express';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary } from '../utils/cloudinary';

const PRODUCT_DASHBOARD_CLIENTS = ['CHEA ING', 'SERIES', 'SIEMENS', 'TNK', 'ARNESES Y GOMAS'];
const PRODUCT_DASHBOARD_ROLES = ['Administrador', 'Supervisor', 'Gerencia', 'Diseño', 'Contabilidad', 'Compras'];

const normalizeClientName = (name?: string | null) => String(name || '').trim().toUpperCase();

const getProductStockStatus = (product: { stock_actual: number; stock_minimo: number | null; stock_maximo: number | null }) => {
    const stock = Number(product.stock_actual || 0);
    if (stock <= 0) return 'AGOTADO';
    if (product.stock_minimo === null || product.stock_maximo === null) return 'SIN_PARAMETRIZAR';
    if (stock <= Number(product.stock_minimo)) return 'CRITICO';
    if (stock <= Number(product.stock_maximo)) return 'EN_REORDEN';
    return 'SUFICIENTE';
};

const hasCompleteQuality = (plans: Array<{ activo: boolean; caracteristicas: Array<{ cota_nominal: unknown; tolerancia_min: unknown; tolerancia_max: unknown }> }>) =>
    plans.some(plan => plan.activo && plan.caracteristicas.length > 0 && plan.caracteristicas.every(characteristic =>
        characteristic.cota_nominal !== null && characteristic.tolerancia_min !== null && characteristic.tolerancia_max !== null
    ));

export const getProductsDashboard = async (req: Request, res: Response) => {
    const userRole = (req as any).user?.rol;
    if (!PRODUCT_DASHBOARD_ROLES.includes(userRole)) return res.sendStatus(403);

    try {
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setDate(defaultFrom.getDate() - 30);
        const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom;
        const to = req.query.to ? new Date(String(req.query.to)) : now;
        const productId = req.query.productId ? Number(req.query.productId) : undefined;
        const movementType = req.query.movementType ? String(req.query.movementType) : undefined;

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
            return res.status(400).json({ error: 'Rango de fechas inválido' });
        }

        const products = await prisma.producto.findMany({
            where: {
                activo: true,
                ...(productId ? { id: productId } : {}),
                cliente: { nombre: { in: PRODUCT_DASHBOARD_CLIENTS, mode: 'insensitive' } }
            },
            select: {
                id: true,
                sku_producto: true,
                nombre_producto: true,
                descripcion: true,
                imagen_url: true,
                plano_pdf_url: true,
                stock_actual: true,
                stock_minimo: true,
                stock_maximo: true,
                precio_venta: true,
                cliente: { select: { id: true, nombre: true } },
                listaMateriales: { select: { id: true } },
                rutas: { where: { activo: true }, select: { id: true } },
                planesControl: {
                    where: { activo: true },
                    select: {
                        activo: true,
                        caracteristicas: { select: { cota_nominal: true, tolerancia_min: true, tolerancia_max: true } }
                    }
                }
            },
            orderBy: { nombre_producto: 'asc' }
        });

        const productIds = products.map(product => product.id);
        const movements = await prisma.movimientoProducto.findMany({
            where: {
                producto_id: { in: productIds },
                fecha: { gte: from, lte: to },
                ...(movementType ? { tipo_movimiento: movementType } : {})
            },
            select: {
                id: true,
                producto_id: true,
                fecha: true,
                tipo_movimiento: true,
                cantidad: true,
                referencia: true,
                producto: { select: { sku_producto: true, nombre_producto: true } }
            },
            orderBy: { fecha: 'desc' },
            take: 200
        });

        const productById = new Map(products.map(product => [product.id, product]));
        const rotation = new Map<number, { entradas: number; salidas: number }>();
        movements.forEach(movement => {
            const current = rotation.get(movement.producto_id) || { entradas: 0, salidas: 0 };
            const quantity = Math.abs(Number(movement.cantidad || 0));
            if (movement.tipo_movimiento.toLowerCase().includes('entrada')) current.entradas += quantity;
            if (movement.tipo_movimiento.toLowerCase().includes('salida')) current.salidas += quantity;
            rotation.set(movement.producto_id, current);
        });

        const health = {
            sinBOM: products.filter(product => product.listaMateriales.length === 0),
            sinCalidad: products.filter(product => !hasCompleteQuality(product.planesControl)),
            sinPlanoImagen: products.filter(product => !product.plano_pdf_url || !product.imagen_url),
            sinMinMax: products.filter(product => product.stock_minimo === null || product.stock_maximo === null)
        };
        const completeProducts = products.filter(product => Boolean(product.descripcion?.trim()) && product.rutas.length > 0 && product.listaMateriales.length > 0 && Boolean(product.plano_pdf_url) && hasCompleteQuality(product.planesControl));
        const statuses = products.map(product => getProductStockStatus(product));

        const serializedMovements = movements.map(movement => ({
            ...movement,
            cantidad: Number(movement.cantidad),
            fecha: movement.fecha.toISOString()
        }));

        res.json({
            range: { from: from.toISOString(), to: to.toISOString() },
            kpis: {
                totalProductos: products.length,
                piezasCriticas: products.filter(product => ['AGOTADO', 'CRITICO'].includes(getProductStockStatus(product))).reduce((total, product) => total + Number(product.stock_actual || 0), 0),
                integridadDatos: products.length ? Number(((completeProducts.length / products.length) * 100).toFixed(1)) : 0,
                valorInventario: products.reduce((total, product) => total + Number(product.stock_actual || 0) * Number(product.precio_venta || 0), 0)
            },
            dataHealth: {
                sinBOM: health.sinBOM.map(product => ({ id: product.id, sku: product.sku_producto, nombre: product.nombre_producto })),
                sinCalidad: health.sinCalidad.map(product => ({ id: product.id, sku: product.sku_producto, nombre: product.nombre_producto })),
                sinPlanoImagen: health.sinPlanoImagen.map(product => ({ id: product.id, sku: product.sku_producto, nombre: product.nombre_producto })),
                sinMinMax: health.sinMinMax.map(product => ({ id: product.id, sku: product.sku_producto, nombre: product.nombre_producto }))
            },
            stockDistribution: ['SUFICIENTE', 'EN_REORDEN', 'CRITICO', 'AGOTADO'].map(status => ({ estado: status, cantidad: statuses.filter(current => current === status).length })),
            completenessDistribution: [
                { estado: 'COMPLETOS', cantidad: completeProducts.length },
                { estado: 'PENDIENTES', cantidad: products.length - completeProducts.length }
            ],
            rotationTop10: Array.from(rotation.entries())
                .map(([id, values]) => ({ producto: productById.get(id)?.nombre_producto || 'Producto', sku: productById.get(id)?.sku_producto || '', ...values, movimiento: values.entradas + values.salidas }))
                .sort((a, b) => b.movimiento - a.movimiento)
                .slice(0, 10),
            movements: serializedMovements,
            filters: { products: products.map(product => ({ id: product.id, sku: product.sku_producto, nombre: product.nombre_producto })), types: Array.from(new Set(movements.map(movement => movement.tipo_movimiento))) }
        });
    } catch (error) {
        console.error('getProductsDashboard error:', error);
        res.status(500).json({ error: 'Error obteniendo dashboard de productos' });
    }
};

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
                stock_minimo: true,
                stock_maximo: true,
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
        precio_venta, stock_minimo, stock_maximo, materials, routes
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
                stock_minimo: stock_minimo !== undefined && stock_minimo !== '' ? Number(stock_minimo) : null,
                stock_maximo: stock_maximo !== undefined && stock_maximo !== '' ? Number(stock_maximo) : null,
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
        ancho_tira, medidas_pieza, empaque_de, activo, precio_venta, stock_minimo, stock_maximo, materials
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
                stock_minimo: stock_minimo !== undefined && stock_minimo !== '' ? Number(stock_minimo) : null,
                stock_maximo: stock_maximo !== undefined && stock_maximo !== '' ? Number(stock_maximo) : null,
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
