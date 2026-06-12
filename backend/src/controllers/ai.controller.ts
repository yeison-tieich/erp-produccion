
import { Request, Response } from 'express';
import { readPOFromPDF } from '../services/documentReaderService';
import { generateManufacturingRoute } from '../services/routeGeneratorService';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';

export const readPO = async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
        const filePath = file.path;
        const poData = await readPOFromPDF(filePath);
        
        // Save to JSON file as well
        const jsonFilename = file.filename.replace(path.extname(file.filename), '.json');
        const jsonPath = path.join(path.dirname(filePath), jsonFilename);
        fs.writeFileSync(jsonPath, JSON.stringify(poData, null, 2));

        res.json({
            po: poData,
            file_url: `/uploads/oc/${file.filename}`,
            json_url: `/uploads/oc/${jsonFilename}`,
            original_filename: file.originalname
        });
    } catch (error: any) {
        console.error('Error reading PO:', error);
        res.status(500).json({ error: error.message || 'Error al procesar la Orden de Compra' });
    }
};

export const uploadOnly = async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
        res.json({
            file_url: `/uploads/oc/${file.filename}`,
            original_filename: file.originalname
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al subir el archivo' });
    }
};

export const generateRoute = async (req: Request, res: Response) => {
    const { productType, material, availableProcesses, availableMachines } = req.body;

    try {
        const route = await generateManufacturingRoute(
            productType,
            material,
            availableProcesses || [],
            availableMachines || []
        );
        res.json(route);
    } catch (error: any) {
        console.error('Error generating route:', error);
        res.status(500).json({ error: error.message || 'Error al generar la ruta de fabricación' });
    }
};

export const saveRouteToOrder = async (req: Request, res: Response) => {
    const { orderId, steps } = req.body;

    try {
        const order = await prisma.ordenTrabajo.findUnique({
            where: { id: Number(orderId) },
            include: { producto: true }
        });

        if (!order) throw new Error('Orden no encontrada');

        let productoId = order.producto_id;

        // If it's a special project without a product, we create a pseudo-product for the route
        if (!productoId) {
            const tempProduct = await prisma.producto.create({
                data: {
                    sku_producto: `AI-PROJ-${order.numero_ot}`,
                    nombre_producto: order.descripcion_proyecto || `Proyecto AI ${order.numero_ot}`,
                    descripcion: 'Generado automáticamente por IA'
                }
            });
            productoId = tempProduct.id;
            
            // Update order with the new product pointer
            await prisma.ordenTrabajo.update({
                where: { id: order.id },
                data: { producto_id: productoId }
            });
        }

        // Create the route and tasks
        await prisma.$transaction(async (tx) => {
            // Remove existing tasks if any? (Maybe safer to just add)
            // For now, we assume we are setting the initial route
            
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const newRuta = await tx.rutaFabricacion.create({
                    data: {
                        producto_id: productoId!,
                        no_operacion: (i + 1) * 10,
                        nombre_operacion: step.nombre_operacion,
                        centro_trabajo: step.centro_trabajo,
                        piezas_por_hora_estimado: step.tiempo_estimado_min ? Math.round(60 / (step.tiempo_estimado_min / 60)) : null // simplistic conversion
                    }
                });

                await tx.tareaProduccion.create({
                    data: {
                        orden_trabajo_id: order.id,
                        ruta_fabricacion_id: newRuta.id,
                        estado_tarea: 'Pendiente'
                    }
                });
            }
        });

        res.json({ message: 'Ruta guardada exitosamente' });
    } catch (error: any) {
        console.error('Error saving route:', error);
        res.status(500).json({ error: error.message || 'Error al guardar la ruta' });
    }
};

export const getAIConfig = async (req: Request, res: Response) => {
    try {
        const config = await prisma.configuracion.findFirst();
        res.json({
            openrouter_api_key: config?.openrouter_api_key || '',
            openrouter_model: config?.openrouter_model || 'google/gemma-3-27b-it:free'
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error fetching AI config' });
    }
};

export const updateAIConfig = async (req: Request, res: Response) => {
    const { openrouter_api_key, openrouter_model } = req.body;
    try {
        let config = await prisma.configuracion.findFirst();
        if (config) {
            config = await prisma.configuracion.update({
                where: { id: config.id },
                data: { openrouter_api_key, openrouter_model }
            });
        } else {
            config = await prisma.configuracion.create({
                data: { openrouter_api_key, openrouter_model }
            });
        }
        res.json({ message: 'AI configuration updated successfully', config });
    } catch (error: any) {
        res.status(500).json({ error: 'Error updating AI config' });
    }
};
