
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const { area } = req.query;
        
        // Base filters for area
        const areaFilter = area && area !== 'TODAS' ? {
            maquina: {
                area_produccion: String(area)
            }
        } : {};

        const orderAreaFilter = area && area !== 'TODAS' ? {
            tareas: {
                some: {
                    maquina: {
                        area_produccion: String(area)
                    }
                }
            }
        } : {};

        // Fecha del mes actual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Órdenes activas (En Progreso)
        const ordenes_activas = await prisma.ordenTrabajo.count({
            where: { 
                estado_ot: 'En Progreso',
                ...orderAreaFilter
            }
        });

        // 2. Órdenes pendientes
        const ordenes_pendientes = await prisma.ordenTrabajo.count({
            where: { 
                estado_ot: 'Pendiente',
                ...orderAreaFilter
            }
        });

        // 3. Órdenes completadas este mes
        const ordenes_completadas_mes = await prisma.ordenTrabajo.count({
            where: {
                estado_ot: 'Completada',
                fecha_fin_real: { gte: firstDayOfMonth },
                ...orderAreaFilter
            }
        });

        // 4. Todas las tareas completadas del mes para calcular eficiencia
        const tareasCompletadas = await prisma.tareaProduccion.findMany({
            where: {
                estado_tarea: 'Completada',
                fecha_hora_fin: { gte: firstDayOfMonth },
                ...(area && area !== 'TODAS' ? areaFilter : {})
            },
            include: {
                rutaFabricacion: true,
                maquina: true
            }
        });

        // Calcular eficiencia promedio (piezas reales vs estimadas)
        let eficiencia_promedio = 0;
        if (tareasCompletadas.length > 0) {
            const eficiencias = tareasCompletadas.map(t => {
                const estimado = t.rutaFabricacion?.piezas_por_hora_estimado || 0;
                const real = t.duracion_real_min && t.duracion_real_min > 0
                    ? ((t.cantidad_buena || 0) / (t.duracion_real_min / 60))
                    : 0;
                return estimado > 0 ? (real / estimado) * 100 : 100;
            });
            eficiencia_promedio = eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length;
        }

        // 5. Personal activo (con tareas asignadas en progreso)
        const tareasEnProgreso = await prisma.tareaProduccion.findMany({
            where: { 
                estado_tarea: 'En Progreso',
                ...(area && area !== 'TODAS' ? areaFilter : {})
            },
            select: { personal_id: true }
        });
        const operarios_activos = new Set(tareasEnProgreso.map(t => t.personal_id).filter(id => id !== null)).size;

        // 6. Total de personal (Este no se filtra por área usualmente, o sí?)
        const total_personal = await prisma.personal.count();

        // 7. Alertas de stock (materias primas bajo punto de reorden) - Global
        const alertas_stock = await prisma.materiaPrima.count({
            where: {
                stock_actual: { lte: prisma.materiaPrima.fields.punto_reorden }
            }
        });

        // 8. Costo total del mes
        const ordenesDelMes = await prisma.ordenTrabajo.findMany({
            where: {
                fecha_creacion: { gte: firstDayOfMonth },
                ...orderAreaFilter
            },
            select: { costo_total_real: true }
        });
        const costo_total_mes = ordenesDelMes.reduce((sum, o) => sum + Number(o.costo_total_real || 0), 0);

        // 9. Piezas buenas y malas del mes
        const piezas_buenas_mes = tareasCompletadas.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
        const piezas_malas_mes = tareasCompletadas.reduce((sum, t) => sum + (t.cantidad_mala || 0), 0);

        // 10. Tiempo promedio por orden
        const ordenesConTiempo = await prisma.ordenTrabajo.findMany({
            where: {
                estado_ot: 'Completada',
                duracion_total_real_min: { gt: 0 },
                ...orderAreaFilter
            },
            select: { duracion_total_real_min: true }
        });
        const tiempo_promedio_orden = ordenesConTiempo.length > 0
            ? ordenesConTiempo.reduce((sum, o) => sum + (o.duracion_total_real_min || 0), 0) / ordenesConTiempo.length
            : 0;

        // 11. Órdenes por estado
        const allOrders = await prisma.ordenTrabajo.findMany({
            where: orderAreaFilter,
            select: { estado_ot: true }
        });
        
        const countsByStatus: Record<string, number> = {};
        allOrders.forEach(o => {
            countsByStatus[o.estado_ot] = (countsByStatus[o.estado_ot] || 0) + 1;
        });

        const ordenes_por_estado = Object.entries(countsByStatus).map(([estado, cantidad]) => ({
            estado,
            cantidad
        }));

        // 12. Producción semanal (últimos 7 días)
        const produccion_semanal = [];
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const inicioDia = new Date(fecha.setHours(0, 0, 0, 0));
            const finDia = new Date(fecha.setHours(23, 59, 59, 999));

            const tareasDelDia = await prisma.tareaProduccion.findMany({
                where: {
                    estado_tarea: 'Completada',
                    fecha_hora_fin: {
                        gte: inicioDia,
                        lte: finDia
                    },
                    ...(area && area !== 'TODAS' ? areaFilter : {})
                },
                select: { cantidad_buena: true }
            });

            const piezas = tareasDelDia.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
            produccion_semanal.push({
                dia: diasSemana[inicioDia.getDay()],
                piezas
            });
        }

        // 13. Comparativo por áreas (Solo si no hay filtro de área o es TODAS)
        let comparativo_areas: any[] = [];
        if (!area || area === 'TODAS') {
            const areas = ['TORNOS', 'MECANIZADO', 'SOLDADURA', 'TROQUELERIA'];
            
            for (const a of areas) {
                const tareasArea = await prisma.tareaProduccion.findMany({
                    where: {
                        estado_tarea: 'Completada',
                        fecha_hora_fin: { gte: firstDayOfMonth },
                        maquina: { area_produccion: a }
                    },
                    select: { cantidad_buena: true, duracion_real_min: true }
                });

                const piezas = tareasArea.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
                const tiempo = tareasArea.reduce((sum, t) => sum + (t.duracion_real_min || 0), 0);
                
                comparativo_areas.push({
                    area: a,
                    piezas,
                    tiempo_total_min: tiempo,
                    ordenes: await prisma.ordenTrabajo.count({
                        where: {
                            tareas: {
                                some: {
                                    maquina: { area_produccion: a }
                                }
                            }
                        }
                    })
                });
            }
        }

        res.json({
            ordenes_activas,
            ordenes_pendientes,
            ordenes_completadas_mes,
            eficiencia_promedio: Math.round(eficiencia_promedio * 10) / 10,
            operarios_activos,
            total_personal,
            alertas_stock,
            costo_total_mes: Math.round(costo_total_mes),
            piezas_buenas_mes,
            piezas_malas_mes,
            tiempo_promedio_orden: Math.round(tiempo_promedio_orden),
            ordenes_por_estado,
            produccion_semanal,
            comparativo_areas
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Error fetching dashboard statistics' });
    }
};

export const getMonthlyReport = async (req: Request, res: Response) => {
    try {
        const { month, year, startDate, endDate } = req.query;
        
        let start: Date;
        let end: Date;

        if (startDate && endDate) {
            start = new Date(String(startDate));
            end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999);
        } else {
            const m = month ? Number(month) : new Date().getMonth();
            const y = year ? Number(year) : new Date().getFullYear();
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        }

        const prevStart = new Date(start);
        prevStart.setMonth(prevStart.getMonth() - 1);
        const prevEnd = new Date(end);
        prevEnd.setMonth(prevEnd.getMonth() - 1);

        // Fetch data for current period
        const ordenes = await prisma.ordenTrabajo.findMany({
            where: { fecha_creacion: { gte: start, lte: end } },
            include: { tareas: { include: { rutaFabricacion: true, personal: true } } }
        });

        const tareas = await prisma.tareaProduccion.findMany({
            where: { fecha_hora_fin: { gte: start, lte: end }, estado_tarea: 'Completada' },
            include: { personal: true, rutaFabricacion: true }
        });

        // Fetch data for previous period (for comparison)
        const prevOrdenes = await prisma.ordenTrabajo.findMany({
            where: { fecha_creacion: { gte: prevStart, lte: prevEnd } },
            select: { costo_total_real: true }
        });

        // Production KPIs
        const total_ordenes = ordenes.length;
        const total_piezas = tareas.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        const piezas_por_dia = total_piezas / diffDays;
        const tiempo_total_min = tareas.reduce((sum, t) => sum + (t.duracion_real_min || 0), 0);
        const piezas_por_hora = tiempo_total_min > 0 ? (total_piezas / (tiempo_total_min / 60)) : 0;

        // Cost KPIs
        const costo_total = ordenes.reduce((sum, o) => sum + Number(o.costo_total_real || 0), 0);
        const costo_promedio_orden = total_ordenes > 0 ? costo_total / total_ordenes : 0;
        const costo_promedio_pieza = total_piezas > 0 ? costo_total / total_piezas : 0;
        
        const prevCostoTotal = prevOrdenes.reduce((sum, o) => sum + Number(o.costo_total_real || 0), 0);
        const variacion_costo = prevCostoTotal > 0 ? ((costo_total - prevCostoTotal) / prevCostoTotal) * 100 : 0;

        // Time KPIs
        const tiempo_estimado_total = tareas.reduce((sum, t) => {
            const piezas = (t.cantidad_buena || 0) + (t.cantidad_mala || 0);
            const estimado_hora = t.rutaFabricacion?.piezas_por_hora_estimado || 0;
            return sum + (estimado_hora > 0 ? (piezas / estimado_hora) * 60 : 0);
        }, 0);
        const desviacion_tiempos = tiempo_estimado_total > 0 ? ((tiempo_total_min - tiempo_estimado_total) / tiempo_estimado_total) * 100 : 0;

        // Efficiency per operator
        const efficiencyByOperator: Record<number, { nombre: string, real: number, esperado: number, min: number }> = {};
        tareas.forEach(t => {
            if (t.personal_id && t.personal) {
                if (!efficiencyByOperator[t.personal_id]) {
                    efficiencyByOperator[t.personal_id] = { nombre: t.personal.nombre, real: 0, esperado: 0, min: 0 };
                }
                const real = t.cantidad_buena || 0;
                const estimado_hora = t.rutaFabricacion?.piezas_por_hora_estimado || 0;
                const min = t.duracion_real_min || 0;
                const esperado = (min / 60) * estimado_hora;
                
                efficiencyByOperator[t.personal_id].real += real;
                efficiencyByOperator[t.personal_id].esperado += esperado;
                efficiencyByOperator[t.personal_id].min += min;
            }
        });

        const operarios_ranking = Object.values(efficiencyByOperator).map(o => ({
            nombre: o.nombre,
            eficiencia: o.esperado > 0 ? (o.real / o.esperado) * 100 : 100,
            piezas: o.real,
            horas_trabajadas: Math.round(o.min / 60 * 10) / 10
        })).sort((a, b) => b.eficiencia - a.eficiencia);

        // Chart data: Daily Production
        const produccion_diaria = [];
        const iterDate = new Date(start);
        while (iterDate <= end) {
            const d = new Date(iterDate);
            const startDay = new Date(d.setHours(0,0,0,0));
            const endDay = new Date(d.setHours(23,59,59,999));
            
            const p = tareas.filter(t => t.fecha_hora_fin && t.fecha_hora_fin >= startDay && t.fecha_hora_fin <= endDay)
                           .reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
            
            produccion_diaria.push({
                fecha: startDay.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                piezas: p
            });
            iterDate.setDate(iterDate.getDate() + 1);
        }

        // Data validation
        const ordenes_incompletas = ordenes.filter(o => !o.costo_total_real || Number(o.costo_total_real) === 0).length;

        res.json({
            periodo: { start, end },
            kpis: {
                produccion: {
                    total_ordenes,
                    total_piezas,
                    piezas_por_dia: Math.round(piezas_por_dia),
                    piezas_por_hora: Math.round(piezas_por_hora * 10) / 10
                },
                costos: {
                    costo_total,
                    costo_promedio_orden,
                    costo_promedio_pieza,
                    variacion_costo: Math.round(variacion_costo * 10) / 10
                },
                tiempos: {
                    tiempo_total_min,
                    tiempo_estimado_total: Math.round(tiempo_estimado_total),
                    desviacion_tiempos: Math.round(desviacion_tiempos * 10) / 10
                },
                eficiencia: {
                    promedio: Math.round((operarios_ranking.length > 0 ? operarios_ranking.reduce((a, b) => a + b.eficiencia, 0) / operarios_ranking.length : 0) * 10) / 10
                }
            },
            operarios_ranking,
            produccion_diaria,
            alertas: {
                ordenes_incompletas
            }
        });

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ error: 'Error generating monthly report' });
    }
};
