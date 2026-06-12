import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    X, Download, FileText, BarChart3, TrendingUp, 
    Clock, DollarSign, Users, Factory, AlertCircle,
    Calendar, Activity, ClipboardList, Share2
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, BarChart, Bar, Legend, 
    Cell, PieChart, Pie 
} from 'recharts';
import { API_URL } from '../api';
import clsx from 'clsx';
import { exportReportToExcel, generateReportPDF } from '../utils/reportExportUtils';

interface MonthlyReportModalProps {
    onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ onClose }) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [filters, setFilters] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        startDate: '',
        endDate: ''
    });
    const [useCustomRange, setUseCustomRange] = useState(false);

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        fetchReport();
    }, [filters.month, filters.year, useCustomRange]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const params: any = useCustomRange ? {
                startDate: filters.startDate,
                endDate: filters.endDate
            } : {
                month: filters.month,
                year: filters.year
            };
            
            if (useCustomRange && (!filters.startDate || !filters.endDate)) {
                setLoading(false);
                return;
            }

            const res = await axios.get(`${API_URL}/dashboard/monthly-report`, { params });
            setReportData(res.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            alert('Error al cargar el informe');
        } finally {
            setLoading(false);
        }
    };

    if (!reportData && loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center">
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
                    <p className="text-xl font-black text-gray-700">Generando Informe...</p>
                </div>
            </div>
        );
    }

    if (!reportData) return null;

    const kpis = reportData.kpis;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[150] flex items-center justify-center p-4 xl:p-8">
            <div className="bg-slate-50 w-full max-w-7xl h-full rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-4 border-white">
                {/* Header */}
                <div className="bg-white p-6 xl:p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <BarChart3 className="w-10 h-10 text-purple-600" /> Informe Mensual de Producción
                        </h2>
                        <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">
                            Análisis detallado de KPIs, Costos y Eficiencia
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl">
                            {!useCustomRange ? (
                                <>
                                    <select 
                                        value={filters.month} 
                                        onChange={(e) => setFilters({...filters, month: Number(e.target.value)})}
                                        className="bg-white border-none rounded-xl px-4 py-2 font-black text-slate-700 outline-none"
                                    >
                                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                    </select>
                                    <select 
                                        value={filters.year} 
                                        onChange={(e) => setFilters({...filters, year: Number(e.target.value)})}
                                        className="bg-white border-none rounded-xl px-4 py-2 font-black text-slate-700 outline-none"
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="bg-white rounded-xl px-3 py-2 font-bold text-sm outline-none" />
                                    <span className="text-slate-400">a</span>
                                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="bg-white rounded-xl px-3 py-2 font-bold text-sm outline-none" />
                                    <button onClick={fetchReport} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-xs">OK</button>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setUseCustomRange(!useCustomRange)}
                            className={clsx(
                                "p-3 rounded-2xl transition",
                                useCustomRange ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                            title="Rango Personalizado"
                        >
                            <Calendar className="w-6 h-6" />
                        </button>

                        <div className="h-10 w-px bg-slate-200 mx-2"></div>

                        <button onClick={onClose} className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition text-red-500">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 xl:p-10 space-y-10">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard title="Total Órdenes" value={kpis.produccion.total_ordenes} icon={ClipboardList} color="blue" />
                        <KPICard title="Piezas Fabricadas" value={kpis.produccion.total_piezas.toLocaleString()} icon={Factory} color="green" />
                        <KPICard title="Costo Total" value={`$${kpis.costos.costo_total.toLocaleString()}`} icon={DollarSign} color="emerald" subValue={`${Math.abs(kpis.costos.variacion_costo)}% vs mes ant.`} trend={kpis.costos.variacion_costo <= 0 ? 'up' : 'down'} />
                        <KPICard title="Eficiencia Gral." value={`${kpis.eficiencia.promedio.toFixed(1)}%`} icon={TrendingUp} color="purple" trafficLight />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Producción Diaria Chart */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-blue-500" /> Producción Diaria (Piezas Buenas)
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={reportData.produccion_diaria}>
                                        <defs>
                                            <linearGradient id="colorProdReport" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Area type="monotone" dataKey="piezas" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorProdReport)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* More KPIs / Productivity */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                <Clock className="w-6 h-6 text-orange-500" /> Productividad y Tiempos
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Piezas por Hora</span>
                                    <span className="text-2xl font-black text-slate-900">{kpis.produccion.piezas_por_hora} <small className="text-xs text-slate-400">pcs/h</small></span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Piezas por Día</span>
                                    <span className="text-2xl font-black text-slate-900">{kpis.produccion.piezas_por_dia} <small className="text-xs text-slate-400">pcs/d</small></span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Desviación Tiempo</span>
                                    <span className={clsx(
                                        "text-2xl font-black",
                                        kpis.tiempos.desviacion_tiempos > 0 ? "text-red-500" : "text-green-500"
                                    )}>
                                        {kpis.tiempos.desviacion_tiempos > 0 ? '+' : ''}{kpis.tiempos.desviacion_tiempos}%
                                    </span>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Costo Promedio por Pieza</p>
                                    <p className="text-3xl font-black text-purple-700">${kpis.costos.costo_promedio_pieza.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operator Efficiency Ranking */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-indigo-500" /> Ranking de Operarios
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Eficiencia</span>
                            </h3>
                            <div className="space-y-4">
                                {reportData.operarios_ranking.map((op: any, i: number) => (
                                    <div key={op.nombre} className="flex items-center gap-4 group">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                                            i === 0 ? "bg-yellow-100 text-yellow-700" :
                                            i === 1 ? "bg-slate-100 text-slate-600" :
                                            i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black text-slate-700">{op.nombre}</span>
                                                <span className="font-black text-slate-900">{op.eficiencia.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={clsx(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        op.eficiencia >= 90 ? "bg-green-500" :
                                                        op.eficiencia >= 75 ? "bg-yellow-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${Math.min(op.eficiencia, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {reportData.operarios_ranking.length === 0 && (
                                    <p className="text-center text-slate-400 font-bold py-10 italic">No hay datos de operarios en este periodo.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-purple-500" /> Resumen Comparativo
                            </h3>
                            <div className="grid grid-cols-2 gap-6 h-full pb-8">
                                <div className="p-6 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className={clsx(
                                        "p-4 rounded-2xl mb-4",
                                        kpis.costos.variacion_costo <= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {kpis.costos.variacion_costo <= 0 ? <ArrowDown className="w-8 h-8" /> : <ArrowUp className="w-8 h-8" />}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Variación Costos</p>
                                    <h4 className="text-3xl font-black text-slate-900">{Math.abs(kpis.costos.variacion_costo)}%</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-2">
                                        {kpis.costos.variacion_costo <= 0 ? 'Reducción de costos detectada' : 'Aumento en costos operativos'}
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="p-4 rounded-2xl bg-blue-100 text-blue-600 mb-4">
                                        <TrendingUp className="w-8 h-8" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Órdenes Ejecutadas</p>
                                    <h4 className="text-3xl font-black text-slate-900">{kpis.produccion.total_ordenes}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-2">Total del periodo seleccionado</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Validation Alerts */}
                    {reportData.alertas.ordenes_incompletas > 0 && (
                        <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl flex items-center gap-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-orange-800">Atención: Datos Incompletos</h4>
                                <p className="text-sm text-orange-700 font-bold">
                                    Hay {reportData.alertas.ordenes_incompletas} órdenes que no tienen registrado el costo real o tiempo total. 
                                    Esto puede afectar la precisión del informe.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white p-8 border-t flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500">Compartir informe vía:</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black hover:bg-slate-200 transition">LINK</button>
                            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black hover:bg-slate-200 transition">EMAIL</button>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full sm:w-auto">
                        <button 
                            onClick={() => exportReportToExcel(reportData)}
                            className="flex-1 sm:flex-none bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition font-black text-sm border-2 border-emerald-100"
                        >
                            <Download className="w-5 h-5" /> EXPORTAR EXCEL
                        </button>
                        <button 
                            onClick={() => generateReportPDF(reportData)}
                            className="flex-1 sm:flex-none bg-brand-600 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-700 transition shadow-xl shadow-brand-100 font-black text-sm"
                        >
                            <FileText className="w-5 h-5" /> GENERAR INFORME PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, color, subValue, trend, trafficLight }: any) => {
    const getTrafficLight = () => {
        const val = parseFloat(value);
        if (val >= 90) return 'bg-green-500';
        if (val >= 75) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 hover:shadow-xl hover:border-purple-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx(
                    "p-3 rounded-2xl group-hover:scale-110 transition-transform",
                    color === 'blue' ? "bg-blue-50 text-blue-600" :
                    color === 'green' ? "bg-green-50 text-green-600" :
                    color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                    color === 'purple' ? "bg-purple-50 text-purple-600" : "bg-slate-50 text-slate-600"
                )}>
                    <Icon className="w-6 h-6" />
                </div>
                {trafficLight && (
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
                        <div className={clsx("w-3 h-3 rounded-full opacity-20", getTrafficLight() === 'bg-green-500' && "opacity-100 bg-green-500")} />
                        <div className={clsx("w-3 h-3 rounded-full opacity-20", getTrafficLight() === 'bg-yellow-500' && "opacity-100 bg-yellow-500")} />
                        <div className={clsx("w-3 h-3 rounded-full opacity-20", getTrafficLight() === 'bg-red-500' && "opacity-100 bg-red-500")} />
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 leading-tight">{value}</h3>
                {subValue && (
                    <div className={clsx(
                        "text-[10px] font-black mt-2 flex items-center gap-1",
                        trend === 'up' ? "text-green-600" : "text-red-600"
                    )}>
                        {trend === 'up' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    );
};

const ArrowUp = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
    </svg>
);

const ArrowDown = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
    </svg>
);
