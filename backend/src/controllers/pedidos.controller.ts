
import { Request, Response } from 'express';
import prisma from '../prisma';
import * as XLSX from 'xlsx';

const parseSpanishNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if ((str.match(/\./g) || []).length > 1 && !str.includes(',')) {
        str = str.replace(/\./g, '');
    } else if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const parseSpanishDate = (val: any) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    
    // Standard JS Date parsing
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    
    try {
        const months: any = {
            enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
            julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        };
        const str = String(val).toLowerCase();
        
        // Match "lunes, 5 de enero de 2026" or similar
        const parts = str.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/);
        if (parts) {
            const day = parseInt(parts[1]);
            const month = months[parts[2]];
            const year = parseInt(parts[3]);
            if (month !== undefined) return new Date(year, month, day);
        }
        
        // Match "16/01/2026"
        const slashParts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashParts) {
            return new Date(parseInt(slashParts[3]), parseInt(slashParts[2]) - 1, parseInt(slashParts[1]));
        }
    } catch (e) {}
    return null;
};

export const getPedidos = async (req: Request, res: Response) => {
    try {
        const { cliente, estado, search } = req.query;
        const where: any = {};
        if (cliente && cliente !== 'ALL') where.cliente = String(cliente);
        if (estado && estado !== 'ALL') where.estado = String(estado);
        if (search) {
            where.OR = [
                { orden_compra: { contains: String(search) } },
                { referencia: { contains: String(search) } },
                { codigo: { contains: String(search) } },
                { descripcion: { contains: String(search) } },
                { cliente: { contains: String(search) } },
            ];
        }

        const pedidos = await prisma.pedido.findMany({
            where,
            include: { producto: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(pedidos);
    } catch (error) {
        console.error('getPedidos error:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
};

export const createPedido = async (req: Request, res: Response) => {
    try {
        const {
            cliente,
            orden_compra,
            fecha_emision,
            codigo,
            referencia,
            posicion,
            descripcion,
            cantidad,
            cantidad_fabricada,
            cantidad_despachada,
            fecha_entrega,
            estado,
            precio_unitario,
            valor_total,
            producto_id
        } = req.body;

        let finalProductoId = producto_id ? Number(producto_id) : null;
        let finalInventario = 0;

        if ((codigo || referencia) && !finalProductoId) {
            const product = await prisma.producto.findFirst({
                where: { 
                    OR: [
                        { sku_producto: codigo || '' },
                        { sku_producto: referencia || '' }
                    ]
                }
            });
            if (product) {
                finalProductoId = product.id;
                finalInventario = product.stock_actual;
            }
        }

        const cantNum = cantidad !== undefined ? Number(cantidad) : 0;
        const despNum = cantidad_despachada !== undefined ? Number(cantidad_despachada) : 0;

        const pedido = await prisma.pedido.create({
            data: {
                cliente,
                orden_compra,
                codigo,
                referencia,
                posicion,
                descripcion,
                cantidad: cantNum,
                cantidad_fabricada: Number(cantidad_fabricada || 0),
                cantidad_en_inventario: finalInventario,
                cantidad_despachada: despNum,
                saldo_pendiente: cantNum - despNum,
                fecha_entrega: fecha_entrega || null,
                estado: estado || 'PENDIENTE',
                precio_unitario: precio_unitario !== undefined ? Number(precio_unitario) : 0,
                valor_total: valor_total !== undefined ? Number(valor_total) : (cantNum * Number(precio_unitario || 0)),
                fecha_emision: fecha_emision ? new Date(fecha_emision) : null,
                producto_id: finalProductoId
            }
        });
        res.status(201).json(pedido);
    } catch (error) {
        console.error('createPedido error:', error);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
};

export const updatePedido = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            cliente,
            orden_compra,
            fecha_emision,
            codigo,
            referencia,
            posicion,
            descripcion,
            cantidad,
            cantidad_fabricada,
            cantidad_en_inventario,
            cantidad_despachada,
            fecha_entrega,
            estado,
            precio_unitario,
            valor_total,
            producto_id
        } = req.body;

        const current = await prisma.pedido.findUnique({ where: { id: Number(id) } });
        if (!current) return res.status(404).json({ error: 'Pedido no encontrado' });

        const cantReq = cantidad !== undefined ? Number(cantidad) : (current.cantidad || 0);
        const cantDesp = cantidad_despachada !== undefined ? Number(cantidad_despachada) : (current.cantidad_despachada || 0);
        const saldoPendiente = cantReq - cantDesp;

        const pedido = await prisma.pedido.update({
            where: { id: Number(id) },
            data: {
                cliente,
                orden_compra,
                fecha_emision: fecha_emision ? new Date(fecha_emision) : undefined,
                codigo,
                referencia,
                posicion,
                descripcion,
                cantidad: cantReq,
                cantidad_fabricada: cantidad_fabricada !== undefined ? Number(cantidad_fabricada) : undefined,
                cantidad_en_inventario: cantidad_en_inventario !== undefined ? Number(cantidad_en_inventario) : undefined,
                cantidad_despachada: cantDesp,
                saldo_pendiente: saldoPendiente,
                fecha_entrega,
                estado,
                precio_unitario: precio_unitario !== undefined ? Number(precio_unitario) : undefined,
                valor_total: valor_total !== undefined ? Number(valor_total) : (cantReq * (precio_unitario !== undefined ? Number(precio_unitario) : Number(current.precio_unitario || 0))),
                producto_id: producto_id ? Number(producto_id) : undefined
            }
        });
        res.json(pedido);
    } catch (error) {
        console.error('updatePedido error:', error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
};

export const deletePedido = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.pedido.delete({ where: { id: Number(id) } });
        res.json({ message: 'Pedido eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar pedido' });
    }
};

export const importPedidosExcel = async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);

        const processed = [];
        for (const row of data) {
            const pedidoData = {
                cliente: String(row.cliente || row.Cliente || ''),
                orden_compra: String(row.orden_compra || row.Orden_Compra || row['Orden Compra'] || row.oc || row.orden_compra || ''),
                fecha_emision: parseSpanishDate(row.fecha_emision || row['Fecha Emision']),
                codigo: String(row.codigo || row.Codigo || ''),
                referencia: String(row.referencia || row.Referencia || ''),
                posicion: String(row.posicion || row.Posicion || ''),
                descripcion: String(row.descripcion || row.Descripcion || ''),
                cantidad: parseSpanishNumber(row.cantidad || row.Cantidad || 0),
                fecha_entrega: String(row.fecha_entrega || row['Fecha Entrega'] || row.entrega || ''),
                estado: String(row.estado || row.Estado || 'PENDIENTE'),
                precio_unitario: parseSpanishNumber(row.precio_unitario || row['Precio Unitario'] || 0),
                valor_total: parseSpanishNumber(row.valor_total || row['Valor Total'] || 0),
            };

            const searchSku = pedidoData.codigo || pedidoData.referencia;
            const product = searchSku ? await prisma.producto.findFirst({ where: { sku_producto: searchSku } }) : null;

            const upsertData = {
                ...pedidoData,
                producto_id: product?.id || null,
                cantidad_en_inventario: product?.stock_actual || 0,
                saldo_pendiente: pedidoData.cantidad - (row.cantidad_despachada || 0),
            };

            const existing = await prisma.pedido.findFirst({
                where: {
                    AND: [
                        { orden_compra: upsertData.orden_compra },
                        { OR: [
                            { codigo: upsertData.codigo || undefined },
                            { referencia: upsertData.referencia || undefined }
                        ]},
                        { posicion: upsertData.posicion || undefined }
                    ]
                }
            });

            if (existing) {
                const updated = await prisma.pedido.update({ where: { id: existing.id }, data: upsertData });
                processed.push(updated);
            } else {
                const created = await prisma.pedido.create({ data: upsertData });
                processed.push(created);
            }
        }
        res.json({ message: `Se procesaron ${processed.length} pedidos`, data: processed });
    } catch (error) {
        console.error('importPedidosExcel error:', error);
        res.status(500).json({ error: 'Error al importar Excel: ' + (error instanceof Error ? error.message : String(error)) });
    }
};

export const syncPedidosAutomation = async (req: Request, res: Response) => {
    try {
        const pedidos = await prisma.pedido.findMany();
        const results = [];
        for (const pedido of pedidos) {
            let invCount = pedido.cantidad_en_inventario || 0;
            const searchSku = pedido.codigo || pedido.referencia;
            if (searchSku) {
                const product = await prisma.producto.findFirst({ where: { sku_producto: searchSku } });
                if (product) invCount = product.stock_actual;
            }
            const matchingOTs = await prisma.ordenTrabajo.findMany({
                where: {
                    orden_compra_cliente: pedido.orden_compra || '',
                    OR: [
                        { producto: { sku_producto: pedido.codigo || '' } },
                        { producto: { sku_producto: pedido.referencia || '' } },
                        { descripcion_proyecto: { contains: pedido.codigo || '' } },
                        { descripcion_proyecto: { contains: pedido.referencia || '' } }
                    ]
                },
                include: { tareas: { include: { rutaFabricacion: true } } }
            });
            let fabCount = 0;
            for (const ot of matchingOTs) {
                if (ot.tareas.length > 0) {
                    const maxOp = Math.max(...ot.tareas.map(t => t.rutaFabricacion.no_operacion));
                    const lastTasks = ot.tareas.filter(t => t.rutaFabricacion.no_operacion === maxOp);
                    fabCount += lastTasks.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
                }
            }
            let estado = pedido.estado;
            const saldo = (pedido.cantidad || 0) - (pedido.cantidad_despachada || 0);
            if ((pedido.cantidad_despachada || 0) >= (pedido.cantidad || 0) && (pedido.cantidad || 0) > 0) {
                estado = 'DESPACHADO COMPLETO';
            } else if ((pedido.cantidad_despachada || 0) > 0) {
                estado = 'PARCIALMENTE DESPACHADO';
            } else if (invCount >= saldo && saldo > 0) {
                estado = 'EN INVENTARIO';
            } else if (fabCount > 0) {
                estado = 'EN PRODUCCIÓN';
            }
            const updated = await prisma.pedido.update({
                where: { id: pedido.id },
                data: {
                    cantidad_fabricada: fabCount,
                    cantidad_en_inventario: invCount,
                    saldo_pendiente: saldo,
                    estado: estado
                }
            });
            results.push(updated);
        }
        res.json({ message: 'Sincronización completada', count: results.length });
    } catch (error) {
        console.error('syncPedidosAutomation error:', error);
        res.status(500).json({ error: 'Error en la sincronización automática' });
    }
};

export const generateOTFromPedido = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad_fabricar, fecha_entrega_req } = req.body;

    try {
        const pedido = await prisma.pedido.findUnique({
            where: { id: Number(id) },
            include: { producto: true }
        });

        if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
        
        // 1. Validar que la referencia exista en el Catálogo de Productos
        if (!pedido.producto_id) {
            return res.status(400).json({ error: 'El pedido no tiene un producto vinculado en el catálogo' });
        }

        const producto = await prisma.producto.findUnique({
            where: { id: pedido.producto_id },
            include: { 
                rutas: { orderBy: { no_operacion: 'asc' } },
                listaMateriales: { include: { materiaPrima: true } }
            }
        });

        if (!producto) return res.status(404).json({ error: 'Producto no encontrado en el catálogo' });

        // 2. Validar que tenga ruta de producción definida y datos completos
        if (producto.rutas.length === 0) {
            return res.status(400).json({ error: 'El producto no tiene configuración completa para producción (sin ruta de fabricación)' });
        }

        // Verificar si faltan tiempos estándar o nombres de operación
        const incompleteRuta = producto.rutas.some(r => !r.nombre_operacion || (!r.piezas_por_hora_estimado && !r.tiempo_estandar));
        if (incompleteRuta) {
            return res.status(400).json({ error: 'El producto no tiene configuración completa para producción (datos de ruta incompletos)' });
        }

        // 3. Validar disponibilidad de materia prima (Opcional: generar alerta si no hay)
        let materialAlerts = [];
        const cantNum = Number(cantidad_fabricar || pedido.saldo_pendiente || 0);

        for (const item of producto.listaMateriales) {
            let reqQty = Number(item.cantidad_requerida) * cantNum;
            if (producto.piezas_lamina_4x8) {
                const pz = Number(producto.piezas_lamina_4x8);
                if (pz > 0) reqQty = Math.ceil(cantNum / pz);
            }
            const available = Number(item.materiaPrima.stock_actual) - Number(item.materiaPrima.stock_reservado);
            if (available < reqQty) {
                materialAlerts.push(`${item.materiaPrima.nombre_mp}: requiere ${reqQty}, disponible ${available}`);
            }
        }

        // 4. CREACIÓN AUTOMÁTICA DE LA OT
        const result = await prisma.$transaction(async (tx) => {
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 99);
            const numero_ot = `OT-PED-${timestamp}-${random}`;

            const newOT = await tx.ordenTrabajo.create({
                data: {
                    numero_ot,
                    tipo_orden: 'PRODUCCION_SERIE',
                    producto_id: producto.id,
                    pedido_id: pedido.id,
                    cantidad_pedido: pedido.cantidad || 0,
                    cantidad_fabricar: cantNum,
                    cliente: pedido.cliente,
                    orden_compra_cliente: pedido.orden_compra,
                    fecha_entrega_req: fecha_entrega_req ? new Date(fecha_entrega_req) : null,
                    prioridad: 'ESTANDAR',
                    estado_ot: 'Pendiente',
                    // Herencia de campos técnicos
                    acabado: producto.acabado,
                    ancho_tira: producto.ancho_tira,
                    piezas_lamina: producto.piezas_lamina_4x8,
                    imagen_url: producto.imagen_url,
                    precio_venta: producto.precio_venta
                }
            });

            // c) Heredar ruta de producción (operaciones, tiempos)
            await tx.tareaProduccion.createMany({
                data: producto.rutas.map(ruta => ({
                    orden_trabajo_id: newOT.id,
                    ruta_fabricacion_id: ruta.id,
                    estado_tarea: 'Pendiente'
                }))
            });

            // d) Reservar materiales
            for (const item of producto.listaMateriales) {
                let reserveQty = Number(item.cantidad_requerida) * cantNum;
                if (producto.piezas_lamina_4x8) {
                    const pz = Number(producto.piezas_lamina_4x8);
                    if (pz > 0) reserveQty = Math.ceil(cantNum / pz);
                }

                await tx.materiaPrima.update({
                    where: { id: item.materia_prima_id },
                    data: { stock_reservado: { increment: reserveQty } }
                });

                await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: item.materia_prima_id,
                        tipo_movimiento: 'En proceso',
                        cantidad: reserveQty,
                        referencia_id: numero_ot,
                        orden_trabajo_id: newOT.id
                    }
                });
            }

            // e) Actualizar estado del pedido
            await tx.pedido.update({
                where: { id: pedido.id },
                data: { estado: 'EN PRODUCCIÓN' }
            });

            return { ot: newOT, materialAlerts };
        });

        res.json(result);
    } catch (error) {
        console.error('generateOTFromPedido error:', error);
        res.status(500).json({ error: 'Error al generar Orden de Trabajo' });
    }
};
