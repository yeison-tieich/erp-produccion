
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, Package, AlertTriangle, TrendingUp, Clock, DollarSign, CheckCircle, Activity, Factory, Wrench } from 'lucide-react';

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
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get(`${API_URL}/dashboard/stats`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-xl font-bold text-gray-400">Cargando dashboard...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-xl font-bold text-red-500">Error cargando datos</div>
            </div>
        );
    }

    const kpiData = [
        { label: 'OTs En Progreso', value: stats.ordenes_activas.toString(), icon: Activity, color: 'bg-blue-500', textColor: 'text-blue-600' },
        { label: 'OTs Pendientes', value: stats.ordenes_pendientes.toString(), icon: Clock, color: 'bg-orange-500', textColor: 'text-orange-600' },
        { label: 'OTs Completadas (Mes)', value: stats.ordenes_completadas_mes.toString(), icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600' },
        { label: 'Eficiencia Promedio', value: `${stats.eficiencia_promedio.toFixed(1)}%`, icon: TrendingUp, color: 'bg-purple-500', textColor: 'text-purple-600' },
        { label: 'Operarios Activos', value: `${stats.operarios_activos}/${stats.total_personal}`, icon: Users, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
        { label: 'Alertas Stock MP', value: stats.alertas_stock.toString(), icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600' },
        { label: 'Costo Total (Mes)', value: `$${stats.costo_total_mes.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
        { label: 'Tiempo Prom. Orden', value: `${stats.tiempo_promedio_orden} min`, icon: Clock, color: 'bg-cyan-500', textColor: 'text-cyan-600' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-slate-800">📊 Dashboard de Producción</h1>
                <button
                    onClick={fetchDashboardData}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, index) => (
                    <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 flex items-center gap-4 hover:shadow-lg hover:border-brand-200 transition-all">
                        <div className={`p-4 rounded-2xl ${kpi.color} bg-opacity-10`}>
                            <kpi.icon className={`w-8 h-8 ${kpi.textColor}`} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-black uppercase tracking-wider">{kpi.label}</p>
                            <h3 className="text-3xl font-black text-gray-900">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calidad del Mes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Piezas Buenas (Mes)
                    </h3>
                    <div className="text-4xl font-black text-green-600">{stats.piezas_buenas_mes.toLocaleString()}</div>
                    <p className="text-sm text-gray-500 font-bold mt-2">Piezas aprobadas en calidad</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Mermas / Scrap (Mes)
                    </h3>
                    <div className="text-4xl font-black text-red-600">{stats.piezas_malas_mes.toLocaleString()}</div>
                    <p className="text-sm text-gray-500 font-bold mt-2">Piezas rechazadas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Tasa de Calidad
                    </h3>
                    <div className="text-4xl font-black text-blue-600">
                        {stats.piezas_buenas_mes + stats.piezas_malas_mes > 0
                            ? ((stats.piezas_buenas_mes / (stats.piezas_buenas_mes + stats.piezas_malas_mes)) * 100).toFixed(1)
                            : 0}%
                    </div>
                    <p className="text-sm text-gray-500 font-bold mt-2">Ratio de aprobación</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Producción Semanal */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                        <Factory className="w-5 h-5 text-brand-600" />
                        Producción Semanal (Piezas)
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.produccion_semanal}>
                                <defs>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="piezas" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Órdenes por Estado */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-brand-600" />
                        Distribución de Órdenes
                    </h3>
                    <div className="h-80 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.ordenes_por_estado}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="cantidad"
                                >
                                    {stats.ordenes_por_estado.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
