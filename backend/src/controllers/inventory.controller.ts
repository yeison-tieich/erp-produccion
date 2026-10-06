import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary } from '../utils/cloudinary';
import { InventoryService } from '../services/inventory.service';

// ─────────────────────────────────────────────────────────
//  CRUD Básico
// ─────────────────────────────────────────────────────────

export const getMaterials = async (req: Request, res: Response) => {
    try {
        const materials = await prisma.materiaPrima.findMany({
            orderBy: { nombre_mp: 'asc' }
        });
        res.json(materials);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching materials' });
    }
};

export const createMaterial = async (req: Request, res: Response) => {
    try {
        const { espesor, ancho, largo, densidad, peso_unitario, stock_actual, stock_reservado, devoluciones, ...rest } = req.body;
        const initialStock = Number(stock_actual || 0);
        if (!Number.isFinite(initialStock) || initialStock < 0) {
            return res.status(400).json({ error: 'El stock inicial debe ser un número mayor o igual a cero' });
        }
        const material = await prisma.$transaction(async (tx) => {
            const created = await tx.materiaPrima.create({
                data: {
                    ...rest,
                    stock_actual: initialStock,
                    stock_reservado: 0,
                    devoluciones: 0,
                    espesor: espesor ? Number(espesor) : 0,
                    ancho: ancho ? Number(ancho) : 0,
                    largo: largo ? Number(largo) : 0,
                    densidad: densidad ? Number(densidad) : 7.85,
                    peso_unitario: peso_unitario ? Number(peso_unitario) : 0,
                    costo_unitario: req.body.costo_unitario ? Number(req.body.costo_unitario) : 0,
                }
            });
            if (initialStock > 0) {
                await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: created.id,
                        tipo_movimiento: 'SALDO_INICIAL',
                        cantidad: initialStock,
                        referencia_id: 'Alta de material',
                        stock_anterior: 0,
                        stock_posterior: initialStock,
                        usuario_nombre: (req as any).user?.nombre || 'Sistema',
                        observacion: 'Stock inicial al crear el material'
                    }
                });
            }
            return created;
        });
        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error creating material' });
    }
};

export const addStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, referencia_id, imagen_remision_url, cliente_id, observacion } = req.body;
    try {
        const quantity = Number(cantidad);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'La entrada debe tener una cantidad positiva' });
        }
        const result = await prisma.$transaction(async (tx) => {
            const current = await tx.materiaPrima.findUnique({ where: { id: Number(id) } });
            if (!current) throw new Error('Material no encontrado');
            const stockAnterior = Number(current.stock_actual);
            const stockPosterior = stockAnterior + quantity;

            const material = await tx.materiaPrima.update({
                where: { id: Number(id) },
                data: { stock_actual: { increment: quantity } },
            });

            await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: Number(id),
                    tipo_movimiento: 'Ingreso Compra',
                    cantidad: quantity,
                    referencia_id,
                    imagen_remision_url,
                    cliente_id: cliente_id ? Number(cliente_id) : null,
                    stock_anterior: stockAnterior,
                    stock_posterior: stockPosterior,
                    usuario_nombre: (req as any).user?.nombre || 'Sistema',
                    observacion: observacion || `Entrada de stock: ${quantity} unidades`
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

export const adjustStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, referencia_id, motivo } = req.body;
    try {
        const adjustment = Number(cantidad);
        if (!Number.isFinite(adjustment) || adjustment === 0) {
            return res.status(400).json({ error: 'La cantidad del ajuste debe ser un número diferente de cero' });
        }
        if (!motivo || !String(motivo).trim()) {
            return res.status(400).json({ error: 'El motivo del ajuste es obligatorio para conservar trazabilidad' });
        }
        const result = await prisma.$transaction(async (tx) => {
            const current = await tx.materiaPrima.findUnique({ where: { id: Number(id) } });
            if (!current) throw new Error('Material no encontrado');
            const newStock = Number(current.stock_actual) + adjustment;
            if (newStock < Number(current.stock_reservado)) {
                throw new Error('El ajuste dejaría el stock físico por debajo de la cantidad reservada');
            }
            const material = await tx.materiaPrima.update({
                where: { id: Number(id) },
                data: { stock_actual: { increment: adjustment } },
            });
            await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: Number(id),
                    tipo_movimiento: 'Ajuste',
                    cantidad: adjustment,
                    referencia_id: referencia_id || `AJUSTE: ${motivo}`,
                    stock_anterior: Number(current.stock_actual),
                    stock_posterior: newStock,
                    usuario_nombre: (req as any).user?.nombre || 'Sistema',
                    observacion: motivo
                },
            });
            return material;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error ajustando stock' });
    }
};

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
        peso_unitario,
        stock_actual,
        stock_reservado,
        devoluciones
    } = req.body;
    try {
        const stockFields = { stock_actual, stock_reservado, devoluciones };
        for (const [field, value] of Object.entries(stockFields)) {
            if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
                return res.status(400).json({ error: `${field} debe ser un número mayor o igual a cero` });
            }
        }

        const material = await prisma.$transaction(async (tx) => {
            const current = await tx.materiaPrima.findUnique({ where: { id: Number(id) } });
            if (!current) throw new Error('Material no encontrado');

            const nextStock = stock_actual !== undefined ? Number(stock_actual) : Number(current.stock_actual);
            const stockChanged = nextStock !== Number(current.stock_actual);
            const updated = await tx.materiaPrima.update({
                where: { id: Number(id) },
                data: {
                    nombre_mp,
                    categoria_mp,
                    unidad_medida_stock,
                    punto_reorden: Number(punto_reorden),
                    espesor: espesor !== undefined ? Number(espesor) : undefined,
                    ancho: ancho !== undefined ? Number(ancho) : undefined,
                    largo: largo !== undefined ? Number(largo) : undefined,
                    densidad: densidad !== undefined ? Number(densidad) : undefined,
                    peso_unitario: peso_unitario !== undefined ? Number(peso_unitario) : undefined,
                    costo_unitario: req.body.costo_unitario !== undefined ? Number(req.body.costo_unitario) : undefined,
                    stock_actual: stock_actual !== undefined ? nextStock : undefined,
                    stock_reservado: stock_reservado !== undefined ? Number(stock_reservado) : undefined,
                    devoluciones: devoluciones !== undefined ? Number(devoluciones) : undefined,
                }
            });

            if (stockChanged) {
                await tx.movimientoInventarioMP.create({
                    data: {
                        materia_prima_id: Number(id),
                        tipo_movimiento: 'Ajuste maestro',
                        cantidad: nextStock - Number(current.stock_actual),
                        referencia_id: 'Edición desde maestro',
                        stock_anterior: Number(current.stock_actual),
                        stock_posterior: nextStock,
                        usuario_nombre: (req as any).user?.nombre || 'Sistema',
                        observacion: 'Ajuste directo de stock desde el maestro de inventario'
                    }
                });
            }
            return updated;
        });
        res.json(material);
    } catch (error) {
        res.status(500).json({ error: 'Error updating material' });
    }
};

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
            if (movement.tipo_movimiento === 'RESERVA_OT' || movement.tipo_movimiento === 'En proceso' || movement.tipo_movimiento === 'LIBERACION_RESERVA') {
                throw new Error('Las reservas se liberan al cancelar la OT; no se revierten como un movimiento físico.');
            }
            const alreadyReversed = await tx.movimientoInventarioMP.findFirst({
                where: { referencia_id: `REV-${movement.id}` }
            });
            if (alreadyReversed) throw new Error('Este movimiento ya fue revertido');

            const cantidadOriginal = Number(movement.cantidad);
            const cantidadInversa = -cantidadOriginal;
            const current = await tx.materiaPrima.findUnique({ where: { id: movement.materia_prima_id } });
            const stockAnterior = Number(current?.stock_actual || 0);

            await tx.materiaPrima.update({
                where: { id: movement.materia_prima_id },
                data: { stock_actual: { increment: cantidadInversa } }
            });

            const reversal = await tx.movimientoInventarioMP.create({
                data: {
                    materia_prima_id: movement.materia_prima_id,
                    tipo_movimiento: 'Reversión / Devolución',
                    cantidad: cantidadInversa,
                    referencia_id: `REV-${movement.id}`,
                    orden_trabajo_id: movement.orden_trabajo_id,
                    cliente_id: movement.cliente_id,
                    stock_anterior: stockAnterior,
                    stock_posterior: stockAnterior + cantidadInversa,
                    usuario_nombre: (req as any).user?.nombre || 'Sistema',
                    observacion: `Reversión del movimiento #${movement.id}`
                }
            });

            return reversal;
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
                fecha_hora: { gte: firstDayOfMonth }
            }
        });

        res.json({ monthlyMovements: movementsCount });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ error: 'Error fetching inventory stats' });
    }
};

// ─────────────────────────────────────────────────────────
//  Nuevos endpoints del Dashboard + Auditoría
// ─────────────────────────────────────────────────────────

/**
 * GET /api/inventory/all-movements
 * Historial completo de movimientos con paginación y filtros
 */
export const getAllMovements = async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '50', tipo, materia_prima_id, desde, hasta } = req.query;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(200, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (tipo) where.tipo_movimiento = String(tipo);
        if (materia_prima_id) where.materia_prima_id = Number(materia_prima_id);
        if (desde || hasta) {
            where.fecha_hora = {};
            if (desde) where.fecha_hora.gte = new Date(String(desde));
            if (hasta) where.fecha_hora.lte = new Date(String(hasta));
        }

        const [total, movements] = await Promise.all([
            prisma.movimientoInventarioMP.count({ where }),
            prisma.movimientoInventarioMP.findMany({
                where,
                include: {
                    materiaPrima: { select: { nombre_mp: true, sku_mp: true, unidad_medida_stock: true } },
                    ordenTrabajo: { select: { numero_ot: true, estado_ot: true } }
                },
                orderBy: { fecha_hora: 'desc' },
                skip,
                take: limitNum
            })
        ]);

        res.json({ total, page: pageNum, limit: limitNum, movements });
    } catch (error) {
        console.error('getAllMovements error:', error);
        res.status(500).json({ error: 'Error obteniendo historial de movimientos' });
    }
};

/**
 * GET /api/inventory/dashboard-stock
 * Datos agregados para el dashboard: KPIs + serie para gráfico
 */
export const getDashboardStock = async (req: Request, res: Response) => {
    try {
        const { categoria } = req.query;

        const where: any = {};
        if (categoria) where.categoria_mp = String(categoria);

        const materials = await prisma.materiaPrima.findMany({ where, orderBy: { nombre_mp: 'asc' } });

        const stockTotal = materials.reduce((s, m) => s + Number(m.stock_actual), 0);
        const stockReservado = materials.reduce((s, m) => s + Number(m.stock_reservado), 0);
        const stockDisponible = stockTotal - stockReservado;
        const totalReferencias = materials.length;
        const bajoMinimo = materials.filter(m => {
            const disp = Number(m.stock_actual) - Number(m.stock_reservado);
            return disp <= Number(m.punto_reorden) && disp > 0;
        }).length;
        const agotadas = materials.filter(m => {
            const disp = Number(m.stock_actual) - Number(m.stock_reservado);
            return disp <= 0;
        }).length;

        // Últimos movimientos
        const ultimosMovimientos = await prisma.movimientoInventarioMP.findMany({
            take: 10,
            orderBy: { fecha_hora: 'desc' },
            include: {
                materiaPrima: { select: { nombre_mp: true, sku_mp: true } },
                ordenTrabajo: { select: { numero_ot: true } }
            }
        });

        // Serie para gráfico de barras apiladas
        const chartData = materials.map(m => {
            const disp = Math.max(0, Number(m.stock_actual) - Number(m.stock_reservado));
            const res = Number(m.stock_reservado);
            return {
                nombre: m.nombre_mp.length > 22 ? m.nombre_mp.slice(0, 22) + '…' : m.nombre_mp,
                sku: m.sku_mp,
                disponible: disp,
                reservado: res,
                total: Number(m.stock_actual),
                puntoReorden: Number(m.punto_reorden),
                unidad: m.unidad_medida_stock,
                estado: disp <= 0 ? 'AGOTADO' : disp <= Number(m.punto_reorden) ? 'BAJO_MINIMO' : 'NORMAL'
            };
        });

        res.json({
            kpis: { stockTotal, stockReservado, stockDisponible, totalReferencias, bajoMinimo, agotadas },
            chartData,
            ultimosMovimientos
        });
    } catch (error) {
        console.error('getDashboardStock error:', error);
        res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
    }
};

/**
 * GET /api/inventory/consistency
 * Verificador de integridad del inventario
 */
export const getInventoryConsistency = async (req: Request, res: Response) => {
    try {
        const report = await InventoryService.checkInventoryConsistency();
        res.json(report);
    } catch (error) {
        console.error('getInventoryConsistency error:', error);
        res.status(500).json({ error: 'Error verificando consistencia' });
    }
};

/**
 * GET /api/inventory/audit-completed-ots
 * OTs completadas para revisión de consumos
 */
export const getCompletedOTsAudit = async (req: Request, res: Response) => {
    try {
        const audit = await InventoryService.getCompletedOTsAudit();
        res.json(audit);
    } catch (error) {
        console.error('getCompletedOTsAudit error:', error);
        res.status(500).json({ error: 'Error obteniendo auditoría de OTs' });
    }
};

/**
 * POST /api/inventory/reconcile-ot/:id
 * Reconciliar una OT inconsistente (consumir materiales pendientes)
 */
export const reconcileOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userName = (req as any).user?.nombre || 'Administrador';
    try {
        const result = await InventoryService.reconcileOrder(Number(id), userName);
        res.json(result);
    } catch (error: any) {
        console.error('reconcileOrder error:', error);
        res.status(500).json({ error: error.message || 'Error reconciliando OT' });
    }
};

/**
 * POST /api/inventory/clean-stranded-reservations
 * Limpiar reservas huérfanas en OTs canceladas/completadas
 */
export const cleanStrandedReservations = async (req: Request, res: Response) => {
    const userName = (req as any).user?.nombre || 'Administrador';
    try {
        const result = await InventoryService.cleanStrandedReservations(userName);
        res.json(result);
    } catch (error: any) {
        console.error('cleanStrandedReservations error:', error);
        res.status(500).json({ error: error.message || 'Error limpiando reservas huérfanas' });
    }
};

/**
 * GET /api/inventory/reservations
 * Reservas activas asociadas a OTs en curso
 */
export const getActiveReservations = async (req: Request, res: Response) => {
    try {
        const reservations = await prisma.movimientoInventarioMP.findMany({
            where: {
                tipo_movimiento: { in: ['RESERVA_OT', 'En proceso'] },
                ordenTrabajo: {
                    estado_ot: { notIn: ['Completada', 'Cancelada', 'Cerrada'] }
                }
            },
            include: {
                materiaPrima: { select: { nombre_mp: true, sku_mp: true, unidad_medida_stock: true } },
                ordenTrabajo: {
                    select: {
                        numero_ot: true,
                        estado_ot: true,
                        cliente: true,
                        producto: { select: { nombre_producto: true } }
                    }
                }
            },
            orderBy: { fecha_hora: 'desc' }
        });

        res.json(reservations);
    } catch (error) {
        console.error('getActiveReservations error:', error);
        res.status(500).json({ error: 'Error obteniendo reservas activas' });
    }
};
