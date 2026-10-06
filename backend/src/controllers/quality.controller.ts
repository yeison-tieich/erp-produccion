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
        const ncs = await prisma.noConformidad.findMany({ select: { costo_estimado: true } });
        const reclamos = await prisma.reclamoCliente.findMany({ select: { costo_estimado: true } });
        const costoNC = ncs.reduce((sum, item) => sum + Number(item.costo_estimado || 0), 0);
        const costoReclamos = reclamos.reduce((sum, item) => sum + Number(item.costo_estimado || 0), 0);
        const costoNoCalidadTotal = costoNC + costoReclamos;

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
                costoNoCalidadTotal
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
        const { proceso, tipo, estado } = req.query;
        const where: any = {};
        if (proceso) where.proceso = String(proceso);
        if (tipo) where.tipo = String(tipo);
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
            orderBy: { nivel_riesgo: 'desc' }
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
            proceso,
            descripcion,
            causa,
            consecuencia,
            probabilidad,
            impacto,
            estrategia,
            plan_accion,
            personal_id,
            maquina_id,
            producto_id,
            proveedor_id,
            cliente_id
        } = req.body;

        const p = Number(probabilidad || 1);
        const i = Number(impacto || 1);
        const nivel = p * i;

        const count = await prisma.riesgoCalidad.count();
        const codigo = `RIE-${(count + 1).toString().padStart(3, '0')}`;

        const risk = await prisma.riesgoCalidad.create({
            data: {
                codigo,
                tipo: tipo || 'RIESGO',
                proceso: proceso || 'Producción',
                descripcion,
                causa: causa || null,
                consecuencia: consecuencia || null,
                probabilidad: p,
                impacto: i,
                nivel_riesgo: nivel,
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
            probabilidad,
            impacto,
            estrategia,
            plan_accion,
            personal_id,
            estado
        } = req.body;

        const p = probabilidad !== undefined ? Number(probabilidad) : undefined;
        const i = impacto !== undefined ? Number(impacto) : undefined;
        const current = await prisma.riesgoCalidad.findUnique({ where: { id: Number(id) } });
        if (!current) return res.status(404).json({ error: 'Riesgo no encontrado' });

        const finalP = p !== undefined ? p : current.probabilidad;
        const finalI = i !== undefined ? i : current.impacto;

        const updated = await prisma.riesgoCalidad.update({
            where: { id: Number(id) },
            data: {
                proceso,
                descripcion,
                causa,
                consecuencia,
                probabilidad: finalP,
                impacto: finalI,
                nivel_riesgo: finalP * finalI,
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
        const { nombre, contacto, telefono, email, direccion, calificacion } = req.body;
        const supplier = await prisma.proveedor.create({
            data: {
                nombre,
                contacto,
                telefono,
                email,
                direccion,
                calificacion: calificacion !== undefined && calificacion !== '' ? Number(calificacion) : 100
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
        const { nombre, contacto, telefono, email, direccion, activo, calificacion } = req.body;
        const supplier = await prisma.proveedor.update({
            where: { id: Number(id) },
            data: {
                nombre,
                contacto,
                telefono,
                email,
                direccion,
                activo: activo !== undefined ? Boolean(activo) : undefined,
                calificacion: calificacion !== undefined && calificacion !== '' ? Number(calificacion) : undefined
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
