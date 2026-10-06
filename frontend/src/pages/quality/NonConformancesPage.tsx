import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, Plus, Search, Filter, Wrench, FileText,
    CheckCircle, XCircle, ArrowRight, ShieldAlert, DollarSign,
    RefreshCw, Sparkles, Layers, UserCheck, HelpCircle, Eye
} from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';
import { API_URL } from '../../api';
import { qualityService, NonConformance, RootCauseAnalysis } from '../../services/qualityService';

export const NonConformancesPage = () => {
    const [ncs, setNcs] = useState<NonConformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');
    const [originFilter, setOriginFilter] = useState('TODOS');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDispositionModal, setShowDispositionModal] = useState(false);
    const [showRootCauseModal, setShowRootCauseModal] = useState(false);
    const [selectedNC, setSelectedNC] = useState<NonConformance | null>(null);

    // Form: Create NC
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [personalList, setPersonalList] = useState<any[]>([]);

    const [formOrigen, setFormOrigen] = useState('PRODUCCION');
    const [formTipoDefecto, setFormTipoDefecto] = useState('DIMENSIONAL');
    const [formDescripcion, setFormDescripcion] = useState('');
    const [formCantidadAfectada, setFormCantidadAfectada] = useState(1);
    const [formCostoEstimado, setFormCostoEstimado] = useState(0);
    const [formOTId, setFormOTId] = useState('');
    const [formProductId, setFormProductId] = useState('');
    const [formMaquinaId, setFormMaquinaId] = useState('');
    const [formPersonalId, setFormPersonalId] = useState('');
    const [formFechaLimite, setFormFechaLimite] = useState('');

    // Form: Disposition
    const [dispOption, setDispOption] = useState<'RETRABAJO' | 'REPARACION' | 'RECLASIFICACION' | 'DEVOLUCION_PROVEEDOR' | 'DESCARTE' | 'CONCESION'>('RETRABAJO');
    const [dispAutorizadoPor, setDispAutorizadoPor] = useState('');
    const [dispJustificacion, setDispJustificacion] = useState('');

    // Form: Root Cause Analysis (5 Whys + Ishikawa)
    const [activeRootCauseTab, setActiveRootCauseTab] = useState<'5_WHYS' | 'ISHIKAWA'>('5_WHYS');
    const [porque1, setPorque1] = useState('');
    const [porque2, setPorque2] = useState('');
    const [porque3, setPorque3] = useState('');
    const [porque4, setPorque4] = useState('');
    const [porque5, setPorque5] = useState('');
    const [causaRaiz, setCausaRaiz] = useState('');

    // Ishikawa categories
    const [ishMaquina, setIshMaquina] = useState('');
    const [ishMetodo, setIshMetodo] = useState('');
    const [ishManoObra, setIshManoObra] = useState('');
    const [ishMaterial, setIshMaterial] = useState('');
    const [ishMedicion, setIshMedicion] = useState('');
    const [ishMedioAmbiente, setIshMedioAmbiente] = useState('');

    const fetchNCs = async () => {
        try {
            setLoading(true);
            const data = await qualityService.getNonConformances();
            setNcs(data);
        } catch (error) {
            console.error('Error fetching NCs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [ordersRes, prodsRes, machRes, persRes] = await Promise.all([
                axios.get(`${API_URL}/orders`),
                axios.get(`${API_URL}/products`),
                axios.get(`${API_URL}/machines`),
                axios.get(`${API_URL}/personal`)
            ]);
            setOrders(ordersRes.data || []);
            setProducts(prodsRes.data || []);
            setMachines(machRes.data || []);
            setPersonalList(persRes.data || []);
        } catch (e) {
            console.error('Error fetching catalogs:', e);
        }
    };

    useEffect(() => {
        fetchNCs();
        fetchCatalogs();
    }, []);

    const handleCreateNC = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await qualityService.createNonConformance({
                origen: formOrigen,
                tipo_defecto: formTipoDefecto,
                descripcion: formDescripcion,
                cantidad_afectada: formCantidadAfectada,
                costo_estimado: formCostoEstimado,
                orden_trabajo_id: formOTId ? Number(formOTId) : undefined,
                producto_id: formProductId ? Number(formProductId) : undefined,
                maquina_id: formMaquinaId ? Number(formMaquinaId) : undefined,
                personal_id: formPersonalId ? Number(formPersonalId) : undefined,
                fecha_limite: formFechaLimite || undefined
            });
            setShowCreateModal(false);
            setFormDescripcion('');
            fetchNCs();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al crear NC');
        }
    };

    const handleSaveDisposition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNC) return;
        try {
            await qualityService.updateNCDisposition(selectedNC.id, {
                disposicion: dispOption,
                autorizado_por: dispAutorizadoPor,
                justificacion_concesion: dispJustificacion
            });
            setShowDispositionModal(false);
            fetchNCs();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al actualizar disposición');
        }
    };

    const openRootCauseModal = (nc: NonConformance) => {
        setSelectedNC(nc);
        const analysis = nc.analisisCausa;
        setPorque1(analysis?.porque_1 || '');
        setPorque2(analysis?.porque_2 || '');
        setPorque3(analysis?.porque_3 || '');
        setPorque4(analysis?.porque_4 || '');
        setPorque5(analysis?.porque_5 || '');
        setCausaRaiz(analysis?.causa_raiz || '');

        setIshMaquina(analysis?.ishikawa_maquina || '');
        setIshMetodo(analysis?.ishikawa_metodo || '');
        setIshManoObra(analysis?.ishikawa_mano_obra || '');
        setIshMaterial(analysis?.ishikawa_material || '');
        setIshMedicion(analysis?.ishikawa_medicion || '');
        setIshMedioAmbiente(analysis?.ishikawa_medio_ambiente || '');

        setShowRootCauseModal(true);
    };

    const handleSaveRootCause = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNC) return;
        try {
            await qualityService.saveNCRootCause(selectedNC.id, {
                metodo_analisis: activeRootCauseTab === '5_WHYS' ? '5_PORQUES' : 'ISHIKAWA',
                porque_1: porque1,
                porque_2: porque2,
                porque_3: porque3,
                porque_4: porque4,
                porque_5: porque5,
                causa_raiz: causaRaiz,
                ishikawa_maquina: ishMaquina,
                ishikawa_metodo: ishMetodo,
                ishikawa_mano_obra: ishManoObra,
                ishikawa_material: ishMaterial,
                ishikawa_medicion: ishMedicion,
                ishikawa_medio_ambiente: ishMedioAmbiente
            });
            setShowRootCauseModal(false);
            fetchNCs();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar análisis');
        }
    };

    const handleCloseNC = async (id: number) => {
        if (!window.confirm('¿Confirmas el cierre formal de esta No Conformidad?')) return;
        try {
            await qualityService.closeNonConformance(id);
            fetchNCs();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al cerrar NC');
        }
    };

    const filtered = ncs.filter(nc => {
        const matchesSearch =
            nc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nc.ordenTrabajo?.numero_ot.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'TODOS' || nc.estado === statusFilter;
        const matchesOrigin = originFilter === 'TODOS' || nc.origen === originFilter;
        return matchesSearch && matchesStatus && matchesOrigin;
    });

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                        No Conformidades (NC)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Detección, disposición, análisis de causa raíz (5 Por Qués / Ishikawa) y control de retrabajos.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Registrar No Conformidad
                </button>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por código, descripción u OT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 font-medium text-slate-700"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="ABIERTA">Abierta</option>
                        <option value="EN_ANALISIS">En Análisis</option>
                        <option value="EN_ACCION">En Acción</option>
                        <option value="VERIFICADA">Verificada</option>
                        <option value="CERRADA">Cerrada</option>
                    </select>
                    <select
                        value={originFilter}
                        onChange={(e) => setOriginFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 font-medium text-slate-700"
                    >
                        <option value="TODOS">Todos los orígenes</option>
                        <option value="INSPECCION">Inspección</option>
                        <option value="PRODUCCION">Producción</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="PROVEEDOR">Proveedor</option>
                        <option value="MANTENIMIENTO">Mantenimiento</option>
                        <option value="AUDITORIA">Auditoría</option>
                    </select>
                </div>
            </div>

            {/* NCs Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/5 text-slate-600 font-bold border-b border-black/5">
                            <tr>
                                <th className="p-3.5">Código</th>
                                <th className="p-3.5">Fecha</th>
                                <th className="p-3.5">Origen / Tipo</th>
                                <th className="p-3.5">OT / Producto</th>
                                <th className="p-3.5">Descripción</th>
                                <th className="p-3.5">Disposición</th>
                                <th className="p-3.5">Estado</th>
                                <th className="p-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        No hay No Conformidades que coincidan con el filtro.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(nc => (
                                    <tr key={nc.id} className="hover:bg-white/40 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-900">{nc.codigo}</td>
                                        <td className="p-3.5 text-slate-500">
                                            {new Date(nc.fecha).toLocaleDateString()}
                                        </td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                {nc.origen}
                                            </span>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{nc.tipo_defecto}</div>
                                        </td>
                                        <td className="p-3.5">
                                            {nc.ordenTrabajo && (
                                                <div className="font-bold text-brand-700">{nc.ordenTrabajo.numero_ot}</div>
                                            )}
                                            <div className="text-slate-600 truncate max-w-[150px]">
                                                {nc.producto?.nombre_producto || 'Sin producto'}
                                            </div>
                                        </td>
                                        <td className="p-3.5 max-w-[200px] truncate" title={nc.descripcion}>
                                            {nc.descripcion}
                                            {nc.costo_estimado > 0 && (
                                                <div className="text-[10px] text-rose-600 font-semibold">
                                                    Costo est: ${nc.costo_estimado.toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            {nc.disposicion ? (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                    {nc.disposicion}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedNC(nc);
                                                        setDispOption('RETRABAJO');
                                                        setShowDispositionModal(true);
                                                    }}
                                                    className="text-[11px] text-brand-700 font-bold hover:underline"
                                                >
                                                    + Disposición
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold",
                                                nc.estado === 'ABIERTA' && "bg-amber-100 text-amber-800",
                                                nc.estado === 'EN_ANALISIS' && "bg-blue-100 text-blue-800",
                                                nc.estado === 'EN_ACCION' && "bg-purple-100 text-purple-800",
                                                nc.estado === 'VERIFICADA' && "bg-emerald-100 text-emerald-800",
                                                nc.estado === 'CERRADA' && "bg-slate-100 text-slate-700"
                                            )}>
                                                {nc.estado}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openRootCauseModal(nc)}
                                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                                                    title="Análisis de Causa Raíz (5 Por Qués / Ishikawa)"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                {nc.estado !== 'CERRADA' && (
                                                    <button
                                                        onClick={() => handleCloseNC(nc.id)}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                                        title="Cerrar No Conformidad"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE NC MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                Registrar No Conformidad (NC)
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateNC} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Origen del Hallazgo *</label>
                                    <select
                                        value={formOrigen}
                                        onChange={(e) => setFormOrigen(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    >
                                        <option value="PRODUCCION">Producción en Planta</option>
                                        <option value="INSPECCION">Inspección de Calidad</option>
                                        <option value="CLIENTE">Reclamo de Cliente</option>
                                        <option value="PROVEEDOR">Materia Prima / Proveedor</option>
                                        <option value="MANTENIMIENTO">Falla de Máquina / Mtto</option>
                                        <option value="AUDITORIA">Auditoría Interna/Externa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Defecto *</label>
                                    <select
                                        value={formTipoDefecto}
                                        onChange={(e) => setFormTipoDefecto(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    >
                                        <option value="DIMENSIONAL">Dimensional (Cota fuera de tolerancia)</option>
                                        <option value="VISUAL">Visual (Rayas, poros, golpes)</option>
                                        <option value="MATERIAL">Material (Dureza, porosidad, fisuras)</option>
                                        <option value="SOLDADURA">Soldadura (Falta penetración, socavado)</option>
                                        <option value="RUGOSIDAD">Rugosidad Superficial</option>
                                        <option value="ACABADO">Acabado / Pintura / Recubrimiento</option>
                                        <option value="FUNCIONAL">Funcional / Montaje</option>
                                        <option value="DOCUMENTAL">Documental / Certificado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Orden de Trabajo (OT)</label>
                                    <select
                                        value={formOTId}
                                        onChange={(e) => setFormOTId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    >
                                        <option value="">Seleccionar OT...</option>
                                        {orders.map(o => (
                                            <option key={o.id} value={o.id}>{o.numero_ot} - {o.producto?.nombre_producto || o.cliente}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Producto</label>
                                    <select
                                        value={formProductId}
                                        onChange={(e) => setFormProductId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    >
                                        <option value="">Seleccionar Producto...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.sku_producto} - {p.nombre_producto}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Máquina</label>
                                    <select
                                        value={formMaquinaId}
                                        onChange={(e) => setFormMaquinaId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    >
                                        <option value="">Sin máquina...</option>
                                        {machines.map(m => (
                                            <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cant. Afectada</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formCantidadAfectada}
                                        onChange={(e) => setFormCantidadAfectada(Number(e.target.value))}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Costo Estimado ($)</label>
                                    <input
                                        type="number"
                                        value={formCostoEstimado}
                                        onChange={(e) => setFormCostoEstimado(Number(e.target.value))}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descripción del Problema / Evidencia *</label>
                                <textarea
                                    value={formDescripcion}
                                    onChange={(e) => setFormDescripcion(e.target.value)}
                                    rows={3}
                                    placeholder="Describe la no conformidad encontrada, cota desviada o defecto visual..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl"
                                >
                                    Registrar No Conformidad
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DISPOSITION MODAL */}
            {showDispositionModal && selectedNC && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-blue-600" />
                                Disposición del Producto No Conforme ({selectedNC.codigo})
                            </h3>
                            <button onClick={() => setShowDispositionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSaveDisposition} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Acción de Disposición *</label>
                                <select
                                    value={dispOption}
                                    onChange={(e: any) => setDispOption(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                                >
                                    <option value="RETRABAJO">Retrabajo (Volver a mecanizar / corregir en taller)</option>
                                    <option value="REPARACION">Reparación (Ajuste técnico menor)</option>
                                    <option value="RECLASIFICACION">Reclasificación (Apto para otra aplicación)</option>
                                    <option value="DEVOLUCION_PROVEEDOR">Devolución al Proveedor</option>
                                    <option value="DESCARTE">Descarte (Chatarra / Desperdicio)</option>
                                    <option value="CONCESION">Aceptación bajo Concesión (Autorización especial)</option>
                                </select>
                            </div>

                            {dispOption === 'CONCESION' && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                                        <UserCheck className="w-4 h-4" /> Aceptación bajo Concesión ISO 9001
                                    </div>
                                    <p className="text-[11px] text-amber-700">
                                        Requiere autorización explícita y justificación técnica demostrando que no afecta la funcionalidad.
                                    </p>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Autorizado por: *</label>
                                        <input
                                            type="text"
                                            value={dispAutorizadoPor}
                                            onChange={(e) => setDispAutorizadoPor(e.target.value)}
                                            placeholder="Nombre del Ing. / Cliente autorizador"
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Justificación Técnica: *</label>
                                        <textarea
                                            value={dispJustificacion}
                                            onChange={(e) => setDispJustificacion(e.target.value)}
                                            rows={2}
                                            placeholder="Motivo por el cual se acepta sin afectar funcionalidad..."
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowDispositionModal(false)}
                                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                                >
                                    Guardar Disposición
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ROOT CAUSE ANALYSIS MODAL (5 WHYS & ISHIKAWA 6M) */}
            {showRootCauseModal && selectedNC && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-brand-600" />
                                    Análisis de Causa Raíz – NC {selectedNC.codigo}
                                </h3>
                                <p className="text-xs text-slate-500">{selectedNC.descripcion}</p>
                            </div>
                            <button onClick={() => setShowRootCauseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {/* Tabs: 5 Whys vs Ishikawa */}
                        <div className="flex items-center gap-2 mt-4 border-b border-black/5 pb-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveRootCauseTab('5_WHYS')}
                                className={clsx(
                                    "px-4 py-1.5 rounded-xl font-bold transition-all",
                                    activeRootCauseTab === '5_WHYS'
                                        ? "bg-brand-400 text-brand-950 shadow-xs"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                Método: 5 Por Qués (5 Whys)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveRootCauseTab('ISHIKAWA')}
                                className={clsx(
                                    "px-4 py-1.5 rounded-xl font-bold transition-all",
                                    activeRootCauseTab === 'ISHIKAWA'
                                        ? "bg-brand-400 text-brand-950 shadow-xs"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                Diagrama de Ishikawa (Espina de Pescado 6M)
                            </button>
                        </div>

                        <form onSubmit={handleSaveRootCause} className="space-y-4 mt-4 text-xs">
                            {activeRootCauseTab === '5_WHYS' ? (
                                <div className="space-y-3">
                                    <p className="text-[11px] text-slate-500">
                                        Pregunta sucesivamente <strong>¿Por qué?</strong> para profundizar desde el síntoma inicial hasta la causa fundamental.
                                    </p>
                                    {[
                                        { label: '1. ¿Por qué ocurrió el problema?', val: porque1, setVal: setPorque1 },
                                        { label: '2. ¿Por qué?', val: porque2, setVal: setPorque2 },
                                        { label: '3. ¿Por qué?', val: porque3, setVal: setPorque3 },
                                        { label: '4. ¿Por qué?', val: porque4, setVal: setPorque4 },
                                        { label: '5. ¿Por qué? (Causa Raíz)', val: porque5, setVal: setPorque5 }
                                    ].map((item, idx) => (
                                        <div key={idx}>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">{item.label}</label>
                                            <input
                                                type="text"
                                                value={item.val}
                                                onChange={(e) => item.setVal(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                                placeholder={`Nivel de análisis ${idx + 1}...`}
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                                            Conclusión de Causa Raíz *
                                        </label>
                                        <textarea
                                            value={causaRaiz}
                                            onChange={(e) => setCausaRaiz(e.target.value)}
                                            rows={2}
                                            placeholder="Causa raíz identificada para orientar la acción correctiva..."
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 font-medium"
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-[11px] text-slate-500">
                                        Analiza las posibles causas distribuidas en las 6 categorías del diagrama de Ishikawa (6M):
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">1. Máquina</label>
                                            <textarea
                                                value={ishMaquina}
                                                onChange={(e) => setIshMaquina(e.target.value)}
                                                placeholder="Desgaste, holguras, calibración..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">2. Método</label>
                                            <textarea
                                                value={ishMetodo}
                                                onChange={(e) => setIshMetodo(e.target.value)}
                                                placeholder="Procedimiento, velocidad, orden..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">3. Mano de Obra</label>
                                            <textarea
                                                value={ishManoObra}
                                                onChange={(e) => setIshManoObra(e.target.value)}
                                                placeholder="Capacitación, fatiga, experiencia..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">4. Material</label>
                                            <textarea
                                                value={ishMaterial}
                                                onChange={(e) => setIshMaterial(e.target.value)}
                                                placeholder="Dureza, lote, impurezas..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">5. Medición</label>
                                            <textarea
                                                value={ishMedicion}
                                                onChange={(e) => setIshMedicion(e.target.value)}
                                                placeholder="Error de instrumento, apreciación..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <label className="block font-bold text-slate-800 mb-1">6. Medio Ambiente</label>
                                            <textarea
                                                value={ishMedioAmbiente}
                                                onChange={(e) => setIshMedioAmbiente(e.target.value)}
                                                placeholder="Temperatura, iluminación, vibración..."
                                                rows={2}
                                                className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                                            Causa Raíz Seleccionada *
                                        </label>
                                        <input
                                            type="text"
                                            value={causaRaiz}
                                            onChange={(e) => setCausaRaiz(e.target.value)}
                                            placeholder="Causa raíz principal derivada del diagrama..."
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 font-medium"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowRootCauseModal(false)}
                                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm"
                                >
                                    Guardar Análisis de Causa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
