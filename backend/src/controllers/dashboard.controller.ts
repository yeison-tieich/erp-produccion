
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Fecha del mes actual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Órdenes activas (En Progreso)
        const ordenes_activas = await prisma.ordenTrabajo.count({
            where: { estado_ot: 'En Progreso' }
        });

        // 2. Órdenes pendientes
        const ordenes_pendientes = await prisma.ordenTrabajo.count({
            where: { estado_ot: 'Pendiente' }
        });

        // 3. Órdenes completadas este mes
        const ordenes_completadas_mes = await prisma.ordenTrabajo.count({
            where: {
                estado_ot: 'Completada',
                fecha_fin_real: { gte: firstDayOfMonth }
            }
        });

        // 4. Todas las tareas completadas del mes para calcular eficiencia
        const tareasCompletadas = await prisma.tareaProduccion.findMany({
            where: {
                estado_tarea: 'Completada',
                fecha_hora_fin: { gte: firstDayOfMonth }
            },
            include: {
                rutaFabricacion: true
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
            where: { estado_tarea: 'En Progreso' },
            select: { personal_id: true }
        });
        const operarios_activos = new Set(tareasEnProgreso.map(t => t.personal_id).filter(id => id !== null)).size;

        // 6. Total de personal
        const total_personal = await prisma.personal.count();

        // 7. Alertas de stock (materias primas bajo punto de reorden)
        const alertas_stock = await prisma.materiaPrima.count({
            where: {
                stock_actual: { lte: prisma.materiaPrima.fields.punto_reorden }
            }
        });

        // 8. Costo total del mes
        const ordenesDelMes = await prisma.ordenTrabajo.findMany({
            where: {
                fecha_creacion: { gte: firstDayOfMonth }
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
                duracion_total_real_min: { gt: 0 }
            },
            select: { duracion_total_real_min: true }
        });
        const tiempo_promedio_orden = ordenesConTiempo.length > 0
            ? ordenesConTiempo.reduce((sum, o) => sum + (o.duracion_total_real_min || 0), 0) / ordenesConTiempo.length
            : 0;

        // 11. Órdenes por estado
        const allOrders = await prisma.ordenTrabajo.groupBy({
            by: ['estado_ot'],
            _count: { id: true }
        });
        const ordenes_por_estado = allOrders.map(o => ({
            estado: o.estado_ot,
            cantidad: o._count.id
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
                    }
                },
                select: { cantidad_buena: true }
            });

            const piezas = tareasDelDia.reduce((sum, t) => sum + (t.cantidad_buena || 0), 0);
            produccion_semanal.push({
                dia: diasSemana[inicioDia.getDay()],
                piezas
            });
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
            produccion_semanal
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Error fetching dashboard statistics' });
    }
};
