import { Request, Response } from 'express';
import prisma from '../prisma';

// --- MAQUINAS (MAESTRO) ---
export const getMaquinas = async (req: Request, res: Response) => {
    try {
        const maquinas = await prisma.maquina.findMany({
            include: {
                planesMantenimiento: true,
                mantenimientos: { orderBy: { fecha_programada: 'asc' } },
                reportesFallas: { where: { estado: { not: 'Cerrado' } } },
                ordenesMantenimiento: { where: { estado: { not: 'Cerrada' } } }
            }
        });
        res.json(maquinas);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machines' });
    }
};

export const updateMaquina = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const maquina = await prisma.maquina.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.json(maquina);
    } catch (error) {
        res.status(500).json({ error: 'Error updating machine' });
    }
};

export const getMachineDetail = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const maquina = await prisma.maquina.findUnique({
            where: { id: Number(id) },
            include: {
                planesMantenimiento: true,
                mantenimientos: { orderBy: { fecha_programada: 'desc' }, take: 10 },
                reportesFallas: { orderBy: { fecha_reporte: 'desc' }, take: 10 },
                ordenesMantenimiento: { orderBy: { fecha_inicio: 'desc' }, take: 10 }
            }
        });
        res.json(maquina);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machine details' });
    }
};

// --- PREVENTIVO (PLANES Y EJECUCIONES) ---
export const createMaintenancePlan = async (req: Request, res: Response) => {
    try {
        const plan = await prisma.planMantenimiento.create({
            data: {
                ...req.body,
                maquina_id: Number(req.body.maquina_id),
                frecuencia_dias: Number(req.body.frecuencia_dias)
            }
        });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Error creating plan' });
    }
};

export const scheduleMaintenance = async (req: Request, res: Response) => {
    try {
        const mtto = await prisma.mantenimientoPreventivo.create({
            data: {
                ...req.body,
                maquina_id: Number(req.body.maquina_id),
                plan_id: req.body.plan_id ? Number(req.body.plan_id) : null,
                fecha_programada: new Date(req.body.fecha_programada)
            }
        });
        res.json(mtto);
    } catch (error) {
        res.status(500).json({ error: 'Error scheduling maintenance' });
    }
};

export const completeMaintenance = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fecha_realizada, observaciones, tecnico_responsable, costo_mantenimiento } = req.body;
    try {
        const mtto = await prisma.mantenimientoPreventivo.update({
            where: { id: Number(id) },
            data: {
                fecha_realizada: new Date(fecha_realizada),
                observaciones,
                tecnico_responsable,
                costo_mantenimiento: Number(costo_mantenimiento),
                estado: 'Realizado'
            }
        });
        res.json(mtto);
    } catch (error) {
        res.status(500).json({ error: 'Error completing maintenance' });
    }
};

export const getAllMaintenance = async (req: Request, res: Response) => {
    try {
        const preventivos = await prisma.mantenimientoPreventivo.findMany({ include: { maquina: true, plan: true } });
        const correctivos = await prisma.ordenMantenimiento.findMany({ where: { tipo: 'Correctivo' }, include: { maquina: true } });
        res.json({ preventivos, correctivos });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching balance' });
    }
};

// --- CORRECTIVO (FALLAS Y OM) ---
export const getReportesFallas = async (req: Request, res: Response) => {
    try {
        const reportes = await prisma.reporteFalla.findMany({
            include: { maquina: true, ordenesMantenimiento: true },
            orderBy: { fecha_reporte: 'desc' }
        });
        res.json(reportes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching failure reports' });
    }
};

export const createReporteFalla = async (req: Request, res: Response) => {
    try {
        const { maquina_id, reportado_por, descripcion, prioridad } = req.body;
        const reporte = await prisma.reporteFalla.create({
            data: {
                maquina_id: Number(maquina_id),
                reportado_por,
                descripcion,
                prioridad,
                estado: 'Pendiente'
            }
        });
        
        await prisma.maquina.update({
            where: { id: Number(maquina_id) },
            data: { estado: 'Fuera de servicio' }
        });

        res.json(reporte);
    } catch (error) {
        res.status(500).json({ error: 'Error creating failure report' });
    }
};

// --- ORDENES DE MANTENIMIENTO ---
export const getOrdenesMantenimiento = async (req: Request, res: Response) => {
    try {
        const ordenes = await prisma.ordenMantenimiento.findMany({
            include: { maquina: true, falla: true },
            orderBy: { fecha_inicio: 'desc' }
        });
        res.json(ordenes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching maintenance orders' });
    }
};

export const createOrdenMantenimiento = async (req: Request, res: Response) => {
    try {
        const { maquina_id, falla_id, tipo, tecnico, actividades, repuestos } = req.body;
        
        const orden = await prisma.ordenMantenimiento.create({
            data: {
                maquina_id: Number(maquina_id),
                falla_id: falla_id ? Number(falla_id) : null,
                tipo,
                tecnico,
                actividades,
                repuestos,
                estado: 'Abierta'
            }
        });

        if (falla_id) {
            await prisma.reporteFalla.update({
                where: { id: Number(falla_id) },
                data: { estado: 'En proceso' }
            });
        }

        res.json(orden);
    } catch (error) {
        res.status(500).json({ error: 'Error creating maintenance order' });
    }
};

export const closeOrdenMantenimiento = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { actividades, repuestos, tiempo_muerto_hrs, costo } = req.body;
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            const orden = await tx.ordenMantenimiento.update({
                where: { id: Number(id) },
                data: {
                    actividades,
                    repuestos,
                    tiempo_muerto_hrs: Number(tiempo_muerto_hrs),
                    costo: Number(costo),
                    estado: 'Cerrada',
                    fecha_fin: new Date()
                }
            });

            if (orden.falla_id) {
                await tx.reporteFalla.update({
                    where: { id: orden.falla_id },
                    data: { estado: 'Cerrado' }
                });
            }

            await tx.maquina.update({
                where: { id: orden.maquina_id },
                data: { estado: 'Operativa' }
            });

            return orden;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error closing maintenance order' });
    }
};

// --- KPIs ---
export const getMaintenanceKPIs = async (req: Request, res: Response) => {
    try {
        const closedCorrective = await prisma.ordenMantenimiento.findMany({
            where: { tipo: 'Correctivo', estado: 'Cerrada', fecha_fin: { not: null } }
        });

        let totalRepairTimeHrs = 0;
        closedCorrective.forEach(o => {
            if (o.fecha_fin) {
                const diff = (new Date(o.fecha_fin).getTime() - new Date(o.fecha_inicio).getTime()) / (1000 * 60 * 60);
                totalRepairTimeHrs += diff;
            }
        });

        const mttr = closedCorrective.length > 0 ? (totalRepairTimeHrs / closedCorrective.length).toFixed(2) : 0;
        const totalDowntime = await prisma.ordenMantenimiento.aggregate({ _sum: { tiempo_muerto_hrs: true } });

        res.json({
            mttr,
            totalDowntime: totalDowntime._sum.tiempo_muerto_hrs || 0,
            totalOrders: await prisma.ordenMantenimiento.count(),
            pendingFallas: await prisma.reporteFalla.count({ where: { estado: 'Pendiente' } })
        });
    } catch (error) {
        res.status(500).json({ error: 'Error calculating KPIs' });
    }
};

export const uploadMaintenanceImages = async (req: Request, res: Response) => {
    const { id } = req.params;
    const files = (req as any).files;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
    }

    try {
        const imageRecords = files.map((file: any) => ({
            mantenimiento_id: Number(id),
            url: `/images/${file.filename}`
        }));

        await prisma.fotoMantenimiento.createMany({
            data: imageRecords
        });

        const updatedMtto = await prisma.mantenimientoPreventivo.findUnique({
            where: { id: Number(id) },
            include: { fotos: true }
        });

        res.json(updatedMtto);
    } catch (error) {
        console.error('uploadMaintenanceImages error:', error);
        res.status(500).json({ error: 'Error uploading maintenance images' });
    }
};
