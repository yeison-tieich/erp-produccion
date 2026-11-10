import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
    TrendingUp, Award, DollarSign, FileCheck, Layers,
    RefreshCw, Factory, Wrench, Users, Truck, ArrowUpRight, Search
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { qualityService, QualityDashboardData } from '../../services/qualityService';
import { Link } from 'react-router-dom';

const COLORS = ['#2563eb', '#ca8a04', '#16a34a', '#dc2626', '#9333ea', '#0891b2'];

export const QualityDashboard = () => {
    const [data, setData] = useState<QualityDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCostForm, setShowCostForm] = useState(false);
    const [savingCost, setSavingCost] = useState(false);
    const [costForm, setCostForm] = useState({
        categoria: 'FALLA_INTERNA' as 'FALLA_INTERNA' | 'FALLA_EXTERNA' | 'PREVENCION_EVALUACION',
        descripcion: '',
        monto: '',
        origen: '',
        numero_referencia: ''
    });

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await qualityService.getDashboard();
            setData(res);
        } catch (error) {
            console.error('Error fetching quality dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleCreateQualityCost = async (event: React.FormEvent) => {
        event.preventDefault();
        setSavingCost(true);
        try {
            await qualityService.createQualityCost({ ...costForm, monto: Number(costForm.monto) });
            setCostForm({ categoria: 'FALLA_INTERNA', descripcion: '', monto: '', origen: '', numero_referencia: '' });
            setShowCostForm(false);
            await fetchDashboard();
        } catch (error: any) {
            alert(error.response?.data?.error || 'No fue posible registrar el costo de no calidad.');
        } finally {
            setSavingCost(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-600">Cargando Dashboard de Calidad ISO 9001...</p>
                </div>
            </div>
        );
    }

    const m = data?.metricas;
    const g = data?.graficos;
    const qualityCost = m?.costosNoCalidadPorCategoria;
    const nonQualityCosts = [
        { name: 'Fallas internas', value: qualityCost?.FALLA_INTERNA || 0, fill: '#dc2626' },
        { name: 'Fallas externas', value: qualityCost?.FALLA_EXTERNA || 0, fill: '#ea580c' },
        { name: 'Prevención / evaluación', value: qualityCost?.PREVENCION_EVALUACION || 0, fill: '#2563eb' }
    ];

    return (
        <div className="w-full min-w-0 space-y-6 overflow-x-hidden pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ISO 9001:2015
                        </span>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Calidad</h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Control operacional, aseguramiento de producto, acciones correctivas y trazabilidad integral.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={fetchDashboard}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white rounded-xl border border-black/5 shadow-sm transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Actualizar
                    </button>
                    <Link
                        to="/quality/inspections"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm transition-all"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Nueva Inspección
                    </Link>
                </div>
            </div>

            {/* Quick Access Badges Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <Link to="/quality/inspections" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Inspecciones ({m?.totalInspecciones || 0})
                </Link>
                <Link to="/quality/non-conformances" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    No Conformidades ({m?.ncAbiertas || 0} abiertas)
                </Link>
                <Link to="/quality/corrective-actions" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Acciones Correctivas ({m?.acAbiertas || 0})
                </Link>
                <Link to="/quality/control-plans" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Planes de Control
                </Link>
                <Link to="/quality/traceability" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Trazabilidad 360°
                </Link>
                <Link to="/quality/risks" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Riesgos & Auditorías
                </Link>
                <Link to="/quality/documents" className="px-3 py-1.5 rounded-lg bg-white/60 hover:bg-white text-slate-700 font-medium border border-black/5 shadow-xs whitespace-nowrap">
                    Documentos SGC
                </Link>
            </div>

            {/* Top KPI Cards Grid */}
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
                {/* 1. % Aprobación */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">Aprobación</span>
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{m?.porcentajeAprobacion}%</div>
                    <p className="text-[10px] text-emerald-700 mt-1 font-medium">Rechazo: {m?.porcentajeRechazo}%</p>
                </div>

                {/* 2. PPM / Defectos */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">PPM Defectos</span>
                        <Award className="w-4 h-4 shrink-0 text-brand-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{m?.ppmDefectos?.toLocaleString()}</div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Partes por millón</p>
                </div>

                {/* 3. OTs Pendientes Inspección */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">OTs x Inspeccionar</span>
                        <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-700">{m?.otPendientesInspeccion}</div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">{m?.otEnProceso} OTs en proceso</p>
                </div>

                {/* 4. OTs Retenidas */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">OTs Retenidas</span>
                        <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    </div>
                    <div className="text-2xl font-black text-rose-700">{m?.otRetenidas}</div>
                    <p className="text-[10px] text-rose-600 font-bold mt-1">Despacho bloqueado</p>
                </div>

                {/* 5. NC Abiertas & Vencidas */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">No Conformidades</span>
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{m?.ncAbiertas}</div>
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">
                        {m?.ncVencidas ? `${m.ncVencidas} vencidas` : '0 vencidas'}
                    </p>
                </div>

                {/* 6. Costo de No Calidad */}
                <div className="glass-panel relative min-w-0 overflow-hidden rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider">Costo No Calidad</span>
                        <DollarSign className="w-4 h-4 shrink-0 text-rose-600" />
                    </div>
                    <div className="text-xl font-black text-slate-900 truncate">
                        ${Number(m?.costoNoCalidadTotal || 0).toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Reclamos + NCs</p>
                </div>
            </div>

            <section className="glass-panel rounded-2xl p-5">
                <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="flex items-center gap-2 font-bold text-slate-900">
                            <DollarSign className="h-5 w-5 text-rose-600" /> Costo de No Calidad (CoNC)
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">Costos registrados en el ERP por categoría contable.</p>
                    </div>
                    <strong className="text-lg font-black text-slate-900">
                        {Number(m?.costoNoCalidadTotal || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    </strong>
                </div>
                <div className="mb-3 flex justify-end">
                    <button type="button" onClick={() => setShowCostForm(value => !value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        {showCostForm ? 'Cerrar registro' : 'Registrar costo CoNC'}
                    </button>
                </div>
                {showCostForm && (
                    <form onSubmit={handleCreateQualityCost} className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-700">Categoría
                            <select value={costForm.categoria} onChange={event => setCostForm({ ...costForm, categoria: event.target.value as typeof costForm.categoria })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <option value="FALLA_INTERNA">Fallas internas (scrap / retrabajo)</option>
                                <option value="FALLA_EXTERNA">Fallas externas (devoluciones / reclamos)</option>
                                <option value="PREVENCION_EVALUACION">Prevención y evaluación (auditorías / calibración)</option>
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-700">Monto (COP)
                            <input required min="0.01" step="0.01" type="number" value={costForm.monto} onChange={event => setCostForm({ ...costForm, monto: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                        </label>
                        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Descripción
                            <input required value={costForm.descripcion} onChange={event => setCostForm({ ...costForm, descripcion: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Ej. Horas de retrabajo OT..." />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">Origen
                            <input value={costForm.origen} onChange={event => setCostForm({ ...costForm, origen: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="NC, devolución, auditoría..." />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">Referencia
                            <input value={costForm.numero_referencia} onChange={event => setCostForm({ ...costForm, numero_referencia: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="OT / NC / comprobante" />
                        </label>
                        <div className="sm:col-span-2 flex justify-end">
                            <button type="submit" disabled={savingCost} className="rounded-lg bg-brand-400 px-4 py-2 text-xs font-bold text-brand-950 disabled:opacity-50">
                                {savingCost ? 'Guardando...' : 'Guardar costo'}
                            </button>
                        </div>
                    </form>
                )}
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={nonQualityCosts} layout="vertical" margin={{ top: 4, right: 20, left: 16, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => Number(value).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} />
                            <Bar dataKey="value" name="Costo" radius={[0, 6, 6, 0]}>
                                {nonQualityCosts.map(item => <Cell key={item.name} fill={item.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Main Operational Flow Status Cards */}
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
                {/* OTs Status Breakdown */}
                <div className="glass-panel flex min-w-0 flex-col justify-between rounded-2xl p-5">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                <Factory className="w-4 h-4 text-brand-600" />
                                Estado de Órdenes de Trabajo
                            </h3>
                            <Link to="/orders" className="text-xs text-brand-700 hover:underline flex items-center gap-0.5">
                                Ver OTs <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="min-w-0 break-words text-slate-600">OTs Aprobadas / Liberadas</span>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{m?.otAprobadas}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="min-w-0 break-words text-slate-600">OTs Pendientes de Inspección</span>
                                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">{m?.otPendientesInspeccion}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="min-w-0 break-words text-slate-600">OTs Retenidas (Calidad)</span>
                                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700">{m?.otRetenidas}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 py-1 text-xs">
                                <span className="min-w-0 break-words text-slate-600">OTs Rechazadas</span>
                                <span className="shrink-0 font-bold text-rose-600">{m?.otRechazadas}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones Correctivas (CAPA) */}
                <div className="glass-panel flex min-w-0 flex-col justify-between rounded-2xl p-5">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-blue-600" />
                                Acciones Correctivas (CAPA)
                            </h3>
                            <Link to="/quality/corrective-actions" className="text-xs text-blue-700 hover:underline flex items-center gap-0.5">
                                Ver CAPA <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="text-slate-600">Acciones Abiertas / En Proceso</span>
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{m?.acAbiertas}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="text-slate-600">Acciones Vencidas</span>
                                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{m?.acVencidas}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 py-1 text-xs">
                                <span className="text-slate-600">Total Inspecciones Realizadas</span>
                                <span className="font-bold text-slate-800">{m?.totalInspecciones}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clientes y Reclamos */}
                <div className="glass-panel flex min-w-0 flex-col justify-between rounded-2xl p-5">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-600" />
                                Reclamos & Satisfacción
                            </h3>
                            <Link to="/quality/claims" className="text-xs text-purple-700 hover:underline flex items-center gap-0.5">
                                Ver Reclamos <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="text-slate-600">Reclamos Totales</span>
                                <span className="font-bold text-slate-800">{m?.totalReclamos}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 border-b border-black/5 py-1 text-xs">
                                <span className="text-slate-600">Reclamos Abiertos</span>
                                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{m?.reclamosAbiertos}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2 py-1 text-xs">
                                <span className="text-slate-600">Devoluciones de Producto</span>
                                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{m?.devoluciones}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1: Tendencia y Defectos por Tipo */}
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Tendencia Mensual de NC */}
                <div className="glass-panel min-w-0 overflow-hidden rounded-2xl p-5">
                    <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-600" />
                        Tendencia de No Conformidades (Últimos 6 meses)
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">Comportamiento temporal de eventos de no calidad registrados en planta.</p>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={g?.tendenciaMensual || []}>
                                <defs>
                                    <linearGradient id="colorNC" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" name="No Conformidades" stroke="#ca8a04" strokeWidth={2} fillOpacity={1} fill="url(#colorNC)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Defectos por Tipo / Proceso */}
                <div className="glass-panel min-w-0 overflow-hidden rounded-2xl p-5">
                    <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Distribución de Defectos por Categoría
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">Clasificación de fallas (Dimensional, Visual, Material, etc.).</p>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={g?.defectosPorTipo || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="count" name="Cantidad" fill="#2563eb" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Defectos por Máquina y Defectos por Proveedor */}
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Defectos por Máquina (Mantenimiento + Calidad) */}
                <div className="glass-panel min-w-0 overflow-hidden rounded-2xl p-5">
                    <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        Defectos por Máquina (Mantenimiento & Calidad)
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">Identifica los centros de maquinado con mayor tasa de no conformidad.</p>
                    <div className="h-60 w-full">
                        {g?.defectosPorMaquina && g.defectosPorMaquina.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={g.defectosPorMaquina}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Defectos" fill="#e11d48" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Sin defectos asociados a máquinas
                            </div>
                        )}
                    </div>
                </div>

                {/* Reclamos por Cliente */}
                <div className="glass-panel min-w-0 overflow-hidden rounded-2xl p-5">
                    <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Reclamos por Cliente
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">Reclamos y devoluciones reportadas externamente por clientes.</p>
                    <div className="h-60 w-full">
                        {g?.reclamosPorCliente && g.reclamosPorCliente.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={g.reclamosPorCliente}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Reclamos" fill="#9333ea" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Sin reclamos registrados
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
