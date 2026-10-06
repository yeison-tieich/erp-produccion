import { Request, Response } from 'express';
import prisma from '../prisma';

export const getFinancialSummary = async (req: Request, res: Response) => {
    try {
        // Raw / aggregated data calculations
        const materiaPrima = await prisma.materiaPrima.findMany();
        const totalMPCost = materiaPrima.reduce((acc, mp) => acc + (Number(mp.stock_actual) * Number(mp.costo_unitario || 0)), 0);

        const ordenes = await prisma.ordenTrabajo.findMany({
            include: {
                producto: true,
                tareas: {
                    include: { maquina: true, personal: true }
                }
            }
        });

        const totalProductionCost = ordenes.reduce((acc, o) => acc + Number(o.costo_total_real || 0), 0);
        
        const mantenimientos = await prisma.mantenimientoPreventivo.findMany();
        const totalMaintenanceCost = mantenimientos.reduce((acc, m) => acc + Number(m.costo_mantenimiento || 0), 0);

        const herramientas = await prisma.herramientaConsumible.findMany();
        const totalToolsCost = herramientas.reduce((acc, h) => acc + (Number(h.cantidad_total) * Number(h.costo_unitario || 0)), 0);

        const personal = await prisma.personal.findMany();
        const totalPayroll = personal.reduce((acc, p) => acc + Number(p.salario || 0) + Number(p.prestaciones || 0) + Number(p.recargos || 0), 0);

        const ncs = await prisma.noConformidad.findMany({ select: { costo_estimado: true } });
        const reclamos = await prisma.reclamoCliente.findMany({ select: { costo_estimado: true } });
        const totalNC = ncs.reduce((acc, nc) => acc + Number(nc.costo_estimado || 0), 0);
        const totalClaims = reclamos.reduce((acc, r) => acc + Number(r.costo_estimado || 0), 0);
        const totalNonQualityCost = totalNC + totalClaims;

        const totalRevenue = ordenes.reduce((acc, o) => acc + (Number(o.cantidad_fabricar) * Number(o.precio_venta || 0)), 0);
        const totalCosts = totalMPCost + totalProductionCost + totalMaintenanceCost + totalToolsCost + totalPayroll;
        const profitability = totalRevenue - totalCosts;

        res.json({
            costos: {
                materiaPrima: totalMPCost,
                produccion: totalProductionCost,
                mantenimiento: totalMaintenanceCost,
                herramientas: totalToolsCost,
                nomina: totalPayroll,
                noCalidad: totalNonQualityCost,
                total: totalCosts
            },
            ingresos: totalRevenue,
            rentabilidad: profitability,
            margenPorcentaje: totalRevenue > 0 ? Number(((profitability / totalRevenue) * 100).toFixed(2)) : 0
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al calcular resumen financiero', details: error.message });
    }
};

export const getOrderCosts = async (req: Request, res: Response) => {
    try {
        const ordenes = await prisma.ordenTrabajo.findMany({
            include: {
                producto: { include: { listaMateriales: { include: { materiaPrima: true } } } },
                tareas: { include: { personal: true, maquina: true } }
            },
            orderBy: { id: 'desc' }
        });

        const report = ordenes.map(o => {
            const mpCost = Number(o.costo_materia_prima || 0);
            const moCost = o.tareas.reduce((sum, t) => sum + Number(t.costo_real || 0), 0);
            const totalCost = mpCost + moCost + Number(o.costos_adicionales || 0);
            const qty = o.cantidad_fabricar || 1;
            const unitCost = totalCost / qty;
            const revenue = (o.cantidad_fabricar || 0) * Number(o.precio_venta || 0);
            const margin = revenue - totalCost;

            return {
                id: o.id,
                numero_ot: o.numero_ot,
                cliente: o.cliente || 'N/A',
                producto: o.producto?.nombre_producto || 'Proyecto Especial',
                cantidad: qty,
                costoMP: mpCost,
                costoMO: moCost,
                costoTotal: totalCost,
                costoUnitario: unitCost,
                ingresoTotal: revenue,
                margen: margin,
                rentabilidadPorcentaje: revenue > 0 ? Number(((margin / revenue) * 100).toFixed(2)) : 0
            };
        });

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener costos por orden', details: error.message });
    }
};

export const getMachineCosts = async (req: Request, res: Response) => {
    try {
        const maquinas = await prisma.maquina.findMany({
            include: {
                mantenimientos: true,
                tareas: true
            }
        });

        const report = maquinas.map(m => {
            const mttoCost = m.mantenimientos.reduce((sum, mt) => sum + Number(mt.costo_mantenimiento || 0), 0);
            const workedHrs = Number(m.horas_acumuladas || 0);
            const costPerHour = Number(m.costo_hora || 0);
            const operationalCost = workedHrs * costPerHour;
            const depreciation = Number(m.depreciacion_anual || 0) / 12;

            return {
                id: m.id,
                codigo: m.codigo,
                nombre: m.nombre,
                horasTrabajadas: workedHrs,
                costoHora: costPerHour,
                costoOperativo: operationalCost,
                costoMantenimiento: mttoCost,
                depreciacionMensual: depreciation,
                costoTotalMaquina: operationalCost + mttoCost + depreciation
            };
        });

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener costos por máquina', details: error.message });
    }
};

export const getPersonalCosts = async (req: Request, res: Response) => {
    try {
        const personal = await prisma.personal.findMany({
            include: {
                tareas: true
            }
        });

        const report = personal.map(p => {
            const salario = Number(p.salario || 0);
            const prestaciones = Number(p.prestaciones || 0);
            const recargos = Number(p.recargos || 0);
            const totalCost = salario + prestaciones + recargos;

            const workedMinutes = p.tareas.reduce((sum, t) => sum + (t.duracion_real_min || 0), 0);
            const workedHours = workedMinutes / 60;
            const hourlyRate = workedHours > 0 ? totalCost / workedHours : Number(p.costo_hora_hombre || 0);

            return {
                id: p.id,
                nombre: p.nombre,
                cedula: p.cedula,
                cargo: p.cargo,
                salario,
                prestaciones,
                recargos,
                costoTotalMes: totalCost,
                horasTrabajadasProductivas: workedHours.toFixed(2),
                costoHoraHombreCalculado: hourlyRate.toFixed(2)
            };
        });

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener costos de personal', details: error.message });
    }
};
