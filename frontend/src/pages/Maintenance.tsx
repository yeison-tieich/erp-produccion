import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../api';
import { generateOrderPDF, generateMachineFichaPDF } from '../utils/pdfGenerator';
import {
    Settings, Plus, Search, Activity,
    Calendar, AlertTriangle, CheckCircle, Info,
    X, Edit2, Trash2, Camera, Zap, Clock,
    Wrench, Layout, BarChart2, History, ChevronRight,
    User, MapPin, Tag, Truck, Save, Upload, FileText,
    Factory, ShieldCheck, ArrowUpRight, Check
} from 'lucide-react';
import clsx from 'clsx';

// --- Interfaces ---
interface Maquina {
    id: number;
    codigo: string;
    nombre: string;
    area_produccion: string | null;
    tipo: string | null;
    marca: string | null;
    modelo: string | null;
    serial: string | null;
    fecha_compra: string | null;
    estado: 'Operativa' | 'En mantenimiento' | 'Fuera de servicio';
    ubicacion: string | null;
    responsable: string | null;
    foto_url: string | null;
    hoja_vida_url: string | null;
    mantenimientos?: MantenimientoPreventivo[];
    planesMantenimiento?: PlanMantenimiento[];
    reportesFallas?: ReporteFalla[];
    ordenesMantenimiento?: OrdenMantenimiento[];
}

interface MantenimientoPreventivo {
    id: number;
    maquina_id: number;
    plan_id: number | null;
    fecha_programada: string;
    fecha_realizada?: string | null;
    tecnico_responsable?: string | null;
    observaciones?: string | null;
    costo_mantenimiento?: number | null;
    estado: string;
    fotos?: FotoMantenimiento[];
}

interface FotoMantenimiento {
    id: number;
    mantenimiento_id: number;
    url: string;
}

interface PlanMantenimiento {
    id: number;
    maquina_id: number;
    tarea: string;
    tipo_mtto: string;
    frecuencia: string;
    frecuencia_dias: number;
    responsable: string;
    proxima_fecha?: string | null;
}

interface ReporteFalla {
    id: number;
    maquina_id: number;
    fecha_reporte: string;
    reportado_por: string;
    descripcion: string;
    prioridad: 'Alta' | 'Media' | 'Baja';
    estado: 'Pendiente' | 'En proceso' | 'Cerrado';
    maquina?: Maquina;
}

interface OrdenMantenimiento {
    id: number;
    maquina_id: number;
    falla_id?: number | null;
    tipo: 'Preventivo' | 'Correctivo';
    fecha_inicio: string;
    fecha_fin?: string | null;
    tecnico: string;
    actividades: string | null;
    repuestos: string | null;
    tiempo_muerto_hrs: number;
    costo: number;
    estado: 'Abierta' | 'En proceso' | 'Cerrada';
    maquina?: Maquina;
}

export const MaintenancePage = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'maestro' | 'preventivo' | 'correctivo' | 'dashboard' | 'historial' | 'procesos'>('maestro');
    const [machines, setMachines] = useState<Maquina[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Detailed View
    const [selectedMachine, setSelectedMachine] = useState<Maquina | null>(null);
    const [showMachineModal, setShowMachineModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Maintenance Specifics
    const [reportesFallas, setReportesFallas] = useState<ReporteFalla[]>([]);
    const [ordenesMantenimiento, setOrdenesMantenimiento] = useState<OrdenMantenimiento[]>([]);
    const [kpis, setKpis] = useState<any>(null);

    // Historial de trabajo y procesos
    const [workHistory, setWorkHistory] = useState<any[]>([]);
    const [productProcesses, setProductProcesses] = useState<any[]>([]);
    const [selectedMachineForHistory, setSelectedMachineForHistory] = useState<number | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [processForm, setProcessForm] = useState({ producto_id: '', proceso: '', tiempo_estandar: '', observaciones: '' });
    const [products, setProducts] = useState<any[]>([]);

    // Modals
    const [showFallaModal, setShowFallaModal] = useState(false);
    const [showOMModal, setShowOMModal] = useState(false);
    const [showCloseOMModal, setShowCloseOMModal] = useState(false);
    const [activeOM, setActiveOM] = useState<OrdenMantenimiento | null>(null);
    const [showCompleteMttoModal, setShowCompleteMttoModal] = useState(false);
    const [activeMtto, setActiveMtto] = useState<MantenimientoPreventivo | null>(null);
    const [mttoPhotos, setMttoPhotos] = useState<File[]>([]);

    // Forms
    const [machineForm, setMachineForm] = useState<any>({
        codigo: '', nombre: '', area_produccion: '', tipo: '', marca: '',
        modelo: '', serial: '', fecha_compra: '', estado: 'Operativa',
        ubicacion: '', responsable: ''
    });

    const [fallaForm, setFallaForm] = useState({
        maquina_id: '', reportado_por: '', descripcion: '', prioridad: 'Media'
    });

    const [omForm, setOmForm] = useState({
        maquina_id: '', falla_id: '', tipo: 'Correctivo', tecnico: '', actividades: '', repuestos: ''
    });

    const [closeOMForm, setCloseOMForm] = useState({
        actividades: '', repuestos: '', tiempo_muerto_hrs: 0, costo: 0
    });

    const [completeMttoForm, setCompleteMttoForm] = useState({
        fecha_realizada: new Date().toISOString().split('T')[0],
        observaciones: '',
        tecnico_responsable: '',
        costo_mantenimiento: 0
    });

    // --- Data Fetching ---
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [mRes, fRes, oRes, kRes] = await Promise.all([
                axios.get(`${API_URL}/maintenance/maquinas`),
                axios.get(`${API_URL}/maintenance/reportes-fallas`),
                axios.get(`${API_URL}/maintenance/ordenes-mantenimiento`),
                axios.get(`${API_URL}/maintenance/kpis`)
            ]);
            setMachines(mRes.data);
            setReportesFallas(fRes.data);
            setOrdenesMantenimiento(oRes.data);
            setKpis(kRes.data);
        } catch (error) {
            console.error('Error fetching maintenance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        axios.get(`${API_URL}/products`).then(res => setProducts(res.data)).catch(() => {});
    }, []);

    const fetchWorkHistory = async (machineId: number) => {
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API_URL}/machines/${machineId}/work-history`);
            setWorkHistory(res.data);
        } catch (e) {
            setWorkHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchProductProcesses = async (machineId: number) => {
        try {
            const res = await axios.get(`${API_URL}/machines/${machineId}/product-processes`);
            setProductProcesses(res.data);
        } catch (e) {
            setProductProcesses([]);
        }
    };

    const handleSelectMachineForTabs = (machineId: number, tab: 'historial' | 'procesos') => {
        setSelectedMachineForHistory(machineId);
        setActiveTab(tab);
        if (tab === 'historial') fetchWorkHistory(machineId);
        if (tab === 'procesos') fetchProductProcesses(machineId);
    };

    const handleAddProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMachineForHistory) return;
        try {
            await axios.post(`${API_URL}/machines/${selectedMachineForHistory}/product-processes`, processForm);
            setProcessForm({ producto_id: '', proceso: '', tiempo_estandar: '', observaciones: '' });
            fetchProductProcesses(selectedMachineForHistory);
            alert('Proceso vinculado correctamente');
        } catch (err) {
            alert('Error al vincular proceso');
        }
    };

    const handleDeleteProcess = async (processId: number) => {
        if (!window.confirm('¿Eliminar este proceso vinculado?')) return;
        try {
            await axios.delete(`${API_URL}/machines/product-processes/${processId}`);
            if (selectedMachineForHistory) fetchProductProcesses(selectedMachineForHistory);
        } catch (err) {
            alert('Error al eliminar proceso');
        }
    };

    // --- Handlers ---
    const handleSaveMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode && machineForm.id) {
                await axios.put(`${API_URL}/maintenance/maquinas/${machineForm.id}`, machineForm);
            } else {
                await axios.post(`${API_URL}/machines`, machineForm);
            }
            setShowMachineModal(false);
            fetchAll();
        } catch (error) {
            alert('Error al guardar máquina');
        }
    };

    const handleReportFalla = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/maintenance/reportes-fallas`, fallaForm);
            setShowFallaModal(false);
            setFallaForm({ maquina_id: '', reportado_por: '', descripcion: '', prioridad: 'Media' });
            fetchAll();
        } catch (error) {
            alert('Error al reportar falla');
        }
    };

    const handleCreateOM = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/maintenance/ordenes-mantenimiento`, omForm);
            setShowOMModal(false);
            setOmForm({ maquina_id: '', falla_id: '', tipo: 'Correctivo', tecnico: '', actividades: '', repuestos: '' });
            fetchAll();
        } catch (error) {
            alert('Error al crear orden de mantenimiento');
        }
    };

    const handleCloseOM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOM) return;
        try {
            await axios.put(`${API_URL}/maintenance/ordenes-mantenimiento/${activeOM.id}/close`, closeOMForm);
            setShowCloseOMModal(false);
            setActiveOM(null);
            fetchAll();
        } catch (error) {
            alert('Error al cerrar orden de mantenimiento');
        }
    };

    const handleCompleteMtto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeMtto) return;
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

            await axios.put(`${API_URL}/maintenance/complete/${activeMtto.id}`, completeMttoForm, { headers });

            if (mttoPhotos.length > 0) {
                const formData = new FormData();
                mttoPhotos.forEach(file => formData.append('photos', file));
                await axios.post(`${API_URL}/maintenance/complete/${activeMtto.id}/photos`, formData, {
                    headers
                });
            }

            setShowCompleteMttoModal(false);
            setActiveMtto(null);
            setMttoPhotos([]);
            fetchAll();
            alert('Mantenimiento completado con éxito');
        } catch (error) {
            console.error(error);
            alert('Error al completar mantenimiento');
        }
    };

    const handleImageUpload = async (machineId: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`${API_URL}/machines/${machineId}/image`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (selectedMachine && selectedMachine.id === machineId) {
                setSelectedMachine({ ...selectedMachine, foto_url: res.data.foto_url });
            }
            fetchAll();
        } catch (error) {
            alert('Error al subir imagen');
        }
    };

    // --- Filtering ---
    const filteredMachines = machines.filter(m =>
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.area_produccion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Helpers ---
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Operativa':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'En mantenimiento':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Fuera de servicio':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    // 1. Tab: Maestro de Equipos
    const MaestroTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre o área de la máquina..."
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditMode(false); setMachineForm({ estado: 'Operativa' }); setShowMachineModal(true); }}
                    className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-md shadow-brand-100 transition font-bold text-sm"
                >
                    <Plus className="w-4 h-4" /> Nueva Máquina
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMachines.map(m => (
                    <div key={m.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                        {/* Machine Image Frame */}
                        <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                            {m.foto_url ? (
                                <img
                                    src={m.foto_url.startsWith('http') ? m.foto_url : (m.foto_url.startsWith('/uploads') ? `${BASE_URL}${m.foto_url}` : `${BASE_URL}/uploads/${m.foto_url}`)}
                                    alt={m.nombre}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                    <Factory className="w-10 h-10 stroke-[1.5]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sin Fotografía</span>
                                </div>
                            )}

                            {/* Status Tag */}
                            <div className="absolute top-3 right-3">
                                <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm", getStatusBadge(m.estado))}>
                                    {m.estado}
                                </span>
                            </div>

                            {/* Machine Code */}
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-black/5 shadow-sm">
                                <span className="text-slate-900 font-mono font-black text-sm">{m.codigo}</span>
                            </div>

                            {/* Quick Photo Upload Trigger */}
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                    type="file"
                                    className="hidden"
                                    id={`upload-${m.id}`}
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(m.id, file);
                                    }}
                                />
                                <label
                                    htmlFor={`upload-${m.id}`}
                                    className="p-2 bg-white/90 backdrop-blur-md rounded-lg border border-black/5 text-slate-700 hover:text-brand-600 cursor-pointer shadow-sm flex items-center gap-1 text-xs font-bold transition"
                                    title="Cambiar Foto"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </label>
                            </div>
                        </div>

                        {/* Machine Info */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 line-clamp-1 group-hover:text-brand-700 transition-colors">{m.nombre}</h3>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1 mb-4 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-brand-600" /> {m.area_produccion || 'Área General'}
                                </p>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Marca</span>
                                        <span className="text-xs font-bold text-slate-700 truncate">{m.marca || '—'}</span>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Responsable</span>
                                        <span className="text-xs font-bold text-slate-700 truncate">{m.responsable || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setEditMode(true);
                                            setMachineForm(m);
                                            setShowMachineModal(true);
                                        }}
                                        className="bg-slate-50 text-slate-700 py-2 rounded-xl font-bold text-xs hover:bg-brand-50 hover:text-brand-700 border border-slate-200 transition flex items-center justify-center gap-1.5"
                                    >
                                        <Edit2 className="w-3 h-3" /> Editar
                                    </button>
                                    <button
                                        onClick={() => generateMachineFichaPDF(m)}
                                        className="bg-slate-50 text-slate-700 py-2 rounded-xl font-bold text-xs hover:bg-orange-50 hover:text-orange-700 border border-slate-200 transition flex items-center justify-center gap-1.5"
                                    >
                                        <FileText className="w-3 h-3 text-orange-500" /> Ficha PDF
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                        onClick={() => { setSelectedMachine(m); setShowDetailModal(true); }}
                                        className="bg-brand-50 text-brand-800 py-2 rounded-xl font-bold text-[11px] hover:bg-brand-100 transition flex items-center justify-center gap-1"
                                        title="Ver Detalle"
                                    >
                                        <Layout className="w-3 h-3" /> Detalle
                                    </button>
                                    <button
                                        onClick={() => handleSelectMachineForTabs(m.id, 'historial')}
                                        className="bg-blue-50 text-blue-700 py-2 rounded-xl font-bold text-[11px] hover:bg-blue-100 transition flex items-center justify-center gap-1"
                                        title="Historial de OTs"
                                    >
                                        <History className="w-3 h-3" /> Historial
                                    </button>
                                    <button
                                        onClick={() => handleSelectMachineForTabs(m.id, 'procesos')}
                                        className="bg-purple-50 text-purple-700 py-2 rounded-xl font-bold text-[11px] hover:bg-purple-100 transition flex items-center justify-center gap-1"
                                        title="Procesos Vinculados"
                                    >
                                        <Wrench className="w-3 h-3" /> Procesos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // 2. Tab: Mantenimiento Preventivo
    const PreventivoTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">Planificación</h3>
                            <p className="text-[11px] text-gray-500 font-medium">Próximos mantenimientos</p>
                        </div>
                    </div>
                    <div className="space-y-3 mt-4">
                        {loading ? <div className="h-20 bg-gray-50 animate-pulse rounded-2xl"></div> :
                            machines.flatMap(m => m.mantenimientos || []).filter(mt => mt.estado === 'Programado').slice(0, 5).map(mt => (
                                <div key={mt.id} className="p-3.5 bg-brand-50/60 border border-brand-100/80 rounded-2xl flex items-center gap-3">
                                    <div className="p-2 bg-white text-brand-600 rounded-xl shadow-sm"><Calendar className="w-4 h-4" /></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{new Date(mt.fecha_programada).toLocaleDateString()}</p>
                                        <p className="text-[11px] text-slate-500 font-bold">Máquina: {machines.find(m => m.id === mt.maquina_id)?.codigo}</p>
                                    </div>
                                </div>
                            ))}
                        {machines.flatMap(m => m.mantenimientos || []).filter(mt => mt.estado === 'Programado').length === 0 && (
                            <p className="text-xs text-gray-400 font-medium text-center py-4">No hay mantenimientos programados pendientes.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Cronograma de Ejecución</h3>
                            <p className="text-xs text-gray-500 font-medium">Registro y control de actividades preventivas</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Máquina</th>
                                    <th className="p-4">Actividad / Tarea</th>
                                    <th className="p-4">Fecha Programada</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-medium text-sm">
                                {machines.flatMap(m => (m.mantenimientos || []).map(mt => ({ ...mt, mCodigo: m.codigo, mNombre: m.nombre }))).map(mt => (
                                    <tr key={mt.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-[10px]">{mt.mCodigo}</div>
                                                <span className="text-slate-900 font-bold">{mt.mNombre}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">Mantenimiento periódico preventivo</td>
                                        <td className="p-4 text-slate-800 font-bold">{new Date(mt.fecha_programada).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border",
                                                mt.estado === 'Realizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                            )}>{mt.estado}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {mt.estado !== 'Realizado' ? (
                                                <button
                                                    onClick={() => { setActiveMtto(mt); setShowCompleteMttoModal(true); }}
                                                    className="bg-brand-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-700 shadow-sm transition"
                                                >
                                                    REGISTRAR
                                                </button>
                                            ) : (
                                                <div className="flex justify-end gap-1">
                                                    {mt.fotos && mt.fotos.length > 0 && (
                                                        <div className="flex -space-x-2">
                                                            {mt.fotos.slice(0, 3).map(f => (
                                                                <img key={f.id} src={`${BASE_URL}${f.url}`} className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm" />
                                                            ))}
                                                            {mt.fotos.length > 3 && <span className="w-7 h-7 rounded-full bg-gray-100 text-[9px] flex items-center justify-center font-bold text-gray-600">+{mt.fotos.length - 3}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    // 3. Tab: Mantenimiento Correctivo
    const CorrectivoTab = () => (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Fallas y Reparaciones</h2>
                    <p className="text-xs text-gray-500 font-medium">Control de averías imprevistas y órdenes de trabajo correctivas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFallaModal(true)}
                        className="bg-rose-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-rose-700 transition font-bold text-xs shadow-sm"
                    >
                        <AlertTriangle className="w-4 h-4" /> Reportar Falla
                    </button>
                    <button
                        onClick={() => setShowOMModal(true)}
                        className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition font-bold text-xs shadow-sm"
                    >
                        <Wrench className="w-4 h-4 text-brand-400" /> Nueva Orden OM
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Failures */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-900">
                        <AlertTriangle className="text-rose-600 w-5 h-5" /> Reportes de Falla Activos
                    </h3>
                    <div className="space-y-3">
                        {reportesFallas.filter(f => f.estado !== 'Cerrado').map(falla => (
                            <div key={falla.id} className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-black text-xs">
                                        {falla.maquina?.codigo || '??'}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">{falla.maquina?.nombre}</p>
                                        <p className="text-xs text-slate-600 italic mt-0.5 font-medium">"{falla.descripcion}"</p>
                                        <div className="flex flex-wrap gap-2 mt-2 items-center">
                                            <span className={clsx("px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                                                falla.prioridad === 'Alta' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                                            )}>Prioridad: {falla.prioridad}</span>
                                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> {falla.reportado_por}</span>
                                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(falla.fecha_reporte).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setOmForm({ ...omForm, maquina_id: falla.maquina_id.toString(), falla_id: falla.id.toString(), tipo: 'Correctivo' }); setShowOMModal(true); }}
                                    className="bg-white text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-900 hover:text-white transition shadow-sm"
                                >
                                    CREAR OM
                                </button>
                            </div>
                        ))}
                        {reportesFallas.filter(f => f.estado !== 'Cerrado').length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-xs">
                                Sin fallas activas reportadas
                            </div>
                        )}
                    </div>
                </div>

                {/* Open Work Orders */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-900">
                        <Wrench className="text-brand-600 w-5 h-5" /> Órdenes en Proceso
                    </h3>
                    <div className="space-y-3">
                        {ordenesMantenimiento.filter(om => om.estado !== 'Cerrada').map(om => (
                            <div key={om.id} className="p-4 bg-brand-50/50 border border-brand-100 rounded-2xl flex justify-between items-center text-slate-900">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 bg-brand-500 text-brand-950 rounded-xl flex items-center justify-center font-black text-xs">
                                        OM
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">#{om.id} - {om.maquina?.codigo} ({om.maquina?.nombre})</p>
                                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{om.tipo} | Técnico: {om.tecnico}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setActiveOM(om); setShowCloseOMModal(true); }}
                                        className="bg-brand-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:bg-brand-700 transition"
                                    >
                                        CERRAR OM
                                    </button>
                                </div>
                            </div>
                        ))}
                        {ordenesMantenimiento.filter(om => om.estado !== 'Cerrada').length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-xs">
                                No hay órdenes de mantenimiento abiertas
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // 4. Tab: Dashboard KPIs
    const DashboardTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-brand-50 p-3 rounded-xl">
                        <Activity className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">MTTR (Reparación)</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <h3 className="text-2xl font-black text-slate-900">{kpis?.mttr || 0}</h3>
                            <span className="text-xs font-bold text-gray-500">horas</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Órdenes Mes</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <h3 className="text-2xl font-black text-slate-900">{kpis?.totalOrders || 0}</h3>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">Ejecutadas</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-rose-50 p-3 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiempo Muerto</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <h3 className="text-2xl font-black text-rose-600">{kpis?.totalDowntime || 0}</h3>
                            <span className="text-xs font-bold text-gray-500">horas</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-emerald-50 p-3 rounded-xl">
                        <Zap className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disponibilidad Planta</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <h3 className="text-2xl font-black text-emerald-700">97.8%</h3>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Óptimo</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                    <BarChart2 className="w-8 h-8 text-brand-600" />
                </div>
                <h4 className="text-base font-black text-slate-800">Monitoreo y Métricas de Planta</h4>
                <p className="text-xs text-gray-500 max-w-md mt-1">El ratio de confiabilidad de maquinaria se calcula dinámicamente con las OTs finalizadas y los mantenimientos preventivos certificados.</p>
            </div>
        </div>
    );

    // 5. Tab: Historial de Trabajo
    const HistorialTab = () => {
        const machine = machines.find(m => m.id === selectedMachineForHistory);
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <History className="text-blue-600 w-5 h-5" />
                                Historial de Utilización
                            </h3>
                            {machine && (
                                <p className="text-xs font-bold text-gray-500 mt-0.5">
                                    {machine.codigo} — {machine.nombre}
                                </p>
                            )}
                        </div>
                    </div>
                    {loadingHistory ? (
                        <div className="h-40 bg-gray-50 animate-pulse rounded-2xl"></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="p-4">OT / Tarea</th>
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Operario</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Horas Trab.</th>
                                        <th className="p-4">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                                    {workHistory.map((h: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-bold text-gray-900">{h.ot_numero || h.tarea_nombre || 'N/A'}</td>
                                            <td className="p-4">{h.producto || '—'}</td>
                                            <td className="p-4">{h.operario || '—'}</td>
                                            <td className="p-4">{h.fecha ? new Date(h.fecha).toLocaleDateString() : '—'}</td>
                                            <td className="p-4 font-bold text-blue-600">{h.horas_trabajadas || '—'} h</td>
                                            <td className="p-4">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                    {h.estado || 'Completada'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {workHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs tracking-wider">
                                                No hay historial de trabajo registrado para esta máquina
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 6. Tab: Procesos / Productos Habituales
    const ProcesosTab = () => {
        const machine = machines.find(m => m.id === selectedMachineForHistory);
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Process Form */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
                            <Plus className="text-purple-600 w-5 h-5" /> Vincular Proceso
                        </h3>
                        {machine && (
                            <p className="text-xs font-bold text-gray-500 mb-4">{machine.codigo} — {machine.nombre}</p>
                        )}
                        <form onSubmit={handleAddProcess} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Producto</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={processForm.producto_id}
                                    onChange={e => setProcessForm({ ...processForm, producto_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {products.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.nombre_producto || p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Proceso / Operación</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Ej: Torneado, Fresado..."
                                    value={processForm.proceso}
                                    onChange={e => setProcessForm({ ...processForm, proceso: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Tiempo Estándar (min)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={processForm.tiempo_estandar}
                                    onChange={e => setProcessForm({ ...processForm, tiempo_estandar: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Observaciones</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none h-20"
                                    value={processForm.observaciones}
                                    onChange={e => setProcessForm({ ...processForm, observaciones: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 transition shadow-sm"
                            >
                                VINCULAR PROCESO
                            </button>
                        </form>
                    </div>

                    {/* Processes List */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Wrench className="text-purple-600 w-5 h-5" /> Procesos / Productos Habituales
                        </h3>
                        <div className="space-y-3">
                            {productProcesses.map((pp: any) => (
                                <div key={pp.id} className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                            {pp.proceso?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{pp.proceso}</p>
                                            <p className="text-xs font-bold text-gray-500">{pp.producto?.nombre_producto || pp.producto?.nombre || 'Producto'}</p>
                                            {pp.tiempo_estandar && (
                                                <p className="text-[10px] font-bold text-purple-600 mt-0.5">⏱ {pp.tiempo_estandar} min estándar</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteProcess(pp.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {productProcesses.length === 0 && (
                                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-xs">
                                    No hay procesos vinculados para esta máquina
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Layout ---
    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Unified Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-brand-600" />
                        Mantenimiento & Planta
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                            Control de Activos & Maquinaria
                        </span>
                        <p className="text-gray-500 text-sm font-medium">Gestión integral de maquinaria, planes preventivos y correctivos.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setEditMode(false); setMachineForm({ estado: 'Operativa' }); setShowMachineModal(true); }}
                        className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-md shadow-brand-100 transition font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" /> Nueva Máquina
                    </button>
                    <button
                        onClick={() => setShowFallaModal(true)}
                        className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-rose-100 transition font-bold text-sm"
                    >
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Reportar Falla
                    </button>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('maestro')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                        activeTab === 'maestro'
                            ? "bg-brand-500 text-brand-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    )}
                >
                    <Factory className="w-3.5 h-3.5" /> Maestro de Equipos
                </button>
                <button
                    onClick={() => setActiveTab('preventivo')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                        activeTab === 'preventivo'
                            ? "bg-brand-500 text-brand-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    )}
                >
                    <Calendar className="w-3.5 h-3.5" /> Preventivo
                </button>
                <button
                    onClick={() => setActiveTab('correctivo')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                        activeTab === 'correctivo'
                            ? "bg-brand-500 text-brand-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    )}
                >
                    <Wrench className="w-3.5 h-3.5" /> Correctivo
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                        activeTab === 'dashboard'
                            ? "bg-brand-500 text-brand-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    )}
                >
                    <BarChart2 className="w-3.5 h-3.5" /> Indicadores & KPIs
                </button>
                {selectedMachineForHistory && (
                    <>
                        <button
                            onClick={() => handleSelectMachineForTabs(selectedMachineForHistory!, 'historial')}
                            className={clsx(
                                "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                                activeTab === 'historial'
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-blue-600 hover:bg-blue-50"
                            )}
                        >
                            <History className="w-3.5 h-3.5" /> Historial OT
                        </button>
                        <button
                            onClick={() => handleSelectMachineForTabs(selectedMachineForHistory!, 'procesos')}
                            className={clsx(
                                "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                                activeTab === 'procesos'
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "text-purple-600 hover:bg-purple-50"
                            )}
                        >
                            <Wrench className="w-3.5 h-3.5" /> Procesos
                        </button>
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'maestro' && <MaestroTab />}
                {activeTab === 'preventivo' && <PreventivoTab />}
                {activeTab === 'correctivo' && <CorrectivoTab />}
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'historial' && <HistorialTab />}
                {activeTab === 'procesos' && <ProcesosTab />}
            </div>

            {/* --- MODALS --- */}

            {/* Machine Detail Modal */}
            {showDetailModal && selectedMachine && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-black">
                                    <Factory className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{selectedMachine.nombre}</h2>
                                    <p className="text-xs font-mono font-bold text-brand-600">{selectedMachine.codigo}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Photo display */}
                            <div className="h-64 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 relative group flex items-center justify-center">
                                {selectedMachine.foto_url ? (
                                    <img
                                        src={selectedMachine.foto_url.startsWith('http') ? selectedMachine.foto_url : (selectedMachine.foto_url.startsWith('/uploads') ? `${BASE_URL}${selectedMachine.foto_url}` : `${BASE_URL}/uploads/${selectedMachine.foto_url}`)}
                                        alt={selectedMachine.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-slate-400 text-center">
                                        <Factory className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold">Sin foto asignada</p>
                                    </div>
                                )}
                            </div>

                            {/* Technical specifications */}
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Estado Operativo</span>
                                    <span className={clsx("px-2.5 py-0.5 rounded-lg text-xs font-bold border", getStatusBadge(selectedMachine.estado))}>
                                        {selectedMachine.estado}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Área</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedMachine.area_produccion || '—'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Marca / Modelo</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedMachine.marca || '—'} {selectedMachine.modelo || ''}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Serial</span>
                                    <span className="text-xs font-bold text-slate-800 font-mono">{selectedMachine.serial || '—'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Responsable</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedMachine.responsable || '—'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => generateMachineFichaPDF(selectedMachine)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4 text-orange-500" /> Descargar Ficha Técnica
                            </button>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Machine Create/Edit Modal */}
            {showMachineModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <h2 className="text-2xl font-black text-slate-900">{editMode ? 'Editar Máquina' : 'Registrar Máquina Nueva'}</h2>
                            <button onClick={() => setShowMachineModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveMachine} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Código Interno</label>
                                    <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 focus:bg-white outline-none font-bold text-sm" value={machineForm.codigo} onChange={e => setMachineForm({...machineForm, codigo: e.target.value})} placeholder="Ej: M-101" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del Equipo</label>
                                    <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 focus:bg-white outline-none font-bold text-sm" value={machineForm.nombre} onChange={e => setMachineForm({...machineForm, nombre: e.target.value})} placeholder="Ej: Torno CNC Mazak" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Marca</label>
                                        <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 outline-none font-bold text-sm" value={machineForm.marca} onChange={e => setMachineForm({...machineForm, marca: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Modelo</label>
                                        <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 outline-none font-bold text-sm" value={machineForm.modelo} onChange={e => setMachineForm({...machineForm, modelo: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Área de Producción</label>
                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 outline-none font-bold text-sm" value={machineForm.area_produccion} onChange={e => setMachineForm({...machineForm, area_produccion: e.target.value})} placeholder="Ej: Mecanizado" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Estado Operativo</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 outline-none font-bold text-sm" value={machineForm.estado} onChange={e => setMachineForm({...machineForm, estado: e.target.value})}>
                                        <option value="Operativa">Operativa</option>
                                        <option value="En mantenimiento">En mantenimiento</option>
                                        <option value="Fuera de servicio">Fuera de servicio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Responsable de Equipo</label>
                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-500 outline-none font-bold text-sm" value={machineForm.responsable} onChange={e => setMachineForm({...machineForm, responsable: e.target.value})} placeholder="Nombre técnico/operario" />
                                </div>
                            </div>
                            <div className="col-span-full pt-4 border-t border-gray-100 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowMachineModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-sm">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 transition">GUARDAR MÁQUINA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Falla Modal */}
            {showFallaModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <h2 className="text-xl font-black flex items-center gap-2 text-rose-600"><AlertTriangle className="w-6 h-6" /> Reportar Falla</h2>
                            <button onClick={() => setShowFallaModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleReportFalla} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Equipo Afectado</label>
                                <select required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm outline-none focus:border-brand-500" value={fallaForm.maquina_id} onChange={e => setFallaForm({...fallaForm, maquina_id: e.target.value})}>
                                    <option value="">Seleccionar máquina...</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Reportado por</label>
                                    <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={fallaForm.reportado_por} onChange={e => setFallaForm({...fallaForm, reportado_por: e.target.value})} placeholder="Nombre operario" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Prioridad</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={fallaForm.prioridad} onChange={e => setFallaForm({...fallaForm, prioridad: e.target.value as any})}>
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Alta">Alta (Parada de línea)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Descripción del Síntoma</label>
                                <textarea required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm h-28 outline-none focus:border-brand-500" value={fallaForm.descripcion} onChange={e => setFallaForm({...fallaForm, descripcion: e.target.value})} placeholder="Describe el fallo presentado..."></textarea>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowFallaModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-sm">Cancelar</button>
                                <button type="submit" className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-rose-700 transition">ENVIAR REPORTE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* OM Create Modal */}
            {showOMModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <h2 className="text-xl font-black flex items-center gap-2 text-slate-900"><Wrench className="w-6 h-6 text-brand-600" /> Nueva Orden de Mantenimiento</h2>
                            <button onClick={() => setShowOMModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateOM} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Máquina</label>
                                <select required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm outline-none focus:border-brand-500" value={omForm.maquina_id} onChange={e => setOmForm({...omForm, maquina_id: e.target.value})}>
                                    <option value="">Seleccionar máquina...</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tipo OM</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={omForm.tipo} onChange={e => setOmForm({...omForm, tipo: e.target.value as any})}>
                                        <option value="Correctivo">Correctivo</option>
                                        <option value="Preventivo">Preventivo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Técnico Responsable</label>
                                    <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={omForm.tecnico} onChange={e => setOmForm({...omForm, tecnico: e.target.value})} placeholder="Nombre técnico" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Actividades Previstas</label>
                                <textarea className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm h-24 outline-none focus:border-brand-500" value={omForm.actividades} onChange={e => setOmForm({...omForm, actividades: e.target.value})} placeholder="Detalle del trabajo técnico..."></textarea>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowOMModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-sm">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 transition">CREAR ORDEN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* OM Close Modal */}
            {showCloseOMModal && activeOM && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl border border-gray-100 text-slate-900">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <h2 className="text-xl font-black flex items-center gap-2"><CheckCircle className="text-emerald-600 w-6 h-6" /> Cerrar Orden #{activeOM.id}</h2>
                            <button onClick={() => setShowCloseOMModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCloseOM} className="space-y-4">
                            <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                                <p className="text-[10px] font-black uppercase text-brand-600 tracking-wider">Equipo Atendido</p>
                                <p className="font-bold text-slate-900 text-sm mt-0.5">{activeOM.maquina?.codigo} - {activeOM.maquina?.nombre}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tiempo Muerto (Horas)</label>
                                    <input type="number" step="0.5" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm" value={closeOMForm.tiempo_muerto_hrs} onChange={e => setCloseOMForm({...closeOMForm, tiempo_muerto_hrs: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Costo Total ($)</label>
                                    <input type="number" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm" value={closeOMForm.costo} onChange={e => setCloseOMForm({...closeOMForm, costo: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Actividades Realizadas</label>
                                <textarea required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm h-24" value={closeOMForm.actividades} onChange={e => setCloseOMForm({...closeOMForm, actividades: e.target.value})} placeholder="Describe el trabajo técnico ejecutado..."></textarea>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCloseOMModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-sm">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition flex items-center gap-2">
                                    <Save className="w-4 h-4" /> CERTIFICAR Y CERRAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Complete Preventive Maintenance Modal */}
            {showCompleteMttoModal && activeMtto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl border border-gray-100 text-slate-900">
                        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
                            <h2 className="text-xl font-black flex items-center gap-2"><CheckCircle className="text-brand-600 w-6 h-6" /> Completar Mantenimiento</h2>
                            <button onClick={() => setShowCompleteMttoModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCompleteMtto} className="space-y-4">
                            <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-wider">Equipo Programado</p>
                                <p className="font-bold text-slate-900 text-sm">
                                    {machines.find(m => m.id === activeMtto.maquina_id)?.codigo} - {machines.find(m => m.id === activeMtto.maquina_id)?.nombre}
                                </p>
                                <p className="text-xs text-brand-700 mt-0.5 font-medium">Fecha: {new Date(activeMtto.fecha_programada).toLocaleDateString()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Fecha Realización</label>
                                    <input type="date" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={completeMttoForm.fecha_realizada} onChange={e => setCompleteMttoForm({...completeMttoForm, fecha_realizada: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Técnico Responsable</label>
                                    <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm" value={completeMttoForm.tecnico_responsable} onChange={e => setCompleteMttoForm({...completeMttoForm, tecnico_responsable: e.target.value})} placeholder="Nombre técnico" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Evidencia Fotográfica (Max 5)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {mttoPhotos.map((p, i) => (
                                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border">
                                            <img src={URL.createObjectURL(p)} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setMttoPhotos(mttoPhotos.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    {mttoPhotos.length < 5 && (
                                        <label className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-brand-500 cursor-pointer">
                                            <Plus className="w-5 h-5" />
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                                                if (e.target.files) {
                                                    const newFiles = Array.from(e.target.files);
                                                    setMttoPhotos(prev => [...prev, ...newFiles].slice(0, 5));
                                                }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Observaciones Técnicas</label>
                                <textarea className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-sm h-20" value={completeMttoForm.observaciones} onChange={e => setCompleteMttoForm({...completeMttoForm, observaciones: e.target.value})} placeholder="Detalles del trabajo realizado..."></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Costo Insumos ($)</label>
                                <input type="number" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm" value={completeMttoForm.costo_mantenimiento} onChange={e => setCompleteMttoForm({...completeMttoForm, costo_mantenimiento: Number(e.target.value)})} />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCompleteMttoModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-sm">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 transition flex items-center gap-2">
                                    <Save className="w-4 h-4" /> GUARDAR EJECUCIÓN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
