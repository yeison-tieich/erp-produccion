import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { useAuthStore } from '../store/auth.store';
import { GlassCard } from '../components/ui/GlassCard';
import { WelcomeHeader } from '../components/dashboard/WelcomeHeader';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Activity, Clock, CheckCircle, TrendingUp, TrendingDown,
    Users, AlertTriangle, DollarSign, Factory, Package,
    MoreHorizontal, RefreshCw, Loader2
} from 'lucide-react';
import clsx from 'clsx';

interface DashboardStats {
    ordenes_activas: number;
    ordenes_completadas_mes: number;
    ordenes_pendientes: number;
    eficiencia_promedio: number;
    operarios_activos: number;
    total_personal: number;
    alertas_stock: number;
    costo_total_mes: number;
    piezas_buenas_mes: number;
    piezas_malas_mes: number;
    tiempo_promedio_orden: number;
    ordenes_por_estado: { estado: string; cantidad: number }[];
    produccion_semanal: { dia: string; piezas: number }[];
    comparativo_areas?: { area: string; piezas: number; tiempo_total_min: number; ordenes: number }[];
}

const PIE_COLORS = ['#facc15', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'];

export const Dashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedArea, setSelectedArea] = useState('TODAS');
    const userName = user?.nombre || 'Usuario';

    const areas = ['TODAS', 'TORNOS', 'MECANIZADO', 'SOLDADURA', 'TROQUELERIA'];

    useEffect(() => {
        fetchDashboardData(selectedArea);
    }, [selectedArea]);

    const fetchDashboardData = async (area?: string) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/dashboard/stats`, {
                params: { area: area || selectedArea }
            });
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-red-500">Error cargando datos</p>
                    <button onClick={() => fetchDashboardData()} className="mt-4 px-4 py-2 bg-brand-400 text-brand-950 rounded-xl font-bold text-sm">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Calculate quality rate
    const totalPiezas = stats.piezas_buenas_mes + stats.piezas_malas_mes;
    const tasaCalidad = totalPiezas > 0
        ? ((stats.piezas_buenas_mes / totalPiezas) * 100).toFixed(1)
        : '0';

    // KPI Cards data
    const kpiCards = [
        {
            title: 'OTs En Progreso',
            value: stats.ordenes_activas.toString(),
            icon: Activity,
            color: '#3b82f6',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: 'OTs Pendientes',
            value: stats.ordenes_pendientes.toString(),
            icon: Clock,
            color: '#f59e0b',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600',
        },
        {
            title: 'Completadas (Mes)',
            value: stats.ordenes_completadas_mes.toString(),
            icon: CheckCircle,
            color: '#22c55e',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Eficiencia',
            value: `${stats.eficiencia_promedio}%`,
            icon: TrendingUp,
            color: '#a855f7',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
        {
            title: 'Operarios Activos',
            value: `${stats.operarios_activos}/${stats.total_personal}`,
            icon: Users,
            color: '#6366f1',
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600',
        },
        {
            title: 'Alertas Stock',
            value: stats.alertas_stock.toString(),
            icon: AlertTriangle,
            color: '#ef4444',
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
        },
        {
            title: 'Costo Total (Mes)',
            value: `$${stats.costo_total_mes.toLocaleString()}`,
            icon: DollarSign,
            color: '#10b981',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
        },
        {
            title: 'Tiempo Prom. OT',
            value: `${stats.tiempo_promedio_orden} min`,
            icon: Clock,
            color: '#06b6d4',
            bgColor: 'bg-cyan-50',
            textColor: 'text-cyan-600',
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-6 pb-8">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <WelcomeHeader userName={userName} />

                <div className="flex items-center gap-3 px-2">
                    {/* Area Selector */}
                    <GlassCard className="!p-0 !rounded-xl flex items-center">
                        <Factory className="w-4 h-4 text-slate-400 ml-3" />
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="bg-transparent border-none outline-none font-semibold text-sm text-slate-700 py-2 pl-2 pr-4 rounded-xl cursor-pointer"
                        >
                            {areas.map(a => (
                                <option key={a} value={a}>{a === 'TODAS' ? 'Todas las Áreas' : a}</option>
                            ))}
                        </select>
                    </GlassCard>

                    <button
                        onClick={() => fetchDashboardData(selectedArea)}
                        className={clsx(
                            "p-2.5 rounded-xl bg-brand-400 text-brand-950 hover:bg-brand-500 transition-all shadow-sm",
                            loading && "animate-spin"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiCards.map((kpi, index) => (
                    <GlassCard key={index} className="!p-4 flex items-center gap-3 cursor-default">
                        <div className={clsx("p-2.5 rounded-xl", kpi.bgColor)}>
                            <kpi.icon className={clsx("w-5 h-5", kpi.textColor)} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider truncate">{kpi.title}</p>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{kpi.value}</h3>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Quality Row: 3 cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlassCard className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-50">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Piezas Buenas (Mes)</p>
                        <h3 className="text-3xl font-bold text-green-600 tracking-tight">{stats.piezas_buenas_mes.toLocaleString()}</h3>
                        <p className="text-xs text-slate-400 mt-1">Piezas aprobadas en calidad</p>
                    </div>
                </GlassCard>
                <GlassCard className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-50">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mermas / Scrap</p>
                        <h3 className="text-3xl font-bold text-red-600 tracking-tight">{stats.piezas_malas_mes.toLocaleString()}</h3>
                        <p className="text-xs text-slate-400 mt-1">Piezas rechazadas</p>
                    </div>
                </GlassCard>
                <GlassCard className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-50">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tasa de Calidad</p>
                        <h3 className="text-3xl font-bold text-blue-600 tracking-tight">{tasaCalidad}%</h3>
                        <p className="text-xs text-slate-400 mt-1">Ratio de aprobación</p>
                    </div>
                </GlassCard>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Production Chart */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Factory className="w-4 h-4 text-brand-500" />
                            Producción Semanal (Piezas)
                        </h3>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.produccion_semanal}>
                                <defs>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#facc15" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(8px)',
                                        fontSize: '13px',
                                    }}
                                />
                                <Area type="monotone" dataKey="piezas" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Orders by Status (Pie) */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Package className="w-4 h-4 text-brand-500" />
                            Distribución de Órdenes
                        </h3>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.ordenes_por_estado}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="cantidad"
                                    nameKey="estado"
                                    stroke="none"
                                    cornerRadius={6}
                                    label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                                    labelLine={false}
                                >
                                    {stats.ordenes_por_estado.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(8px)',
                                        fontSize: '13px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* Area Comparison (only when TODAS) */}
            {selectedArea === 'TODAS' && stats.comparativo_areas && stats.comparativo_areas.length > 0 && (
                <GlassCard>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                            Rendimiento por Área de Producción
                        </h3>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.comparativo_areas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="area" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(8px)',
                                        fontSize: '13px',
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar yAxisId="left" dataKey="piezas" name="Piezas Producidas" fill="#facc15" radius={[8, 8, 0, 0]} />
                                <Bar yAxisId="right" dataKey="ordenes" name="Órdenes de Trabajo" fill="#a855f7" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};
