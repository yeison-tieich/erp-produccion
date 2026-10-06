import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { DollarSign, TrendingUp, PieChart, BarChart2, Layers, Cpu, Users, FileText, Download } from 'lucide-react';

export const FinancesPage = () => {
    const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'machines' | 'personal'>('summary');
    const [summary, setSummary] = useState<any>(null);
    const [orderCosts, setOrderCosts] = useState<any[]>([]);
    const [machineCosts, setMachineCosts] = useState<any[]>([]);
    const [personalCosts, setPersonalCosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [sRes, oRes, mRes, pRes] = await Promise.all([
                axios.get(`${API_URL}/finances/summary`, { headers }),
                axios.get(`${API_URL}/finances/orders`, { headers }),
                axios.get(`${API_URL}/finances/machines`, { headers }),
                axios.get(`${API_URL}/finances/personal`, { headers })
            ]);

            setSummary(sRes.data);
            setOrderCosts(oRes.data);
            setMachineCosts(mRes.data);
            setPersonalCosts(pRes.data);
        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const exportToExcel = () => {
        alert('Generando archivo Excel de reporte financiero...');
    };

    const exportToPDF = () => {
        alert('Generando archivo PDF de reporte financiero...');
    };

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Módulo de Finanzas & Costos</h1>
                    <p className="text-gray-500 font-medium">Consolidado operativo de costos, márgenes y rentabilidad global (Exclusivo Administrador).</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-green-700 transition"
                    >
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-red-700 transition"
                    >
                        <Download className="w-4 h-4" /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition ${
                        activeTab === 'summary' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Dashboard Financiero
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition ${
                        activeTab === 'orders' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Costos por OT
                </button>
                <button
                    onClick={() => setActiveTab('machines')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition ${
                        activeTab === 'machines' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Costos por Maquinaria
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition ${
                        activeTab === 'personal' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    Costos de Personal
                </button>
            </div>

            {/* Tab 1: Dashboard Summary */}
            {activeTab === 'summary' && summary && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos Totales</p>
                            <p className="text-3xl font-black text-green-600 mt-2">${summary.ingresos?.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Costos Totales</p>
                            <p className="text-3xl font-black text-red-600 mt-2">${summary.costos?.total?.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rentabilidad</p>
                            <p className={`text-3xl font-black mt-2 ${summary.rentabilidad >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                                ${summary.rentabilidad?.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-brand-600 text-white p-6 rounded-3xl shadow-sm">
                            <p className="text-xs font-bold text-brand-200 uppercase tracking-wider">Margen de Ganancia</p>
                            <p className="text-3xl font-black mt-2">{summary.margenPorcentaje}%</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-900 mb-4">Desglose Consolidado de Costos</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">Materia Prima</p>
                                <p className="text-lg font-black text-gray-900 mt-1">${summary.costos?.materiaPrima?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">Producción (MO)</p>
                                <p className="text-lg font-black text-gray-900 mt-1">${summary.costos?.produccion?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">Mantenimiento</p>
                                <p className="text-lg font-black text-gray-900 mt-1">${summary.costos?.mantenimiento?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">Herramientas</p>
                                <p className="text-lg font-black text-gray-900 mt-1">${summary.costos?.herramientas?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">Nómina Total</p>
                                <p className="text-lg font-black text-gray-900 mt-1">${summary.costos?.nomina?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Orders Cost */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-4">OT</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Costo MP</th>
                                    <th className="p-4">Costo MO</th>
                                    <th className="p-4">Costo Total</th>
                                    <th className="p-4">Costo Unit.</th>
                                    <th className="p-4">Margen</th>
                                    <th className="p-4">% Rent.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                                {orderCosts.map(o => (
                                    <tr key={o.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-900">{o.numero_ot}</td>
                                        <td className="p-4">{o.cliente}</td>
                                        <td className="p-4 font-bold text-gray-800">{o.producto}</td>
                                        <td className="p-4">${o.costoMP?.toLocaleString()}</td>
                                        <td className="p-4">${o.costoMO?.toLocaleString()}</td>
                                        <td className="p-4 font-bold">${o.costoTotal?.toLocaleString()}</td>
                                        <td className="p-4">${o.costoUnitario?.toFixed(2)}</td>
                                        <td className={`p-4 font-bold ${o.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${o.margen?.toLocaleString()}
                                        </td>
                                        <td className="p-4 font-bold">{o.rentabilidadPorcentaje}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 3: Machine Costs */}
            {activeTab === 'machines' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-4">Código</th>
                                    <th className="p-4">Máquina</th>
                                    <th className="p-4">Horas Trab.</th>
                                    <th className="p-4">Costo / Hora</th>
                                    <th className="p-4">Costo Operativo</th>
                                    <th className="p-4">Mantenimiento</th>
                                    <th className="p-4">Depreciación Mens.</th>
                                    <th className="p-4">Costo Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                                {machineCosts.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-900">{m.codigo}</td>
                                        <td className="p-4 font-bold text-gray-800">{m.nombre}</td>
                                        <td className="p-4">{m.horasTrabajadas} hrs</td>
                                        <td className="p-4">${m.costoHora?.toLocaleString()}</td>
                                        <td className="p-4">${m.costoOperativo?.toLocaleString()}</td>
                                        <td className="p-4">${m.costoMantenimiento?.toLocaleString()}</td>
                                        <td className="p-4">${m.depreciacionMensual?.toFixed(2)}</td>
                                        <td className="p-4 font-bold text-brand-600">${m.costoTotalMaquina?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 4: Personal Costs */}
            {activeTab === 'personal' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-4">Empleado</th>
                                    <th className="p-4">Cédula</th>
                                    <th className="p-4">Cargo</th>
                                    <th className="p-4">Salario Base</th>
                                    <th className="p-4">Prestaciones</th>
                                    <th className="p-4">Recargos</th>
                                    <th className="p-4">Costo Total Mes</th>
                                    <th className="p-4">Horas Prod.</th>
                                    <th className="p-4">Costo Hora Hombre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                                {personalCosts.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-900">{p.nombre}</td>
                                        <td className="p-4">{p.cedula}</td>
                                        <td className="p-4 font-bold">{p.cargo}</td>
                                        <td className="p-4">${p.salario?.toLocaleString()}</td>
                                        <td className="p-4">${p.prestaciones?.toLocaleString()}</td>
                                        <td className="p-4">${p.recargos?.toLocaleString()}</td>
                                        <td className="p-4 font-bold">${p.costoTotalMes?.toLocaleString()}</td>
                                        <td className="p-4">{p.horasTrabajadasProductivas} hrs</td>
                                        <td className="p-4 font-bold text-brand-600">${p.costoHoraHombreCalculado}/hr</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
