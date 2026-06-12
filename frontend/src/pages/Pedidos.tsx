
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
    Package, Search, Filter, Plus, FileDown, FileUp,
    RefreshCw, Edit3, Trash2, CheckCircle2, AlertCircle,
    Truck, Clock, ChevronRight, X, Loader2, Save,
    DollarSign, Calendar, Hash, Tag, FileText, Users,
    Factory, ClipboardList, ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

interface Pedido {
    id: number;
    cliente: string | null;
    orden_compra: string | null;
    fecha_emision: string | null;
    codigo: string | null;
    referencia: string | null;
    posicion: string | null;
    descripcion: string | null;
    cantidad: number | null;
    cantidad_fabricada: number | null;
    cantidad_en_inventario: number | null;
    cantidad_despachada: number | null;
    saldo_pendiente: number | null;
    fecha_entrega: string | null;
    estado: string | null;
    precio_unitario: number | null;
    valor_total: number | null;
    producto_id: number | null;
}

export const Pedidos = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [clientFilter, setClientFilter] = useState('ALL');
    const [showDelivered, setShowDelivered] = useState(false);
    const [balancesOnly, setBalancesOnly] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const [formData, setFormData] = useState<Partial<Pedido>>({});
    const [saving, setSaving] = useState(false);

    // OT Generation state
    const [showOTModal, setShowOTModal] = useState(false);
    const [otFormData, setOTFormData] = useState({ cantidad_fabricar: 0, fecha_entrega_req: '' });
    const [generatingOT, setGeneratingOT] = useState(false);

    // Inline editing state
    const [editingSaldoId, setEditingSaldoId] = useState<number | null>(null);
    const [tempSaldo, setTempSaldo] = useState<string>('');

    const fetchPedidos = async () => {
        try {
            const res = await axios.get(`${API_URL}/pedidos`);
            setPedidos(res.data);
        } catch (error) {
            console.error('Error fetching pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post(`${API_URL}/pedidos/sync`);
            await fetchPedidos();
        } catch (error) {
            alert('Error sincronizando pedidos');
        } finally {
            setSyncing(false);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/pedidos/import`, formData);
            await fetchPedidos();
            alert(res.data.message || 'Importación completada');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Error importando Excel';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(pedidos);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
        XLSX.writeFile(workbook, `Pedidos_ControlMT_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (selectedPedido) {
                await axios.put(`${API_URL}/pedidos/${selectedPedido.id}`, formData);
            } else {
                await axios.post(`${API_URL}/pedidos`, formData);
            }
            setShowModal(false);
            await fetchPedidos();
        } catch (error) {
            alert('Error al guardar pedido');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este pedido?')) return;
        try {
            await axios.delete(`${API_URL}/pedidos/${id}`);
            await fetchPedidos();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const handleUpdateSaldo = async (pedido: Pedido, newSaldo: number) => {
        try {
            const newDespachada = (pedido.cantidad || 0) - newSaldo;
            await axios.put(`${API_URL}/pedidos/${pedido.id}`, {
                ...pedido,
                cantidad_despachada: newDespachada,
                saldo_pendiente: newSaldo // The backend will recalculate it anyway, but we send it for clarity
            });
            setEditingSaldoId(null);
            fetchPedidos();
        } catch (error) {
            alert('Error al actualizar saldo');
        }
    };

    const handleGenerateOT = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPedido) return;

        setGeneratingOT(true);
        try {
            const res = await axios.post(`${API_URL}/pedidos/${selectedPedido.id}/generate-ot`, otFormData);
            setShowOTModal(false);
            await fetchPedidos();

            let msg = `Orden de Trabajo ${res.data.ot.numero_ot} generada correctamente.`;
            if (res.data.materialAlerts && res.data.materialAlerts.length > 0) {
                msg += '\n\nATENCIÓN: Stock insuficiente para materiales:\n' + res.data.materialAlerts.join('\n');
            }
            alert(msg);
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Error al generar OT';
            alert(msg);
        } finally {
            setGeneratingOT(false);
        }
    };

    const filteredPedidos = pedidos.filter(p => {
        const matchesSearch =
            (p.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.orden_compra || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || p.estado === statusFilter;
        const matchesClient = clientFilter === 'ALL' || p.cliente === clientFilter;

        // Logic for hiding delivered by default
        const isDelivered = ['DESPACHADO COMPLETO', 'ENTREGADO', 'HECHO'].includes(p.estado || '');
        const matchesDelivered = showDelivered || !isDelivered;

        // Logic for "Only with Balance"
        const matchesBalance = !balancesOnly || (p.saldo_pendiente || 0) > 0;

        return matchesSearch && matchesStatus && matchesClient && matchesDelivered && matchesBalance;
    });

    const uniqueClients = Array.from(new Set(pedidos.map(p => p.cliente || 'Desconocido')));

    const getStatusColor = (estado: string | null) => {
        switch (estado) {
            case 'PENDIENTE': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'POR FABRICAR': return 'bg-red-50 text-red-600 border-red-200';
            case 'EN PRODUCCIÓN': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'EN INVENTARIO': return 'bg-purple-100 text-purple-600 border-purple-200';
            case 'PARCIALMENTE DESPACHADO': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'DESPACHADO COMPLETO':
            case 'ENTREGADO':
            case 'HECHO': return 'bg-green-100 text-green-600 border-green-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStatusIcon = (estado: string | null) => {
        switch (estado) {
            case 'PENDIENTE': return <Clock className="w-4 h-4" />;
            case 'POR FABRICAR': return <AlertCircle className="w-4 h-4" />;
            case 'EN PRODUCCIÓN': return <RefreshCw className="w-4 h-4 animate-spin-slow" />;
            case 'EN INVENTARIO': return <Package className="w-4 h-4" />;
            case 'PARCIALMENTE DESPACHADO': return <Truck className="w-4 h-4" />;
            case 'DESPACHADO COMPLETO':
            case 'ENTREGADO':
            case 'HECHO': return <CheckCircle2 className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const getRowColor = (estado: string | null) => {
        switch (estado) {
            case 'POR FABRICAR': return 'bg-red-50/60 border-l-[40px] border-l-red-500 shadow-sm transition-all';
            case 'EN PRODUCCIÓN': return 'bg-blue-50/60 border-l-[40px] border-l-blue-500 shadow-sm transition-all';
            case 'EN INVENTARIO': return 'bg-purple-50/60 border-l-[40px] border-l-purple-500 shadow-sm transition-all';
            case 'PARCIALMENTE DESPACHADO': return 'bg-orange-50/60 border-l-[40px] border-l-orange-500 shadow-sm transition-all';
            case 'DESPACHADO COMPLETO':
            case 'ENTREGADO':
            case 'HECHO': return 'bg-green-50/60 border-l-[40px] border-l-green-500 shadow-sm transition-all';
            default: return 'bg-white border-l-[40px] border-l-transparent';
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500 rounded-full -mr-48 -mt-48 opacity-20 blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Control de Pedidos</h1>
                    <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                        Seguimiento Logístico & Ventas
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 relative z-10">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-black border border-white/10 backdrop-blur-md"
                    >
                        <RefreshCw className={clsx("w-5 h-5", syncing && "animate-spin")} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                    </button>

                    <label className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-black cursor-pointer shadow-xl shadow-brand-500/20">
                        <FileUp className="w-5 h-5" />
                        Importar Excel
                        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
                    </label>

                    <button
                        onClick={() => {
                            setSelectedPedido(null);
                            setFormData({
                                cliente: '',
                                orden_compra: '',
                                fecha_emision: null,
                                codigo: '',
                                referencia: '',
                                posicion: '',
                                descripcion: '',
                                cantidad: 0,
                                fecha_entrega: '',
                                estado: 'PENDIENTE',
                                precio_unitario: 0,
                                valor_total: 0
                            });
                            setShowModal(true);
                        }}
                        className="bg-white text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-2 border-2 border-white hover:bg-transparent hover:text-white transition-all font-black shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Pedido
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Pedidos Totales', value: filteredPedidos.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Valor Cartera', value: `$${filteredPedidos.reduce((acc, p) => acc + Number(p.valor_total || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'En Producción', value: filteredPedidos.filter(p => p.estado === 'EN PRODUCCIÓN').length, icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Saldo Pendiente', value: filteredPedidos.reduce((acc, p) => acc + Number(p.saldo_pendiente || 0), 0), icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-5 hover:translate-y-[-4px] transition-all group">
                        <div className={clsx("p-4 rounded-3xl group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
                            <stat.icon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Section */}
            <div className="bg-white p-7 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-5 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Filtrar por OC, Ref, Código, Cliente o Descripción..."
                        className="w-full pl-14 pr-8 py-5 bg-gray-50 rounded-[2rem] border-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-slate-700 placeholder:text-gray-300 shadow-inner"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center justify-center">
                    <select
                        className="px-6 py-4 bg-gray-50 rounded-[1.5rem] border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 shadow-inner appearance-none min-w-[200px]"
                        value={clientFilter}
                        onChange={e => setClientFilter(e.target.value)}
                    >
                        <option value="ALL">👤 Todos los Clientes</option>
                        {uniqueClients.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <select
                        className="px-6 py-4 bg-gray-50 rounded-[1.5rem] border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 shadow-inner appearance-none min-w-[180px]"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">🔍 Todos los Estados</option>
                        <option value="PENDIENTE">⏳ Pendiente</option>
                        <option value="POR FABRICAR">🏭 Por Fabricar</option>
                        <option value="EN PRODUCCIÓN">⚡ En Producción</option>
                        <option value="EN INVENTARIO">📦 En Inventario</option>
                        <option value="ENTREGADO">✅ Entregado/Hecho</option>
                    </select>

                    <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-[1.5rem] shadow-inner font-black text-[10px] text-slate-600 uppercase tracking-widest border border-transparent hover:border-brand-200 transition-all">
                        <input
                            type="checkbox"
                            id="showDelivered"
                            className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={showDelivered}
                            onChange={e => setShowDelivered(e.target.checked)}
                        />
                        <label htmlFor="showDelivered" className="cursor-pointer select-none">Ver Entregados</label>
                    </div>

                    <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-[1.5rem] shadow-inner font-black text-[10px] text-slate-600 uppercase tracking-widest border border-transparent hover:border-brand-200 transition-all">
                        <input
                            type="checkbox"
                            id="balancesOnly"
                            className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={balancesOnly}
                            onChange={e => setBalancesOnly(e.target.checked)}
                        />
                        <label htmlFor="balancesOnly" className="cursor-pointer select-none">Solo con Saldo</label>
                    </div>

                    <button
                        onClick={handleExportExcel}
                        className="p-5 bg-slate-900 text-white rounded-[1.5rem] hover:bg-slate-800 transition shadow-xl hover:scale-105 active:scale-95"
                        title="Exportar a Excel"
                    >
                        <FileDown className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[4rem] shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900 border-b border-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                                <th className="px-10 py-8">Venta / Origen</th>
                                <th className="px-8 py-8">Técnico / Producto</th>
                                <th className="px-8 py-8 text-center">Cantidades</th>
                                <th className="px-8 py-8 text-center">Financiero</th>
                                <th className="px-8 py-8">Logística</th>
                                <th className="px-8 py-8 text-right">Mantenimiento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-10 py-10"><div className="h-6 bg-gray-50 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredPedidos.map((pedido) => (
                                <tr key={pedido.id} className={clsx(
                                    "group transition-all duration-300 border-b border-gray-100",
                                    getRowColor(pedido.estado),
                                    "hover:bg-slate-50/80"
                                )}>
                                    <td className="px-10 py-8">
                                        <p className="font-black text-slate-900 uppercase tracking-tight text-lg leading-none">{pedido.cliente || 'S/N'}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">OC: {pedido.orden_compra || 'S/N'}</span>
                                            {pedido.fecha_emision && (
                                                <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(pedido.fecha_emision).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-gray-100 rounded-xl">
                                                <Tag className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 group-hover:text-brand-600 transition-colors uppercase">
                                                    {pedido.codigo ? `${pedido.codigo} ` : ''}
                                                    {pedido.referencia}
                                                </p>
                                                <p className="text-xs text-slate-400 font-medium line-clamp-1 italic">{pedido.descripcion || 'Sin descripción detallada'}</p>
                                                {pedido.posicion && <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1 inline-block">POS: {pedido.posicion}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex justify-center items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">REQ</p>
                                                <p className="text-xl font-black text-slate-900">{pedido.cantidad || 0}</p>
                                            </div>
                                            <div className="h-10 w-px bg-slate-100"></div>
                                            <div className="text-center group/saldo">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">SALDO</p>
                                                {editingSaldoId === pedido.id ? (
                                                    <input
                                                        type="number"
                                                        className="w-20 px-2 py-1 bg-slate-100 rounded-lg font-black text-center text-lg outline-none focus:ring-2 focus:ring-brand-500"
                                                        value={tempSaldo}
                                                        onChange={e => setTempSaldo(e.target.value)}
                                                        onBlur={() => handleUpdateSaldo(pedido, parseInt(tempSaldo) || 0)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleUpdateSaldo(pedido, parseInt(tempSaldo) || 0);
                                                            if (e.key === 'Escape') setEditingSaldoId(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <p
                                                        onClick={() => {
                                                            setEditingSaldoId(pedido.id);
                                                            setTempSaldo(String(pedido.saldo_pendiente || 0));
                                                        }}
                                                        className={clsx(
                                                            "text-xl font-black cursor-pointer hover:scale-110 transition-transform px-2 py-1 rounded-lg hover:bg-slate-100",
                                                            (pedido.saldo_pendiente || 0) > 0 ? "text-red-500 animate-pulse" : "text-green-500"
                                                        )}
                                                        title="Haz clic para editar saldo"
                                                    >
                                                        {pedido.saldo_pendiente || 0}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8 text-center">
                                        <p className="text-sm font-black text-slate-900">${Number(pedido.valor_total || 0).toLocaleString()}</p>
                                        <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase">Unit: ${Number(pedido.precio_unitario || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-8">
                                        <select
                                            className={clsx(
                                                "px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 w-fit border shadow-sm transition-all focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer",
                                                getStatusColor(pedido.estado)
                                            )}
                                            value={pedido.estado || 'PENDIENTE'}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                try {
                                                    await axios.put(`${API_URL}/pedidos/${pedido.id}`, { ...pedido, estado: newStatus });
                                                    fetchPedidos(); // Refresh to ensure sync
                                                } catch (err) {
                                                    alert('Error al actualizar estado');
                                                }
                                            }}
                                        >
                                            <option value="PENDIENTE">⏳ PENDIENTE POR ENTREGAR</option>
                                            <option value="POR FABRICAR">🏭 POR FABRICAR</option>
                                            <option value="EN PRODUCCIÓN">⚡ EN PRODUCCIÓN</option>
                                            <option value="EN INVENTARIO">📦 EN INVENTARIO</option>
                                            <option value="PARCIALMENTE DESPACHADO">🚚 PARCIAL DESPACHO</option>
                                            <option value="ENTREGADO">✅ ENTREGADO</option>
                                            <option value="HECHO">✅ HECHO</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 font-bold mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Entrega: {pedido.fecha_entrega || 'Pendiente'}
                                        </p>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => {
                                                    setSelectedPedido(pedido);
                                                    setOTFormData({
                                                        cantidad_fabricar: pedido.saldo_pendiente || 0,
                                                        fecha_entrega_req: ''
                                                    });
                                                    setShowOTModal(true);
                                                }}
                                                className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl hover:bg-brand-600 hover:text-white transition shadow-sm hover:shadow-xl hover:shadow-brand-200"
                                                title="Crear Orden de Trabajo"
                                            >
                                                <Factory className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedPedido(pedido);
                                                    setFormData({ ...pedido });
                                                    setShowModal(true);
                                                }}
                                                className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition shadow-sm hover:shadow-xl hover:shadow-blue-200"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pedido.id)}
                                                className="p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition shadow-sm hover:shadow-xl hover:shadow-red-200"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[4rem] shadow-2xl max-w-4xl w-full p-12 relative overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>

                        <div className="relative z-10 flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                    {selectedPedido ? 'Editar Registro' : 'Nuevo Registro'}
                                </h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                                    Consolidado de Orden de Compra
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all hover:rotate-90">
                                <X className="w-8 h-8 text-slate-300" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8 overflow-y-auto pr-6 custom-scrollbar flex-1 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <section className="md:col-span-3">
                                    <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Información Comercial
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Nombre del Cliente</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.cliente || ''}
                                                onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Orden de Compra</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner text-brand-600"
                                                value={formData.orden_compra || ''}
                                                onChange={e => setFormData({ ...formData, orden_compra: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="md:col-span-3 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100">
                                    <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Especificación Técnica
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Código (SKU)</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-5 bg-white rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                                                value={formData.codigo || ''}
                                                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Referencia</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-5 bg-white rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                                                value={formData.referencia || ''}
                                                onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Posición</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-5 bg-white rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                                                value={formData.posicion || ''}
                                                onChange={e => setFormData({ ...formData, posicion: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Descripción Completa del Producto</label>
                                            <textarea
                                                className="w-full px-6 py-5 bg-white rounded-[2rem] font-black border-none focus:ring-2 focus:ring-brand-500 outline-none h-24 shadow-sm"
                                                value={formData.descripcion || ''}
                                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="md:col-span-3">
                                    <h3 className="text-[11px] font-black text-green-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Ejecución & Valores
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Cantidad Solic.</label>
                                            <input
                                                type="number"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.cantidad || 0}
                                                onChange={e => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Cant. Despachada</label>
                                            <input
                                                type="number"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner text-orange-600"
                                                value={formData.cantidad_despachada || 0}
                                                onChange={e => {
                                                    const desp = parseInt(e.target.value) || 0;
                                                    const cant = formData.cantidad || 0;
                                                    setFormData({
                                                        ...formData,
                                                        cantidad_despachada: desp,
                                                        saldo_pendiente: cant - desp
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 text-red-500">Saldo Pendiente</label>
                                            <input
                                                type="number"
                                                className="w-full px-6 py-5 bg-red-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-red-500 outline-none shadow-inner text-red-600"
                                                value={formData.saldo_pendiente || 0}
                                                onChange={e => {
                                                    const saldo = parseInt(e.target.value) || 0;
                                                    const cant = formData.cantidad || 0;
                                                    setFormData({
                                                        ...formData,
                                                        saldo_pendiente: saldo,
                                                        cantidad_despachada: cant - saldo
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Precio Unitario ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.precio_unitario || 0}
                                                onChange={e => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Estado Actual</label>
                                            <select
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.estado || 'PENDIENTE'}
                                                onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                            >
                                                <option value="PENDIENTE">PENDIENTE</option>
                                                <option value="POR FABRICAR">POR FABRICAR</option>
                                                <option value="EN PRODUCCIÓN">EN PRODUCCIÓN</option>
                                                <option value="EN INVENTARIO">EN INVENTARIO</option>
                                                <option value="ENTREGADO">ENTREGADO</option>
                                                <option value="HECHO">HECHO</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Fecha Emisión OC</label>
                                            <input
                                                type="date"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.fecha_emision ? new Date(formData.fecha_emision).toISOString().split('T')[0] : ''}
                                                onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Fecha Entrega / Comentario</label>
                                            <input
                                                type="text" placeholder="Ej: 2026-02-15 o FEBRERO"
                                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                                value={formData.fecha_entrega || ''}
                                                onChange={e => setFormData({ ...formData, fecha_entrega: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-slate-900 text-white py-8 rounded-[3rem] font-black text-2xl shadow-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-4 disabled:opacity-50 mt-10 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {saving ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
                                {selectedPedido ? 'CONFIRMAR CAMBIOS' : 'REGISTRAR PEDIDO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for OT Generation */}
            {showOTModal && selectedPedido && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <div className="bg-white rounded-[4rem] shadow-2xl max-w-2xl w-full p-12 relative overflow-hidden border border-white/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>

                        <div className="relative z-10 flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                                    <Factory className="w-8 h-8 text-brand-600" />
                                    Crear Orden de Trabajo
                                </h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                                    Desde Pedido: {selectedPedido.orden_compra || 'S/N'}
                                </p>
                            </div>
                            <button onClick={() => setShowOTModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all">
                                <X className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                    <ClipboardList className="w-6 h-6 text-brand-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia Seleccionada</p>
                                    <p className="text-lg font-black text-slate-900">{selectedPedido.codigo} - {selectedPedido.referencia}</p>
                                    <p className="text-xs text-slate-500 italic mt-1">{selectedPedido.descripcion}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateOT} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Cantidad a Fabricar</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                        value={otFormData.cantidad_fabricar}
                                        onChange={e => setOTFormData({ ...otFormData, cantidad_fabricar: parseInt(e.target.value) })}
                                    />
                                    <p className="text-[9px] text-brand-600 font-bold mt-2 px-1">Saldo pendiente: {selectedPedido.saldo_pendiente}</p>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Fecha Est. Entrega</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black border-none focus:ring-2 focus:ring-brand-500 outline-none shadow-inner"
                                        value={otFormData.fecha_entrega_req}
                                        onChange={e => setOTFormData({ ...otFormData, fecha_entrega_req: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-3xl flex gap-4 items-center">
                                <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0" />
                                <p className="text-xs text-blue-800 font-medium">
                                    Al confirmar, el sistema heredará automáticamente la ruta de producción, operaciones y reservará materia prima según el catálogo.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={generatingOT}
                                className="w-full bg-brand-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                            >
                                {generatingOT ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                GENERAR ORDEN DE TRABAJO
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
