import { Request, Response } from 'express';
import prisma from '../prisma';

// Helper to log Quality Audit Trail
async function logQualityAudit(params: {
    usuario_id?: number | null;
    usuario_nombre: string;
    accion: string;
    modulo: string;
    entidad: string;
    entidad_id: number;
    valor_anterior?: any;
    valor_nuevo?: any;
    detalles?: string;
    ip_origen?: string;
}) {
    try {
        await prisma.auditoriaRegistroCalidad.create({
            data: {
                usuario_id: params.usuario_id || null,
                usuario_nombre: params.usuario_nombre || 'Sistema',
                accion: params.accion,
                modulo: params.modulo,
                entidad: params.entidad,
                entidad_id: params.entidad_id,
                valor_anterior: params.valor_anterior ? JSON.stringify(params.valor_anterior) : null,
                valor_nuevo: params.valor_nuevo ? JSON.stringify(params.valor_nuevo) : null,
                detalles: params.detalles || null,
                ip_origen: params.ip_origen || null,
            }
        });
    } catch (e) {
        console.error('[QualityAuditLog Error]:', e);
    }
}

// ----------------------------------------------------
// 1. DASHBOARD DE CALIDAD
// ----------------------------------------------------
export const getQualityDashboard = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        // 1. OTs Metrics
        const ordenes = await prisma.ordenTrabajo.findMany({
            select: {
                id: true,
                numero_ot: true,
                estado_ot: true,
                estado_calidad: true,
                cantidad_fabricar: true,
                cantidad_aprobada: true,
                cantidad_rechazada: true,
                cantidad_retrabajada: true,
            }
        });

        const otEnProceso = ordenes.filter(o => o.estado_ot === 'En Progreso' || o.estado_ot === 'Pendiente').length;
        const otPendientesInspeccion = ordenes.filter(o => o.estado_calidad === 'Pendiente' || o.estado_calidad === 'En Inspección').length;
        const otAprobadas = ordenes.filter(o => o.estado_calidad === 'Aprobada' || o.estado_calidad === 'Liberada').length;
        const otRechazadas = ordenes.filter(o => o.estado_calidad === 'Rechazada').length;
        const otRetenidas = ordenes.filter(o => o.estado_calidad === 'Retenida').length;

        // 2. Inspections Metrics
        const totalInspecciones = await prisma.inspeccionCalidad.count();
        const inspeccionesAprobadas = await prisma.inspeccionCalidad.count({ where: { estado_resultado: 'APROBADO' } });
        const inspeccionesRechazadas = await prisma.inspeccionCalidad.count({ where: { estado_resultado: 'RECHAZADO' } });
        
        const porcentajeAprobacion = totalInspecciones > 0 ? Number(((inspeccionesAprobadas / totalInspecciones) * 100).toFixed(1)) : 100;
        const porcentajeRechazo = totalInspecciones > 0 ? Number(((inspeccionesRechazadas / totalInspecciones) * 100).toFixed(1)) : 0;

        // Piezas inspeccionadas vs defectuosas para cálculo de PPM
        const mediciones = await prisma.medicionInspeccion.findMany({ select: { cumple: true } });
        const totalMediciones = mediciones.length;
        const medicionesMalas = mediciones.filter(m => !m.cumple).length;
        const ppmDefectos = totalMediciones > 0 ? Math.round((medicionesMalas / totalMediciones) * 1000000) : 0;

        // 3. No Conformidades (NC)
        const totalNC = await prisma.noConformidad.count();
        const ncAbiertas = await prisma.noConformidad.count({
            where: { estado: { in: ['ABIERTA', 'EN_ANALISIS', 'EN_ACCION', 'VERIFICADA'] } }
        });
        const ncVencidas = await prisma.noConformidad.count({
            where: {
                estado: { notIn: ['CERRADA', 'ANULADA'] },
                fecha_limite: { lt: now }
            }
        });

        // 4. Acciones Correctivas (CAPA)
        const acAbiertas = await prisma.accionCorrectiva.count({
            where: { estado: { in: ['ABIERTA', 'EN_PROCESO', 'PENDIENTE_VERIFICACION'] } }
        });
        const acVencidas = await prisma.accionCorrectiva.count({
            where: {
                estado: { notIn: ['CERRADA', 'EFICAZ'] },
                fecha_limite: { lt: now }
            }
        });

        // 5. Reclamos y Devoluciones
        const totalReclamos = await prisma.reclamoCliente.count();
        const reclamosAbiertos = await prisma.reclamoCliente.count({ where: { estado: 'ABIERTO' } });
        const devoluciones = await prisma.reclamoCliente.count({ where: { es_devolucion: true } });

        // 6. Costo de No Calidad
        const costosNoCalidad = await prisma.costoNoCalidad.groupBy({
            by: ['categoria'],
            _sum: { monto: true }
        });
        const costosNoCalidadPorCategoria = {
            FALLA_INTERNA: 0,
            FALLA_EXTERNA: 0,
            PREVENCION_EVALUACION: 0
        };
        costosNoCalidad.forEach(item => {
            costosNoCalidadPorCategoria[item.categoria] = Number(item._sum.monto || 0);
        });
        const costoNoCalidadTotal = Object.values(costosNoCalidadPorCategoria).reduce((sum, cost) => sum + cost, 0);
        const costosNoCalidadTendencia = await prisma.costoNoCalidad.findMany({
            select: { categoria: true, monto: true, fecha: true },
            orderBy: { fecha: 'asc' }
        });

        // 7. Gráficos & Distribuciones
        // Defectos por Máquina
        const defectosPorMaquinaRaw = await prisma.noConformidad.findMany({
            where: { maquina_id: { not: null } },
            include: { maquina: { select: { codigo: true, nombre: true } } }
        });
        const machineMap: Record<string, number> = {};
        defectosPorMaquinaRaw.forEach(nc => {
            const name = nc.maquina?.codigo || nc.maquina?.nombre || 'Desconocida';
            machineMap[name] = (machineMap[name] || 0) + 1;
        });
        const defectosPorMaquina = Object.entries(machineMap).map(([name, count]) => ({ name, count }));

        // Defectos por Tipo
        const defectosPorTipoRaw = await prisma.noConformidad.groupBy({
            by: ['tipo_defecto'],
            _count: { id: true }
        });
        const defectosPorTipo = defectosPorTipoRaw.map(d => ({ name: d.tipo_defecto, count: d._count.id }));

        // Defectos por Proveedor
        const defectosPorProveedorRaw = await prisma.noConformidad.findMany({
            where: { proveedor_id: { not: null } },
            include: { proveedor: { select: { nombre: true } } }
        });
        const provMap: Record<string, number> = {};
        defectosPorProveedorRaw.forEach(nc => {
            const name = nc.proveedor?.nombre || 'Proveedor';
            provMap[name] = (provMap[name] || 0) + 1;
        });
        const defectosPorProveedor = Object.entries(provMap).map(([name, count]) => ({ name, count }));

        // Reclamos por Cliente
        const reclamosPorClienteRaw = await prisma.reclamoCliente.findMany({
            include: { cliente: { select: { nombre: true } } }
        });
        const clientMap: Record<string, number> = {};
        reclamosPorClienteRaw.forEach(rec => {
            const name = rec.cliente?.nombre || 'Cliente';
            clientMap[name] = (clientMap[name] || 0) + 1;
        });
        const reclamosPorCliente = Object.entries(clientMap).map(([name, count]) => ({ name, count }));

        // Tendencia mensual de NC (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const ncsRecientes = await prisma.noConformidad.findMany({
            where: { fecha: { gte: sixMonthsAgo } },
            select: { fecha: true }
        });

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyTrendMap: Record<string, number> = {};

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            monthlyTrendMap[key] = 0;
        }

        ncsRecientes.forEach(nc => {
            const d = new Date(nc.fecha);
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (monthlyTrendMap[key] !== undefined) {
                monthlyTrendMap[key]++;
            }
        });

        const tendenciaMensual = Object.entries(monthlyTrendMap).map(([mes, count]) => ({ mes, count }));

        res.json({
            metricas: {
                otEnProceso,
                otPendientesInspeccion,
                otAprobadas,
                otRechazadas,
                otRetenidas,
                totalInspecciones,
                porcentajeAprobacion,
                porcentajeRechazo,
                ppmDefectos,
                totalNC,
                ncAbiertas,
                ncVencidas,
                acAbiertas,
                acVencidas,
                totalReclamos,
                reclamosAbiertos,
                devoluciones,
                costoNoCalidadTotal,
                costosNoCalidadPorCategoria,
                costosNoCalidadTendencia: costosNoCalidadTendencia.map(cost => ({
                    categoria: cost.categoria,
                    monto: Number(cost.monto),
                    fecha: cost.fecha
                }))
            },
            graficos: {
                defectosPorMaquina,
                defectosPorTipo,
                defectosPorProveedor,
                reclamosPorCliente,
                tendenciaMensual
            }
        });
    } catch (error: any) {
        console.error('[getQualityDashboard Error]:', error);
        res.status(500).json({ error: 'Error al generar dashboard de calidad', details: error.message });
    }
};

// ----------------------------------------------------
// 2. PLANES DE CONTROL & CRITERIOS DE INSPECCIÓN
// ----------------------------------------------------
export const getControlPlans = async (req: Request, res: Response) => {
    try {
        const { producto_id } = req.query;
        const where: any = {};
        if (producto_id) where.producto_id = Number(producto_id);

        const plans = await prisma.planControl.findMany({
            where,
            include: {
                producto: { select: { id: true, nombre_producto: true, sku_producto: true, plano_pdf_url: true } },
                caracteristicas: { orderBy: { secuencia: 'asc' } },
                _count: { select: { inspecciones: true } }
            },
            orderBy: { id: 'desc' }
        });
        res.json(plans);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener planes de control', details: error.message });
    }
};

export const getControlPlanById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const plan = await prisma.planControl.findUnique({
            where: { id: Number(id) },
            include: {
                producto: { select: { id: true, nombre_producto: true, sku_producto: true, plano_pdf_url: true } },
                caracteristicas: { orderBy: { secuencia: 'asc' } }
            }
        });
        if (!plan) return res.status(404).json({ error: 'Plan de control no encontrado' });
        res.json(plan);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener plan de control', details: error.message });
    }
};

export const createControlPlan = async (req: Request, res: Response) => {
    try {
        const { producto_id, codigo, nombre, version, notas, caracteristicas } = req.body;
        const plan = await prisma.planControl.create({
            data: {
                producto_id: Number(producto_id),
                codigo: codigo || `PC-${Date.now().toString().slice(-6)}`,
                nombre,
                version: version || '1.0',
                notas: notas || null,
                caracteristicas: caracteristicas && caracteristicas.length > 0 ? {
                    create: caracteristicas.map((c: any, index: number) => ({
                        secuencia: c.secuencia || (index + 1) * 10,
                        caracteristica: c.caracteristica,
                        cota_nominal: c.cota_nominal !== undefined && c.cota_nominal !== '' ? Number(c.cota_nominal) : null,
                        tolerancia_min: c.tolerancia_min !== undefined && c.tolerancia_min !== '' ? Number(c.tolerancia_min) : null,
                        tolerancia_max: c.tolerancia_max !== undefined && c.tolerancia_max !== '' ? Number(c.tolerancia_max) : null,
                        unidad: c.unidad || 'mm',
                        instrumento: c.instrumento || 'Calibrador',
                        metodo_medicion: c.metodo_medicion || null,
                        frecuencia: c.frecuencia || '100%',
                        criterio_aceptacion: c.criterio_aceptacion || 'Tolerancia plano',
                        es_critica: Boolean(c.es_critica)
                    }))
                } : undefined
            },
            include: { caracteristicas: true }
        });
        res.status(201).json(plan);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear plan de control', details: error.message });
    }
};

export const updateControlPlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, version, notas, activo, caracteristicas } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            await tx.planControl.update({
                where: { id: Number(id) },
                data: {
                    nombre,
                    version,
                    notas,
                    activo: activo !== undefined ? Boolean(activo) : undefined
                }
            });

            if (caracteristicas && Array.isArray(caracteristicas)) {
                await tx.caracteristicaControl.deleteMany({ where: { plan_control_id: Number(id) } });
                await tx.caracteristicaControl.createMany({
                    data: caracteristicas.map((c: any, index: number) => ({
                        plan_control_id: Number(id),
                        secuencia: c.secuencia || (index + 1) * 10,
                        caracteristica: c.caracteristica,
                        cota_nominal: c.cota_nominal !== undefined && c.cota_nominal !== '' ? Number(c.cota_nominal) : null,
                        tolerancia_min: c.tolerancia_min !== undefined && c.tolerancia_min !== '' ? Number(c.tolerancia_min) : null,
                        tolerancia_max: c.tolerancia_max !== undefined && c.tolerancia_max !== '' ? Number(c.tolerancia_max) : null,
                        unidad: c.unidad || 'mm',
                        instrumento: c.instrumento || 'Calibrador',
                        metodo_medicion: c.metodo_medicion || null,
                        frecuencia: c.frecuencia || '100%',
                        criterio_aceptacion: c.criterio_aceptacion || 'Cumple cota',
                        es_critica: Boolean(c.es_critica)
                    }))
                });
            }
            return tx.planControl.findUnique({
                where: { id: Number(id) },
                include: { caracteristicas: { orderBy: { secuencia: 'asc' } } }
            });
        });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar plan de control', details: error.message });
    }
};

export const deleteControlPlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.planControl.delete({ where: { id: Number(id) } });
        res.json({ message: 'Plan de control eliminado' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al eliminar plan de control', details: error.message });
    }
};

// ----------------------------------------------------
// 3. INSPECCIONES DE CALIDAD & MEDICIONES
// ----------------------------------------------------
export const getInspections = async (req: Request, res: Response) => {
    try {
        const { orden_trabajo_id, tipo, estado_resultado, proveedor_id } = req.query;
        const where: any = {};
        if (orden_trabajo_id) where.orden_trabajo_id = Number(orden_trabajo_id);
        if (tipo) where.tipo = String(tipo);
        if (estado_resultado) where.estado_resultado = String(estado_resultado);
        if (proveedor_id) where.proveedor_id = Number(proveedor_id);

        const inspections = await prisma.inspeccionCalidad.findMany({
            where,
            include: {
                ordenTrabajo: { select: { id: true, numero_ot: true, estado_ot: true, estado_calidad: true } },
                producto: { select: { id: true, nombre_producto: true, sku_producto: true, plano_pdf_url: true } },
                proveedor: { select: { id: true, nombre: true } },
                cliente: { select: { id: true, nombre: true } },
                maquina: { select: { id: true, codigo: true, nombre: true } },
                inspector: { select: { id: true, nombre: true, cargo: true } },
                operario: { select: { id: true, nombre: true } },
                mediciones: true,
                _count: { select: { noConformidades: true } }
            },
            orderBy: { id: 'desc' }
        });
        res.json(inspections);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener inspecciones', details: error.message });
    }
};

export const getInspectionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const inspection = await prisma.inspeccionCalidad.findUnique({
            where: { id: Number(id) },
            include: {
                ordenTrabajo: true,
                producto: { include: { planesControl: { include: { caracteristicas: true } } } },
                proveedor: true,
                cliente: true,
                maquina: true,
                inspector: true,
                operario: true,
                planControl: { include: { caracteristicas: true } },
                mediciones: { include: { caracteristica: true } },
                noConformidades: true
            }
        });
        if (!inspection) return res.status(404).json({ error: 'Inspección no encontrada' });
        res.json(inspection);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener inspección', details: error.message });
    }
};

export const createInspection = async (req: Request, res: Response) => {
    try {
        const {
            tipo,
            orden_trabajo_id,
            producto_id,
            proveedor_id,
            cliente_id,
            maquina_id,
            personal_id,
            operario_id,
            plan_control_id,
            lote,
            cantidad_inspeccionada,
            cantidad_aprobada,
            cantidad_rechazada,
            observaciones,
            evidencias_url,
            mediciones
        } = req.body;

        const user = (req as any).user;
        const measurementsInput = Array.isArray(mediciones) ? mediciones : [];
        const measurementInstrumentIds = measurementsInput.map((measurement: any) => Number(measurement.instrumento_id));
        if (measurementsInput.some((measurement: any) => !Number.isInteger(Number(measurement.instrumento_id)) || Number(measurement.instrumento_id) <= 0)) {
            return res.status(400).json({ error: 'Cada medición debe usar un instrumento registrado y calibrado vigente.' });
        }
        const uniqueInstrumentIds = [...new Set(measurementInstrumentIds)];
        const measurementInstruments = uniqueInstrumentIds.length
            ? await prisma.instrumentoMedicion.findMany({ where: { id: { in: uniqueInstrumentIds } } })
            : [];
        const instrumentById = new Map(measurementInstruments.map(instrument => [instrument.id, instrument]));
        const todayUtc = new Date().toISOString().slice(0, 10);
        for (const instrumentId of uniqueInstrumentIds) {
            const instrument = instrumentById.get(instrumentId);
            if (!instrument || !instrument.activo) {
                return res.status(400).json({ error: `El instrumento ${instrumentId} no existe o está inactivo.` });
            }
            if (instrument.fecha_vencimiento.toISOString().slice(0, 10) < todayUtc) {
                return res.status(400).json({
                    error: `No se puede registrar la medición: calibración vencida para ${instrument.codigo}.`,
                    instrumento_id: instrument.id,
                    fecha_vencimiento: instrument.fecha_vencimiento
                });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countToday = await tx.inspeccionCalidad.count();
            const codigo = `INS-${dateStr}-${(countToday + 1).toString().padStart(3, '0')}`;

            let autoResultado = 'PENDIENTE';
            let allPassed = true;

            const medicionesData = (mediciones || []).map((m: any) => {
                let parsedValues: number[] = [];
                if (typeof m.valores_medidos === 'string') {
                    try { parsedValues = JSON.parse(m.valores_medidos); } catch { parsedValues = []; }
                } else if (Array.isArray(m.valores_medidos)) {
                    parsedValues = m.valores_medidos.map(Number).filter(n => !isNaN(n));
                }

                let promedio: number | null = null;
                let minimo: number | null = null;
                let maximo: number | null = null;
                let rango: number | null = null;
                let desviacion: number | null = null;
                let cumple = true;

                if (parsedValues.length > 0) {
                    minimo = Math.min(...parsedValues);
                    maximo = Math.max(...parsedValues);
                    rango = maximo - minimo;
                    const sum = parsedValues.reduce((a, b) => a + b, 0);
                    promedio = Number((sum / parsedValues.length).toFixed(4));

                    if (parsedValues.length > 1) {
                        const variance = parsedValues.reduce((a, b) => a + Math.pow(b - (promedio || 0), 2), 0) / (parsedValues.length - 1);
                        desviacion = Number(Math.sqrt(variance).toFixed(4));
                    } else {
                        desviacion = 0;
                    }

                    const nominal = m.cota_nominal !== undefined && m.cota_nominal !== null && m.cota_nominal !== '' ? Number(m.cota_nominal) : null;
                    const tolMin = m.tolerancia_min !== undefined && m.tolerancia_min !== null && m.tolerancia_min !== '' ? Number(m.tolerancia_min) : null;
                    const tolMax = m.tolerancia_max !== undefined && m.tolerancia_max !== null && m.tolerancia_max !== '' ? Number(m.tolerancia_max) : null;

                    if (nominal !== null) {
                        const lowerLimit = tolMin !== null ? nominal + tolMin : nominal;
                        const upperLimit = tolMax !== null ? nominal + tolMax : nominal;
                        cumple = parsedValues.every(val => val >= lowerLimit - 0.0001 && val <= upperLimit + 0.0001);
                    }
                }

                if (!cumple) allPassed = false;

                return {
                    caracteristica_id: m.caracteristica_id ? Number(m.caracteristica_id) : null,
                    nombre_caracteristica: m.nombre_caracteristica || 'Cota',
                    especificacion: m.especificacion || null,
                    cota_nominal: m.cota_nominal !== undefined && m.cota_nominal !== '' ? Number(m.cota_nominal) : null,
                    tolerancia_min: m.tolerancia_min !== undefined && m.tolerancia_min !== '' ? Number(m.tolerancia_min) : null,
                    tolerancia_max: m.tolerancia_max !== undefined && m.tolerancia_max !== '' ? Number(m.tolerancia_max) : null,
                    instrumento: m.instrumento || null,
                    instrumento_id: Number(m.instrumento_id),
                    valores_medidos: JSON.stringify(parsedValues),
                    promedio,
                    minimo,
                    maximo,
                    rango,
                    desviacion,
                    cumple,
                    observacion: m.observacion || null
                };
            });

            if (medicionesData.length > 0) {
                autoResultado = allPassed ? 'APROBADO' : 'RECHAZADO';
            } else if (req.body.estado_resultado) {
                autoResultado = req.body.estado_resultado;
            }

            const inspection = await tx.inspeccionCalidad.create({
                data: {
                    codigo,
                    tipo: tipo || 'EN_PROCESO',
                    orden_trabajo_id: orden_trabajo_id ? Number(orden_trabajo_id) : null,
                    producto_id: producto_id ? Number(producto_id) : null,
                    proveedor_id: proveedor_id ? Number(proveedor_id) : null,
                    cliente_id: cliente_id ? Number(cliente_id) : null,
                    maquina_id: maquina_id ? Number(maquina_id) : null,
                    personal_id: personal_id ? Number(personal_id) : null,
                    operario_id: operario_id ? Number(operario_id) : null,
                    plan_control_id: plan_control_id ? Number(plan_control_id) : null,
                    lote: lote || null,
                    cantidad_inspeccionada: Number(cantidad_inspeccionada || 0),
                    cantidad_aprobada: Number(cantidad_aprobada || (autoResultado === 'APROBADO' ? cantidad_inspeccionada : 0)),
                    cantidad_rechazada: Number(cantidad_rechazada || (autoResultado === 'RECHAZADO' ? cantidad_inspeccionada : 0)),
                    estado_resultado: autoResultado,
                    observaciones: observaciones || null,
                    evidencias_url: evidencias_url ? (typeof evidencias_url === 'object' ? JSON.stringify(evidencias_url) : evidencias_url) : null,
                    mediciones: { create: medicionesData }
                },
                include: { mediciones: true }
            });

            if (orden_trabajo_id) {
                const nuevoEstadoCalidad = autoResultado === 'APROBADO' ? 'Liberada' : (autoResultado === 'RECHAZADO' ? 'Retenida' : 'En Inspección');
                await tx.ordenTrabajo.update({
                    where: { id: Number(orden_trabajo_id) },
                    data: {
                        estado_calidad: nuevoEstadoCalidad,
                        cantidad_aprobada: inspection.cantidad_aprobada,
                        cantidad_rechazada: inspection.cantidad_rechazada
                    }
                });

                await logQualityAudit({
                    usuario_id: user?.id,
                    usuario_nombre: user?.nombre || 'Inspector',
                    accion: autoResultado === 'APROBADO' ? 'LIBERACION_OT' : 'RETENCION_OT',
                    modulo: 'CALIDAD',
                    entidad: 'OrdenTrabajo',
                    entidad_id: Number(orden_trabajo_id),
                    valor_anterior: { estado_calidad: 'Pendiente' },
                    valor_nuevo: { estado_calidad: nuevoEstadoCalidad },
                    detalles: `Inspección ${inspection.codigo} resultado ${autoResultado}`
                });
            }

            return inspection;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('[createInspection Error]:', error);
        res.status(500).json({ error: 'Error al registrar inspección', details: error.message });
    }
};

export const updateInspection = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            estado_resultado,
            cantidad_inspeccionada,
            cantidad_aprobada,
            cantidad_rechazada,
            observaciones,
            evidencias_url
        } = req.body;
        const user = (req as any).user;

        const current = await prisma.inspeccionCalidad.findUnique({ where: { id: Number(id) } });
        if (!current) return res.status(404).json({ error: 'Inspección no encontrada' });

        const updated = await prisma.$transaction(async (tx) => {
            const insp = await tx.inspeccionCalidad.update({
                where: { id: Number(id) },
                data: {
                    estado_resultado: estado_resultado || undefined,
                    cantidad_inspeccionada: cantidad_inspeccionada !== undefined ? Number(cantidad_inspeccionada) : undefined,
                    cantidad_aprobada: cantidad_aprobada !== undefined ? Number(cantidad_aprobada) : undefined,
                    cantidad_rechazada: cantidad_rechazada !== undefined ? Number(cantidad_rechazada) : undefined,
                    observaciones: observaciones !== undefined ? observaciones : undefined,
                    evidencias_url: evidencias_url !== undefined ? (typeof evidencias_url === 'object' ? JSON.stringify(evidencias_url) : evidencias_url) : undefined
                }
            });

            if (current.orden_trabajo_id && estado_resultado) {
                const nuevoEstadoCalidad = estado_resultado === 'APROBADO' ? 'Liberada' : (estado_resultado === 'RECHAZADO' ? 'Retenida' : 'En Inspección');
                await tx.ordenTrabajo.update({
                    where: { id: current.orden_trabajo_id },
                    data: {
                        estado_calidad: nuevoEstadoCalidad,
                        cantidad_aprobada: insp.cantidad_aprobada,
                        cantidad_rechazada: insp.cantidad_rechazada
                    }
                });

                await logQualityAudit({
                    usuario_id: user?.id,
                    usuario_nombre: user?.nombre || 'Inspector',
                    accion: 'MODIFICACION_RESULTADO_INSPECCION',
                    modulo: 'CALIDAD',
                    entidad: 'InspeccionCalidad',
                    entidad_id: insp.id,
                    valor_anterior: { estado: current.estado_resultado },
                    valor_nuevo: { estado: insp.estado_resultado },
                    detalles: `Actualización de inspección ${insp.codigo}`
                });
            }

            return insp;
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar inspección', details: error.message });
    }
};

// ----------------------------------------------------
// 4. NO CONFORMIDADES (NC)
// ----------------------------------------------------
export const getNonConformances = async (req: Request, res: Response) => {
    try {
        const { orden_trabajo_id, estado, origen, tipo_defecto } = req.query;
        const where: any = {};
        if (orden_trabajo_id) where.orden_trabajo_id = Number(orden_trabajo_id);
        if (estado) where.estado = String(estado);
        if (origen) where.origen = String(origen);
        if (tipo_defecto) where.tipo_defecto = String(tipo_defecto);

        const ncs = await prisma.noConformidad.findMany({
            where,
            include: {
                ordenTrabajo: { select: { id: true, numero_ot: true, estado_ot: true } },
                producto: { select: { id: true, nombre_producto: true, sku_producto: true } },
                proveedor: { select: { id: true, nombre: true } },
                cliente: { select: { id: true, nombre: true } },
                maquina: { select: { id: true, codigo: true, nombre: true } },
                responsable: { select: { id: true, nombre: true, cargo: true } },
                analisisCausa: true,
                accionesCorrectivas: true
            },
            orderBy: { id: 'desc' }
        });
        res.json(ncs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener no conformidades', details: error.message });
    }
};

export const getNonConformanceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const nc = await prisma.noConformidad.findUnique({
            where: { id: Number(id) },
            include: {
                ordenTrabajo: true,
                producto: true,
                proveedor: true,
                cliente: true,
                maquina: true,
                responsable: true,
                inspeccion: { include: { mediciones: true } },
                analisisCausa: true,
                accionesCorrectivas: { include: { responsable: true } },
                reclamoCliente: true
            }
        });
        if (!nc) return res.status(404).json({ error: 'No conformidad no encontrada' });
        res.json(nc);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener no conformidad', details: error.message });
    }
};

export const createNonConformance = async (req: Request, res: Response) => {
    try {
        const {
            origen,
            tipo_defecto,
            descripcion,
            cantidad_afectada,
            costo_estimado,
            fecha_limite,
            orden_trabajo_id,
            producto_id,
            inspeccion_id,
            cliente_id,
            proveedor_id,
            maquina_id,
            personal_id,
            reclamo_id,
            disposicion,
            autorizado_por,
            justificacion_concesion,
            evidencias_url
        } = req.body;

        const user = (req as any).user;

        const result = await prisma.$transaction(async (tx) => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await tx.noConformidad.count();
            const codigo = `NC-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

            const nc = await tx.noConformidad.create({
                data: {
                    codigo,
                    origen: origen || 'INSPECCION',
                    tipo_defecto: tipo_defecto || 'DIMENSIONAL',
                    descripcion,
                    cantidad_afectada: Number(cantidad_afectada || 1),
                    costo_estimado: costo_estimado !== undefined && costo_estimado !== '' ? Number(costo_estimado) : 0,
                    fecha_limite: fecha_limite ? new Date(fecha_limite) : null,
                    orden_trabajo_id: orden_trabajo_id ? Number(orden_trabajo_id) : null,
                    producto_id: producto_id ? Number(producto_id) : null,
                    inspeccion_id: inspeccion_id ? Number(inspeccion_id) : null,
                    cliente_id: cliente_id ? Number(cliente_id) : null,
                    proveedor_id: proveedor_id ? Number(proveedor_id) : null,
                    maquina_id: maquina_id ? Number(maquina_id) : null,
                    personal_id: personal_id ? Number(personal_id) : null,
                    reclamo_id: reclamo_id ? Number(reclamo_id) : null,
                    disposicion: disposicion || null,
                    autorizado_por: autorizado_por || null,
                    justificacion_concesion: justificacion_concesion || null,
                    evidencias_url: evidencias_url ? (typeof evidencias_url === 'object' ? JSON.stringify(evidencias_url) : evidencias_url) : null,
                    estado: 'ABIERTA'
                }
            });

            if (orden_trabajo_id) {
                await tx.ordenTrabajo.update({
                    where: { id: Number(orden_trabajo_id) },
                    data: { estado_calidad: 'Retenida' }
                });
            }

            await logQualityAudit({
                usuario_id: user?.id,
                usuario_nombre: user?.nombre || 'Usuario',
                accion: 'CREACION_NO_CONFORMIDAD',
                modulo: 'CALIDAD',
                entidad: 'NoConformidad',
                entidad_id: nc.id,
                valor_nuevo: { codigo: nc.codigo, tipo: nc.tipo_defecto },
                detalles: `NC ${nc.codigo} registrada: ${nc.descripcion.slice(0, 50)}`
            });

            return nc;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('[createNonConformance Error]:', error);
        res.status(500).json({ error: 'Error al crear no conformidad', details: error.message });
    }
};

export const updateNCDisposition = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { disposicion, autorizado_por, justificacion_concesion, estado } = req.body;
        const user = (req as any).user;

        const current = await prisma.noConformidad.findUnique({ where: { id: Number(id) } });
        if (!current) return res.status(404).json({ error: 'No conformidad no encontrada' });

        if (disposicion === 'CONCESION' && (!autorizado_por || !justificacion_concesion)) {
            return res.status(400).json({ error: 'La aceptación bajo concesión requiere registrar quién autoriza y el motivo técnico.' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const nc = await tx.noConformidad.update({
                where: { id: Number(id) },
                data: {
                    disposicion,
                    autorizado_por: autorizado_por || current.autorizado_por,
                    justificacion_concesion: justificacion_concesion || current.justificacion_concesion,
                    estado: estado || (disposicion === 'CONCESION' ? 'VERIFICADA' : current.estado)
                }
            });

            if (disposicion === 'CONCESION' && nc.orden_trabajo_id) {
                await tx.ordenTrabajo.update({
                    where: { id: nc.orden_trabajo_id },
                    data: { estado_calidad: 'Liberada' }
                });
            }

            await logQualityAudit({
                usuario_id: user?.id,
                usuario_nombre: user?.nombre || 'Responsable',
                accion: disposicion === 'CONCESION' ? 'CONCESION_CALIDAD' : 'DISPOSICION_NC',
                modulo: 'CALIDAD',
                entidad: 'NoConformidad',
                entidad_id: nc.id,
                valor_anterior: { disposicion: current.disposicion, estado: current.estado },
                valor_nuevo: { disposicion: nc.disposicion, estado: nc.estado },
                detalles: `Disposición asignada: ${disposicion} por ${autorizado_por || user?.nombre}`
            });

            return nc;
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar disposición de NC', details: error.message });
    }
};

export const closeNonConformance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const nc = await prisma.noConformidad.update({
            where: { id: Number(id) },
            data: {
                estado: 'CERRADA',
                fecha_cierre: new Date()
            }
        });

        await logQualityAudit({
            usuario_id: user?.id,
            usuario_nombre: user?.nombre || 'Usuario',
            accion: 'CIERRE_NC',
            modulo: 'CALIDAD',
            entidad: 'NoConformidad',
            entidad_id: nc.id,
            detalles: `Cierre formal de la no conformidad ${nc.codigo}`
        });

        res.json(nc);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al cerrar no conformidad', details: error.message });
    }
};

// ----------------------------------------------------
// 5. ANÁLISIS DE CAUSA RAÍZ (5 POR QUÉS & ISHIKAWA 6M)
// ----------------------------------------------------
export const saveNCRootCause = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            metodo_analisis,
            porque_1,
            porque_2,
            porque_3,
            porque_4,
            porque_5,
            causa_raiz,
            ishikawa_maquina,
            ishikawa_metodo,
            ishikawa_mano_obra,
            ishikawa_material,
            ishikawa_medicion,
            ishikawa_medio_ambiente
        } = req.body;

        const analysis = await prisma.analisisCausaNC.upsert({
            where: { no_conformidad_id: Number(id) },
            create: {
                no_conformidad_id: Number(id),
                metodo_analisis: metodo_analisis || 'AMBOS',
                porque_1,
                porque_2,
                porque_3,
                porque_4,
                porque_5,
                causa_raiz,
                ishikawa_maquina: typeof ishikawa_maquina === 'object' ? JSON.stringify(ishikawa_maquina) : ishikawa_maquina,
                ishikawa_metodo: typeof ishikawa_metodo === 'object' ? JSON.stringify(ishikawa_metodo) : ishikawa_metodo,
                ishikawa_mano_obra: typeof ishikawa_mano_obra === 'object' ? JSON.stringify(ishikawa_mano_obra) : ishikawa_mano_obra,
                ishikawa_material: typeof ishikawa_material === 'object' ? JSON.stringify(ishikawa_material) : ishikawa_material,
                ishikawa_medicion: typeof ishikawa_medicion === 'object' ? JSON.stringify(ishikawa_medicion) : ishikawa_medicion,
                ishikawa_medio_ambiente: typeof ishikawa_medio_ambiente === 'object' ? JSON.stringify(ishikawa_medio_ambiente) : ishikawa_medio_ambiente
            },
            update: {
                metodo_analisis,
                porque_1,
                porque_2,
                porque_3,
                porque_4,
                porque_5,
                causa_raiz,
                ishikawa_maquina: typeof ishikawa_maquina === 'object' ? JSON.stringify(ishikawa_maquina) : ishikawa_maquina,
                ishikawa_metodo: typeof ishikawa_metodo === 'object' ? JSON.stringify(ishikawa_metodo) : ishikawa_metodo,
                ishikawa_mano_obra: typeof ishikawa_mano_obra === 'object' ? JSON.stringify(ishikawa_mano_obra) : ishikawa_mano_obra,
                ishikawa_material: typeof ishikawa_material === 'object' ? JSON.stringify(ishikawa_material) : ishikawa_material,
                ishikawa_medicion: typeof ishikawa_medicion === 'object' ? JSON.stringify(ishikawa_medicion) : ishikawa_medicion,
                ishikawa_medio_ambiente: typeof ishikawa_medio_ambiente === 'object' ? JSON.stringify(ishikawa_medio_ambiente) : ishikawa_medio_ambiente
            }
        });

        await prisma.noConformidad.update({
            where: { id: Number(id) },
            data: { estado: 'EN_ANALISIS' }
        });

        res.json(analysis);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al guardar análisis de causa raíz', details: error.message });
    }
};

// ----------------------------------------------------
// 6. ACCIONES CORRECTIVAS & PREVENTIVAS (CAPA)
// ----------------------------------------------------
export const getCorrectiveActions = async (req: Request, res: Response) => {
    try {
        const { no_conformidad_id, estado, tipo } = req.query;
        const where: any = {};
        if (no_conformidad_id) where.no_conformidad_id = Number(no_conformidad_id);
        if (estado) where.estado = String(estado);
        if (tipo) where.tipo = String(tipo);

        const actions = await prisma.accionCorrectiva.findMany({
            where,
            include: {
                noConformidad: { select: { id: true, codigo: true, descripcion: true, origen: true } },
                responsable: { select: { id: true, nombre: true, cargo: true } }
            },
            orderBy: { id: 'desc' }
        });
        res.json(actions);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener acciones correctivas', details: error.message });
    }
};

export const createCorrectiveAction = async (req: Request, res: Response) => {
    try {
        const {
            no_conformidad_id,
            tipo,
            titulo,
            descripcion_problema,
            causa_raiz,
            accion_propuesta,
            personal_id,
            fecha_limite,
            evidencias_url
        } = req.body;

        const count = await prisma.accionCorrectiva.count();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const codigo = `CAPA-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        const action = await prisma.accionCorrectiva.create({
            data: {
                codigo,
                no_conformidad_id: no_conformidad_id ? Number(no_conformidad_id) : null,
                tipo: tipo || 'CORRECTIVA',
                titulo,
                descripcion_problema,
                causa_raiz: causa_raiz || null,
                accion_propuesta,
                personal_id: personal_id ? Number(personal_id) : null,
                fecha_limite: new Date(fecha_limite),
                evidencias_url: evidencias_url ? (typeof evidencias_url === 'object' ? JSON.stringify(evidencias_url) : evidencias_url) : null,
                estado: 'ABIERTA'
            }
        });

        if (no_conformidad_id) {
            await prisma.noConformidad.update({
                where: { id: Number(no_conformidad_id) },
                data: { estado: 'EN_ACCION' }
            });
        }

        res.status(201).json(action);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear acción correctiva', details: error.message });
    }
};

export const updateCorrectiveAction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            estado,
            fecha_implementacion,
            fecha_verificacion,
            eficacia_evaluada,
            observaciones_verificacion,
            evidencias_url
        } = req.body;

        const action = await prisma.accionCorrectiva.update({
            where: { id: Number(id) },
            data: {
                estado: estado || undefined,
                fecha_implementacion: fecha_implementacion ? new Date(fecha_implementacion) : undefined,
                fecha_verificacion: fecha_verificacion ? new Date(fecha_verificacion) : undefined,
                eficacia_evaluada: eficacia_evaluada !== undefined ? Boolean(eficacia_evaluada) : undefined,
                observaciones_verificacion: observaciones_verificacion !== undefined ? observaciones_verificacion : undefined,
                evidencias_url: evidencias_url !== undefined ? (typeof evidencias_url === 'object' ? JSON.stringify(evidencias_url) : evidencias_url) : undefined
            }
        });
        res.json(action);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar acción correctiva', details: error.message });
    }
};

// ----------------------------------------------------
// 7. RIESGOS Y OPORTUNIDADES (ISO 9001:2015)
// ----------------------------------------------------
export const getQualityRisks = async (req: Request, res: Response) => {
    try {
        const { proceso, tipo, categoria_matriz, estado } = req.query;
        const where: any = {};
        if (proceso) where.proceso = String(proceso);
        if (categoria_matriz || tipo) {
            const category = String(categoria_matriz || tipo).toUpperCase();
            if (!['RIESGO', 'OPORTUNIDAD'].includes(category)) return res.status(400).json({ error: 'Categoría de matriz inválida.' });
            where.categoria_matriz = category;
        }
        if (estado) where.estado = String(estado);

        const risks = await prisma.riesgoCalidad.findMany({
            where,
            include: {
                responsable: { select: { id: true, nombre: true } },
                maquina: { select: { id: true, codigo: true, nombre: true } },
                producto: { select: { id: true, nombre_producto: true } },
                proveedor: { select: { id: true, nombre: true } },
                cliente: { select: { id: true, nombre: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        risks.sort((a, b) => {
            if (a.categoria_matriz !== b.categoria_matriz) return a.categoria_matriz === 'RIESGO' ? -1 : 1;
            return a.categoria_matriz === 'OPORTUNIDAD'
                ? b.nivel_oportunidad - a.nivel_oportunidad
                : b.nivel_riesgo - a.nivel_riesgo;
        });
        res.json(risks);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener matriz de riesgos', details: error.message });
    }
};

export const createQualityRisk = async (req: Request, res: Response) => {
    try {
        const {
            tipo,
            categoria_matriz,
            proceso,
            descripcion,
            causa,
            consecuencia,
            probabilidad,
            impacto,
            viabilidad,
            beneficio,
            estrategia,
            plan_accion,
            personal_id,
            maquina_id,
            producto_id,
            proveedor_id,
            cliente_id
        } = req.body;

        const rawCategory = String(categoria_matriz || tipo || 'RIESGO').toUpperCase();
        if (rawCategory !== 'RIESGO' && rawCategory !== 'OPORTUNIDAD') return res.status(400).json({ error: 'Categoría de matriz inválida.' });
        const category = rawCategory;
        const p = Number(probabilidad || 1);
        const i = Number(impacto || 1);
        const viability = Number(viabilidad || 1);
        const benefit = Number(beneficio || 1);
        if ([p, i, viability, benefit].some(score => !Number.isInteger(score) || score < 1 || score > 5)) {
            return res.status(400).json({ error: 'Las puntuaciones deben estar entre 1 y 5.' });
        }
        const riskLevel = category === 'RIESGO' ? p * i : 1;
        const opportunityLevel = category === 'OPORTUNIDAD' ? viability * benefit : 1;

        const count = await prisma.riesgoCalidad.count();
        const codigo = `RIE-${(count + 1).toString().padStart(3, '0')}`;

        const risk = await prisma.riesgoCalidad.create({
            data: {
                codigo,
                tipo: category,
                categoria_matriz: category,
                proceso: proceso || 'Producción',
                descripcion,
                causa: causa || null,
                consecuencia: consecuencia || null,
                probabilidad: p,
                impacto: i,
                nivel_riesgo: riskLevel,
                viabilidad: viability,
                beneficio: benefit,
                nivel_oportunidad: opportunityLevel,
                estrategia: estrategia || null,
                plan_accion: plan_accion || null,
                personal_id: personal_id ? Number(personal_id) : null,
                maquina_id: maquina_id ? Number(maquina_id) : null,
                producto_id: producto_id ? Number(producto_id) : null,
                proveedor_id: proveedor_id ? Number(proveedor_id) : null,
                cliente_id: cliente_id ? Number(cliente_id) : null,
                estado: 'IDENTIFICADO'
            }
        });
        res.status(201).json(risk);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar riesgo', details: error.message });
    }
};

export const updateQualityRisk = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            proceso,
            descripcion,
            causa,
            consecuencia,
            categoria_matriz,
            probabilidad,
            impacto,
            viabilidad,
            beneficio,
            estrategia,
            plan_accion,
            personal_id,
            estado
        } = req.body;

        const current = await prisma.riesgoCalidad.findUnique({ where: { id: Number(id) } });
        if (!current) return res.status(404).json({ error: 'Riesgo no encontrado' });

        const rawCategory = String(categoria_matriz || current.categoria_matriz).toUpperCase();
        if (rawCategory !== 'RIESGO' && rawCategory !== 'OPORTUNIDAD') return res.status(400).json({ error: 'Categoría de matriz inválida.' });
        const category = rawCategory;
        const finalP = probabilidad !== undefined ? Number(probabilidad) : current.probabilidad;
        const finalI = impacto !== undefined ? Number(impacto) : current.impacto;
        const finalViability = viabilidad !== undefined ? Number(viabilidad) : current.viabilidad;
        const finalBenefit = beneficio !== undefined ? Number(beneficio) : current.beneficio;
        if ([finalP, finalI, finalViability, finalBenefit].some(score => !Number.isInteger(score) || score < 1 || score > 5)) {
            return res.status(400).json({ error: 'Las puntuaciones deben estar entre 1 y 5.' });
        }

        const updated = await prisma.riesgoCalidad.update({
            where: { id: Number(id) },
            data: {
                proceso,
                descripcion,
                causa,
                consecuencia,
                tipo: category,
                categoria_matriz: category,
                probabilidad: finalP,
                impacto: finalI,
                nivel_riesgo: category === 'RIESGO' ? finalP * finalI : 1,
                viabilidad: finalViability,
                beneficio: finalBenefit,
                nivel_oportunidad: category === 'OPORTUNIDAD' ? finalViability * finalBenefit : 1,
                estrategia,
                plan_accion,
                personal_id: personal_id !== undefined ? (personal_id ? Number(personal_id) : null) : undefined,
                estado
            }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar riesgo', details: error.message });
    }
};

// ----------------------------------------------------
// 8. RECLAMOS DE CLIENTES
// ----------------------------------------------------
export const getCustomerClaims = async (req: Request, res: Response) => {
    try {
        const { cliente_id, estado } = req.query;
        const where: any = {};
        if (cliente_id) where.cliente_id = Number(cliente_id);
        if (estado) where.estado = String(estado);

        const claims = await prisma.reclamoCliente.findMany({
            where,
            include: {
                cliente: { select: { id: true, nombre: true } },
                producto: { select: { id: true, nombre_producto: true, sku_producto: true } },
                ordenTrabajo: { select: { id: true, numero_ot: true } },
                noConformidades: true
            },
            orderBy: { id: 'desc' }
        });
        res.json(claims);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener reclamos de clientes', details: error.message });
    }
};

export const createCustomerClaim = async (req: Request, res: Response) => {
    try {
        const {
            cliente_id,
            producto_id,
            orden_trabajo_id,
            motivo,
            descripcion,
            es_devolucion,
            cantidad_afectada,
            costo_estimado,
            accion_inmediata
        } = req.body;

        const count = await prisma.reclamoCliente.count();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const codigo = `REC-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        const claim = await prisma.reclamoCliente.create({
            data: {
                codigo,
                cliente_id: Number(cliente_id),
                producto_id: producto_id ? Number(producto_id) : null,
                orden_trabajo_id: orden_trabajo_id ? Number(orden_trabajo_id) : null,
                motivo,
                descripcion,
                es_devolucion: Boolean(es_devolucion),
                cantidad_afectada: Number(cantidad_afectada || 0),
                costo_estimado: costo_estimado !== undefined && costo_estimado !== '' ? Number(costo_estimado) : 0,
                accion_inmediata: accion_inmediata || null,
                estado: 'ABIERTO'
            }
        });
        res.status(201).json(claim);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar reclamo de cliente', details: error.message });
    }
};

export const updateCustomerClaim = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estado, satisfaccion_cierre, accion_inmediata } = req.body;
        const claim = await prisma.reclamoCliente.update({
            where: { id: Number(id) },
            data: {
                estado,
                satisfaccion_cierre,
                accion_inmediata
            }
        });
        res.json(claim);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar reclamo de cliente', details: error.message });
    }
};

// ----------------------------------------------------
// 9. PROVEEDORES & CALIDAD EN RECEPCIÓN
// ----------------------------------------------------
export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await prisma.proveedor.findMany({
            include: {
                _count: {
                    select: {
                        inspecciones: true,
                        noConformidades: true
                    }
                },
                evaluaciones: { orderBy: { id: 'desc' }, take: 1 }
            },
            orderBy: { nombre: 'asc' }
        });
        res.json(suppliers);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener proveedores', details: error.message });
    }
};

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const {
            nombre, contacto, telefono, email, direccion, calificacion,
            riesgo_climatico_score, evaluacion_ambiental, plan_continuidad_climatica, certificaciones_sostenibilidad
        } = req.body;
        if (riesgo_climatico_score !== undefined && riesgo_climatico_score !== '' &&
            (!Number.isInteger(Number(riesgo_climatico_score)) || Number(riesgo_climatico_score) < 1 || Number(riesgo_climatico_score) > 5)) {
            return res.status(400).json({ error: 'La puntuación de riesgo climático debe estar entre 1 y 5.' });
        }
        const supplier = await prisma.proveedor.create({
            data: {
                nombre,
                contacto,
                telefono,
                email,
                direccion,
                calificacion: calificacion !== undefined && calificacion !== '' ? Number(calificacion) : 100,
                riesgo_climatico_score: riesgo_climatico_score !== undefined && riesgo_climatico_score !== '' ? Number(riesgo_climatico_score) : null,
                evaluacion_ambiental: evaluacion_ambiental || null,
                plan_continuidad_climatica: plan_continuidad_climatica || null,
                certificaciones_sostenibilidad: certificaciones_sostenibilidad || null
            }
        });
        res.status(201).json(supplier);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear proveedor', details: error.message });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            nombre, contacto, telefono, email, direccion, activo, calificacion,
            riesgo_climatico_score, evaluacion_ambiental, plan_continuidad_climatica, certificaciones_sostenibilidad
        } = req.body;
        if (riesgo_climatico_score !== undefined && riesgo_climatico_score !== null && riesgo_climatico_score !== '' &&
            (!Number.isInteger(Number(riesgo_climatico_score)) || Number(riesgo_climatico_score) < 1 || Number(riesgo_climatico_score) > 5)) {
            return res.status(400).json({ error: 'La puntuación de riesgo climático debe estar entre 1 y 5.' });
        }
        const supplier = await prisma.proveedor.update({
            where: { id: Number(id) },
            data: {
                nombre,
                contacto,
                telefono,
                email,
                direccion,
                activo: activo !== undefined ? Boolean(activo) : undefined,
                calificacion: calificacion !== undefined && calificacion !== '' ? Number(calificacion) : undefined,
                riesgo_climatico_score: riesgo_climatico_score !== undefined
                    ? (riesgo_climatico_score === '' || riesgo_climatico_score === null ? null : Number(riesgo_climatico_score))
                    : undefined,
                evaluacion_ambiental: evaluacion_ambiental !== undefined ? evaluacion_ambiental : undefined,
                plan_continuidad_climatica: plan_continuidad_climatica !== undefined ? plan_continuidad_climatica : undefined,
                certificaciones_sostenibilidad: certificaciones_sostenibilidad !== undefined ? certificaciones_sostenibilidad : undefined
            }
        });
        res.json(supplier);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar proveedor', details: error.message });
    }
};

export const evaluateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { periodo } = req.body;

        const inspecciones = await prisma.inspeccionCalidad.findMany({
            where: { proveedor_id: Number(id) }
        });
        const ncs = await prisma.noConformidad.findMany({
            where: { proveedor_id: Number(id) }
        });

        const totalRecepciones = inspecciones.length;
        const aprobadas = inspecciones.filter(i => i.estado_resultado === 'APROBADO').length;
        const totalRechazos = inspecciones.filter(i => i.estado_resultado === 'RECHAZADO').length;
        const totalNC = ncs.length;

        const tasaAceptacion = totalRecepciones > 0 ? (aprobadas / totalRecepciones) * 100 : 100;
        const penalizacionNC = totalNC * 5;
        const supplier = await prisma.proveedor.findUnique({ where: { id: Number(id) } });
        if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado.' });
        const indiceCalculado = Math.max(0, Math.min(100, Math.round(tasaAceptacion - penalizacionNC)));

        let estadoAprobacion = 'APROBADO';
        if (indiceCalculado < 70) estadoAprobacion = 'NO_APROBADO';
        else if (indiceCalculado < 85) estadoAprobacion = 'CONDICIONAL';

        const evaluacion = await prisma.evaluacionProveedor.create({
            data: {
                proveedor_id: Number(id),
                periodo: periodo || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
                indice_calidad: indiceCalculado,
                total_recepciones: totalRecepciones,
                total_rechazos: totalRechazos,
                total_nc: totalNC,
                estado_aprobacion: estadoAprobacion,
                observaciones: JSON.stringify({
                    riesgo_climatico_score: supplier.riesgo_climatico_score,
                    evaluacion_ambiental: supplier.evaluacion_ambiental,
                    plan_continuidad_climatica: supplier.plan_continuidad_climatica,
                    certificaciones_sostenibilidad: supplier.certificaciones_sostenibilidad
                }),
                evaluador: (req as any).user?.nombre || 'Sistema'
            }
        });

        await prisma.proveedor.update({
            where: { id: Number(id) },
            data: { calificacion: indiceCalculado }
        });

        res.status(201).json(evaluacion);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al evaluar proveedor', details: error.message });
    }
};

// ----------------------------------------------------
// 10. AUDITORÍAS SGC (ISO 9001)
// ----------------------------------------------------
export const getAudits = async (req: Request, res: Response) => {
    try {
        const audits = await prisma.auditoriaCalidad.findMany({
            include: { hallazgos: true },
            orderBy: { fecha_programada: 'desc' }
        });
        res.json(audits);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener auditorías', details: error.message });
    }
};

export const createAudit = async (req: Request, res: Response) => {
    try {
        const { tipo, titulo, proceso_area, auditor_lider, equipo_auditor, fecha_programada, objetivo, alcance, criterios } = req.body;
        const count = await prisma.auditoriaCalidad.count();
        const codigo = `AUD-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

        const audit = await prisma.auditoriaCalidad.create({
            data: {
                codigo,
                tipo: tipo || 'INTERNA',
                titulo,
                proceso_area,
                auditor_lider,
                equipo_auditor: equipo_auditor || null,
                fecha_programada: new Date(fecha_programada),
                objetivo: objetivo || null,
                alcance: alcance || null,
                criterios: criterios || 'ISO 9001:2015',
                estado: 'PROGRAMADA'
            }
        });
        res.status(201).json(audit);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar auditoría', details: error.message });
    }
};

export const addAuditFinding = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { tipo_hallazgo, descripcion, clausula_iso, evidencia } = req.body;

        const finding = await prisma.hallazgoAuditoria.create({
            data: {
                auditoria_id: Number(id),
                tipo_hallazgo: tipo_hallazgo || 'NO_CONFORMIDAD_MENOR',
                descripcion,
                clausula_iso: clausula_iso || null,
                evidencia: evidencia || null
            }
        });
        res.status(201).json(finding);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar hallazgo de auditoría', details: error.message });
    }
};

// ----------------------------------------------------
// 11. INFORMACIÓN DOCUMENTADA & CONTROL DE CAMBIOS
// ----------------------------------------------------
export const getDocumentsSGC = async (req: Request, res: Response) => {
    try {
        const { tipo, proceso, estado } = req.query;
        const where: any = {};
        if (tipo) where.tipo = String(tipo);
        if (proceso) where.proceso = String(proceso);
        if (estado) where.estado = String(estado);

        const docs = await prisma.documentoSGC.findMany({
            where,
            include: { versiones: { orderBy: { id: 'desc' } } },
            orderBy: { codigo: 'asc' }
        });
        res.json(docs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener documentos SGC', details: error.message });
    }
};

export const createDocumentSGC = async (req: Request, res: Response) => {
    try {
        const { codigo, nombre, tipo, proceso, version_actual, responsable, fecha_proxima_rev, archivo_url, descripcion, motivo_creacion } = req.body;
        const user = (req as any).user;

        const doc = await prisma.documentoSGC.create({
            data: {
                codigo,
                nombre,
                tipo: tipo || 'PROCEDIMIENTO',
                proceso: proceso || 'CALIDAD',
                version_actual: version_actual || '1.0',
                responsable: responsable || user?.nombre || 'Administrador',
                fecha_proxima_rev: fecha_proxima_rev ? new Date(fecha_proxima_rev) : null,
                archivo_url: archivo_url || null,
                descripcion: descripcion || null,
                versiones: {
                    create: [{
                        version: version_actual || '1.0',
                        usuario_nombre: user?.nombre || 'Administrador',
                        cambio_realizado: 'Creación inicial del documento',
                        motivo_cambio: motivo_creacion || 'Emisión inicial en SGC',
                        archivo_url: archivo_url || null
                    }]
                }
            },
            include: { versiones: true }
        });
        res.status(201).json(doc);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear documento SGC', details: error.message });
    }
};

export const createDocumentVersion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nueva_version, cambio_realizado, motivo_cambio, archivo_url } = req.body;
        const user = (req as any).user;

        const result = await prisma.$transaction(async (tx) => {
            const doc = await tx.documentoSGC.update({
                where: { id: Number(id) },
                data: {
                    version_actual: nueva_version,
                    archivo_url: archivo_url || undefined,
                    fecha_aprobacion: new Date()
                }
            });

            await tx.historialVersionDocumento.create({
                data: {
                    documento_id: Number(id),
                    version: nueva_version,
                    usuario_nombre: user?.nombre || 'Usuario',
                    cambio_realizado,
                    motivo_cambio,
                    archivo_url: archivo_url || null
                }
            });

            return doc;
        });

        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al versionar documento', details: error.message });
    }
};

// ----------------------------------------------------
// 12. TRAZABILIDAD 360° POR ORDEN DE TRABAJO (OT)
// ----------------------------------------------------
export const getTraceabilityByOT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const order = await prisma.ordenTrabajo.findUnique({
            where: { id: Number(id) },
            include: {
                producto: {
                    include: {
                        cliente: true,
                        listaMateriales: { include: { materiaPrima: true } },
                        planesControl: { include: { caracteristicas: true } }
                    }
                },
                tareas: {
                    orderBy: { secuencia_ot: 'asc' },
                    include: {
                        rutaFabricacion: true,
                        personal: true,
                        maquina: true
                    }
                },
                movimientosInventario: {
                    include: { materiaPrima: true }
                },
                materialesProyecto: true,
                inspecciones: {
                    include: {
                        inspector: true,
                        operario: true,
                        mediciones: true
                    }
                },
                noConformidades: {
                    include: {
                        responsable: true,
                        accionesCorrectivas: true,
                        analisisCausa: true
                    }
                },
                reclamos: true,
                pedido: true
            }
        });

        if (!order) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

        const machineIds = Array.from(new Set(order.tareas.map(t => t.maquina_id).filter(Boolean))) as number[];
        const mantenimientosRelacionados = await prisma.ordenMantenimiento.findMany({
            where: {
                maquina_id: { in: machineIds },
                fecha_inicio: { gte: order.fecha_creacion }
            },
            include: { maquina: true, falla: true }
        });

        const traceability = {
            ot: {
                id: order.id,
                numero_ot: order.numero_ot,
                tipo_orden: order.tipo_orden,
                estado_ot: order.estado_ot,
                estado_calidad: order.estado_calidad || 'Pendiente',
                cantidad_pedido: order.cantidad_pedido,
                cantidad_fabricar: order.cantidad_fabricar,
                cantidad_aprobada: order.cantidad_aprobada || 0,
                cantidad_rechazada: order.cantidad_rechazada || 0,
                cantidad_retrabajada: order.cantidad_retrabajada || 0,
                fecha_creacion: order.fecha_creacion,
                fecha_inicio_real: order.fecha_inicio_real,
                fecha_fin_real: order.fecha_fin_real,
                costo_total_real: order.costo_total_real
            },
            cliente: {
                nombre: order.cliente || order.producto?.cliente?.nombre || 'N/A',
                orden_compra_cliente: order.orden_compra_cliente,
                pedido: order.pedido ? {
                    id: order.pedido.id,
                    orden_compra: order.pedido.orden_compra,
                    estado: order.pedido.estado,
                    cantidad_despachada: order.pedido.cantidad_despachada
                } : null
            },
            producto: order.producto ? {
                id: order.producto.id,
                sku: order.producto.sku_producto,
                nombre: order.producto.nombre_producto,
                plano_pdf_url: order.producto.plano_pdf_url,
                acabado: order.acabado || order.producto.acabado,
                ancho_tira: order.ancho_tira || order.producto.ancho_tira,
                planes_control: order.producto.planesControl
            } : null,
            materiasPrimas: order.movimientosInventario.map(m => ({
                id: m.materiaPrima.id,
                sku: m.materiaPrima.sku_mp,
                nombre: m.materiaPrima.nombre_mp,
                cantidad: m.cantidad,
                tipo_movimiento: m.tipo_movimiento,
                fecha: m.fecha_hora
            })),
            procesoFabricacion: order.tareas.map(t => ({
                id: t.id,
                secuencia: t.secuencia_ot || t.rutaFabricacion?.no_operacion || 0,
                operacion: t.rutaFabricacion?.nombre_operacion || 'Operación',
                centro_trabajo: t.rutaFabricacion?.centro_trabajo || 'Taller',
                estado: t.estado_tarea,
                operario: t.personal?.nombre || 'No asignado',
                maquina: t.maquina ? `${t.maquina.codigo} - ${t.maquina.nombre}` : 'No asignada',
                cantidad_buena: t.cantidad_buena,
                cantidad_mala: t.cantidad_mala,
                fecha_inicio: t.fecha_hora_inicio,
                fecha_fin: t.fecha_hora_fin,
                duracion_real_min: t.duracion_real_min
            })),
            mantenimientoMaquinas: mantenimientosRelacionados.map(m => ({
                id: m.id,
                maquina: m.maquina.codigo,
                tipo: m.tipo,
                fecha: m.fecha_inicio,
                tecnico: m.tecnico,
                actividades: m.actividades,
                falla: m.falla?.descripcion
            })),
            inspeccionesCalidad: order.inspecciones.map(ins => ({
                id: ins.id,
                codigo: ins.codigo,
                tipo: ins.tipo,
                fecha: ins.fecha_inspeccion,
                inspector: ins.inspector?.nombre || 'Inspector',
                resultado: ins.estado_resultado,
                cantidad_inspeccionada: ins.cantidad_inspeccionada,
                cantidad_aprobada: ins.cantidad_aprobada,
                cantidad_rechazada: ins.cantidad_rechazada,
                mediciones: ins.mediciones
            })),
            noConformidades: order.noConformidades.map(nc => ({
                id: nc.id,
                codigo: nc.codigo,
                fecha: nc.fecha,
                tipo_defecto: nc.tipo_defecto,
                descripcion: nc.descripcion,
                disposicion: nc.disposicion,
                estado: nc.estado,
                responsable: nc.responsable?.nombre,
                causa_raiz: nc.analisisCausa?.causa_raiz,
                acciones_correctivas: nc.accionesCorrectivas
            })),
            reclamosCliente: order.reclamos.map(r => ({
                id: r.id,
                codigo: r.codigo,
                motivo: r.motivo,
                estado: r.estado,
                fecha: r.fecha_reclamo
            })),
            despacho: {
                apto_para_despacho: order.estado_calidad === 'Liberada' || order.estado_calidad === 'Aprobada',
                bloqueado: order.estado_calidad === 'Retenida' || order.estado_calidad === 'Rechazada',
                motivo_bloqueo: order.estado_calidad === 'Retenida' ? 'OT retenida por control de calidad' : null
            }
        };

        res.json(traceability);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al generar trazabilidad', details: error.message });
    }
};

// ----------------------------------------------------
// 13. LOG DE AUDITORÍA DE CALIDAD
// ----------------------------------------------------
export const getQualityAuditLogs = async (req: Request, res: Response) => {
    try {
        const { limit } = req.query;
        const logs = await prisma.auditoriaRegistroCalidad.findMany({
            orderBy: { fecha: 'desc' },
            take: Number(limit) || 100
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener registros de auditoría', details: error.message });
    }
};

const ETHICS_POLICY_VERSION = '2026.1';
const MANAGEMENT_ROLES = ['Administrador', 'Gerencia', 'Calidad', 'Supervisor'];

export const getMeasurementInstruments = async (_req: Request, res: Response) => {
    try {
        const instruments = await prisma.instrumentoMedicion.findMany({ orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }] });
        res.json(instruments);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar instrumentos de medición', details: error.message });
    }
};

export const createMeasurementInstrument = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!MANAGEMENT_ROLES.includes(user?.rol)) return res.sendStatus(403);
        const { codigo, nombre, tipo, fabricante, numero_serie, certificado_calibracion, fecha_ultima_calibracion, fecha_vencimiento, observaciones } = req.body;
        const expiration = new Date(fecha_vencimiento);
        if (!codigo?.trim() || !nombre?.trim() || !tipo?.trim() || Number.isNaN(expiration.getTime())) {
            return res.status(400).json({ error: 'Código, nombre, tipo y vencimiento válido son obligatorios.' });
        }
        const instrument = await prisma.instrumentoMedicion.create({
            data: {
                codigo: codigo.trim(),
                nombre: nombre.trim(),
                tipo: tipo.trim(),
                fabricante: fabricante || null,
                numero_serie: numero_serie || null,
                certificado_calibracion: certificado_calibracion || null,
                fecha_ultima_calibracion: fecha_ultima_calibracion ? new Date(fecha_ultima_calibracion) : null,
                fecha_vencimiento: expiration,
                observaciones: observaciones || null
            }
        });
        await prisma.auditoriaRegistroCalidad.create({
            data: {
                usuario_id: Number(user.id),
                usuario_nombre: user.nombre || 'Calidad',
                accion: 'REGISTRO_INSTRUMENTO_MEDICION',
                modulo: 'CALIDAD',
                entidad: 'InstrumentoMedicion',
                entidad_id: instrument.id,
                valor_nuevo: JSON.stringify({ codigo: instrument.codigo, fecha_vencimiento: instrument.fecha_vencimiento }),
                ip_origen: req.ip
            }
        });
        res.status(201).json(instrument);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar instrumento', details: error.message });
    }
};

export const getEngineeringChanges = async (_req: Request, res: Response) => {
    try {
        const changes = await prisma.controlCambioIngenieria.findMany({
            include: {
                producto: { select: { id: true, sku_producto: true, nombre_producto: true } },
                listaMateriales: { select: { id: true } },
                rutaFabricacion: { select: { id: true, no_operacion: true, nombre_operacion: true } },
                usuarioSolicitante: { select: { id: true, nombre: true } },
                usuarioAprobador: { select: { id: true, nombre: true } }
            },
            orderBy: { fecha_solicitud: 'desc' }
        });
        res.json(changes);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar cambios de ingeniería', details: error.message });
    }
};

export const createEngineeringChange = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { producto_id, lista_materiales_id, ruta_fabricacion_id, motivo, descripcion_cambio } = req.body;
        const productId = Number(producto_id);
        if (!Number.isInteger(productId) || productId < 1 || !motivo?.trim() || !descripcion_cambio?.trim() ||
            (!lista_materiales_id && !ruta_fabricacion_id)) {
            return res.status(400).json({ error: 'Producto, motivo, detalle y al menos un objeto BOM o ruta son obligatorios.' });
        }
        const count = await prisma.controlCambioIngenieria.count();
        const codigo = `ECO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const change = await prisma.$transaction(async tx => {
            const created = await tx.controlCambioIngenieria.create({
                data: {
                    codigo,
                    producto_id: productId,
                    lista_materiales_id: lista_materiales_id ? Number(lista_materiales_id) : null,
                    ruta_fabricacion_id: ruta_fabricacion_id ? Number(ruta_fabricacion_id) : null,
                    motivo: motivo.trim(),
                    descripcion_cambio: descripcion_cambio.trim(),
                    usuario_solicitante_id: Number(user.id)
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Usuario',
                    accion: 'SOLICITUD_CAMBIO_INGENIERIA',
                    modulo: 'CALIDAD',
                    entidad: 'ControlCambioIngenieria',
                    entidad_id: created.id,
                    valor_nuevo: JSON.stringify({ codigo, estado: 'PENDIENTE', producto_id: productId }),
                    ip_origen: req.ip
                }
            });
            return created;
        });
        res.status(201).json(change);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al solicitar cambio de ingeniería', details: error.message });
    }
};

export const decideEngineeringChange = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!MANAGEMENT_ROLES.includes(user?.rol)) return res.sendStatus(403);
        const id = Number(req.params.id);
        const { estado, comentarios_aprobacion } = req.body;
        if (!['APROBADO', 'RECHAZADO'].includes(estado)) return res.status(400).json({ error: 'La decisión debe ser APROBADO o RECHAZADO.' });
        const result = await prisma.$transaction(async tx => {
            const current = await tx.controlCambioIngenieria.findUnique({ where: { id } });
            if (!current) throw Object.assign(new Error('Cambio de ingeniería no encontrado.'), { status: 404 });
            if (current.estado !== 'PENDIENTE') throw Object.assign(new Error('Solo se pueden decidir cambios pendientes.'), { status: 409 });
            const updated = await tx.controlCambioIngenieria.update({
                where: { id },
                data: {
                    estado,
                    usuario_aprobador_id: Number(user.id),
                    fecha_efectiva: estado === 'APROBADO' ? new Date() : null,
                    comentarios_aprobacion: comentarios_aprobacion || null
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Aprobador',
                    accion: `CAMBIO_INGENIERIA_${estado}`,
                    modulo: 'CALIDAD',
                    entidad: 'ControlCambioIngenieria',
                    entidad_id: id,
                    valor_anterior: JSON.stringify({ estado: current.estado }),
                    valor_nuevo: JSON.stringify({ estado, fecha_efectiva: updated.fecha_efectiva }),
                    ip_origen: req.ip
                }
            });
            return updated;
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ error: error.message || 'Error al decidir cambio de ingeniería' });
    }
};

export const createQualityCost = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!MANAGEMENT_ROLES.includes(user?.rol)) return res.sendStatus(403);
        const { categoria, descripcion, monto, fecha, origen, numero_referencia, no_conformidad_id, reclamo_id } = req.body;
        const categories = ['FALLA_INTERNA', 'FALLA_EXTERNA', 'PREVENCION_EVALUACION'];
        const amount = Number(monto);
        if (!categories.includes(categoria) || !descripcion?.trim() || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Categoría válida, descripción y monto positivo son obligatorios.' });
        }
        if (no_conformidad_id && reclamo_id) return res.status(400).json({ error: 'Un costo no puede vincularse simultáneamente a una NC y a un reclamo.' });
        const costDate = fecha ? new Date(fecha) : new Date();
        if (Number.isNaN(costDate.getTime())) return res.status(400).json({ error: 'Fecha del costo inválida.' });
        const cost = await prisma.$transaction(async tx => {
            const record = await tx.costoNoCalidad.create({
                data: {
                    categoria,
                    descripcion: descripcion.trim(),
                    monto: amount,
                    fecha: costDate,
                    origen: origen || null,
                    numero_referencia: numero_referencia || null,
                    no_conformidad_id: no_conformidad_id ? Number(no_conformidad_id) : null,
                    reclamo_id: reclamo_id ? Number(reclamo_id) : null,
                    creado_por: user.nombre || String(user.id)
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Usuario',
                    accion: 'REGISTRO_COSTO_NO_CALIDAD',
                    modulo: 'FINANZAS',
                    entidad: 'CostoNoCalidad',
                    entidad_id: record.id,
                    valor_nuevo: JSON.stringify({ categoria, monto: amount, descripcion: descripcion.trim() }),
                    ip_origen: req.ip
                }
            });
            return record;
        });
        res.status(201).json(cost);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar costo de no calidad', details: error.message });
    }
};

export const getEthicsAcceptance = async (req: Request, res: Response) => {
    try {
        const userId = Number((req as any).user?.id);
        const latest = await prisma.aceptacionEtica.findFirst({
            where: { usuario_id: userId, version: ETHICS_POLICY_VERSION },
            orderBy: { aceptado_en: 'desc' }
        });
        const validSince = new Date();
        validSince.setDate(validSince.getDate() - 90);
        res.json({
            version: ETHICS_POLICY_VERSION,
            required: !latest || latest.aceptado_en < validSince,
            acceptedAt: latest?.aceptado_en || null
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar aceptación ética', details: error.message });
    }
};

export const acceptEthicsPolicy = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (req.body.version !== ETHICS_POLICY_VERSION || req.body.accepted !== true) {
            return res.status(400).json({ error: 'Confirma la versión vigente de la política para registrar la aceptación.' });
        }
        const result = await prisma.$transaction(async tx => {
            const acceptance = await tx.aceptacionEtica.create({
                data: {
                    usuario_id: Number(user.id),
                    version: ETHICS_POLICY_VERSION,
                    ip_origen: req.ip
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Usuario',
                    accion: 'ACEPTACION_POLITICA_ETICA',
                    modulo: 'CALIDAD',
                    entidad: 'AceptacionEtica',
                    entidad_id: acceptance.id,
                    valor_nuevo: JSON.stringify({ version: acceptance.version, aceptado_en: acceptance.aceptado_en }),
                    ip_origen: req.ip
                }
            });
            return acceptance;
        });
        res.status(201).json({ version: result.version, required: false, acceptedAt: result.aceptado_en });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar aceptación ética', details: error.message });
    }
};

export const getQualityContext = async (_req: Request, res: Response) => {
    try {
        const contextEvaluations = await prisma.evaluacionContextoCalidad.findMany({
            orderBy: { fecha_revision: 'asc' }
        });
        res.json(contextEvaluations);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar evaluaciones de contexto', details: error.message });
    }
};

export const createQualityContext = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { factor, origen, cambio_climatico_relevante, impacto_cadena_suministro, impacto_sostenibilidad, respuesta_planificada, responsable, fecha_revision } = req.body;
        const reviewDate = new Date(fecha_revision);
        if (!factor?.trim() || !['INTERNO', 'EXTERNO'].includes(origen) ||
            !impacto_cadena_suministro?.trim() || !impacto_sostenibilidad?.trim() ||
            !respuesta_planificada?.trim() || !responsable?.trim() || Number.isNaN(reviewDate.getTime())) {
            return res.status(400).json({ error: 'Completa el factor, origen, impactos, respuesta, responsable y fecha de revisión.' });
        }
        const result = await prisma.$transaction(async tx => {
            const context = await tx.evaluacionContextoCalidad.create({
                data: {
                    factor: factor.trim(),
                    origen,
                    cambio_climatico_relevante: Boolean(cambio_climatico_relevante),
                    impacto_cadena_suministro: impacto_cadena_suministro.trim(),
                    impacto_sostenibilidad: impacto_sostenibilidad.trim(),
                    respuesta_planificada: respuesta_planificada.trim(),
                    responsable: responsable.trim(),
                    fecha_revision: reviewDate,
                    creado_por: user.nombre || String(user.id)
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Usuario',
                    accion: 'EVALUACION_CONTEXTO_CALIDAD',
                    modulo: 'CALIDAD',
                    entidad: 'EvaluacionContextoCalidad',
                    entidad_id: context.id,
                    valor_nuevo: JSON.stringify(context),
                    ip_origen: req.ip
                }
            });
            return context;
        });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar evaluación de contexto', details: error.message });
    }
};

export const getLeadershipCommitments = async (_req: Request, res: Response) => {
    try {
        const commitments = await prisma.compromisoDireccionCalidad.findMany({
            include: { usuario: { select: { id: true, nombre: true } } },
            orderBy: { aprobado_en: 'desc' }
        });
        res.json(commitments);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar compromisos de dirección', details: error.message });
    }
};

export const createLeadershipCommitment = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!['Administrador', 'Gerencia'].includes(user?.rol)) return res.sendStatus(403);
        const { version, compromiso, objetivos } = req.body;
        if (!version?.trim() || !compromiso?.trim()) return res.status(400).json({ error: 'Versión y declaración de compromiso son obligatorias.' });
        const result = await prisma.$transaction(async tx => {
            const record = await tx.compromisoDireccionCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    version: version.trim(),
                    compromiso: compromiso.trim(),
                    objetivos: objetivos?.trim() || null
                }
            });
            await tx.auditoriaRegistroCalidad.create({
                data: {
                    usuario_id: Number(user.id),
                    usuario_nombre: user.nombre || 'Dirección',
                    accion: 'COMPROMISO_DIRECCION_CALIDAD',
                    modulo: 'CALIDAD',
                    entidad: 'CompromisoDireccionCalidad',
                    entidad_id: record.id,
                    valor_nuevo: JSON.stringify({ version: record.version, compromiso: record.compromiso }),
                    ip_origen: req.ip
                }
            });
            return record;
        });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar compromiso de dirección', details: error.message });
    }
};
