import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../api';
import { generateOrderPDF, generateMachineFichaPDF } from '../utils/pdfGenerator';
import {
    Settings, Plus, Search, Activity,
    Calendar, AlertTriangle, CheckCircle, Info,
    X, Edit2, Trash2, Camera, Zap, Clock, 
    Wrench, Layout, BarChart, History, ChevronRight,
    User, MapPin, Tag, Truck, Save, Upload, FileText
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
    const [activeTab, setActiveTab] = useState<'maestro' | 'preventivo' | 'correctivo' | 'dashboard'>('maestro');
    const [machines, setMachines] = useState<Maquina[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Detailed View
    const [selectedMachine, setSelectedMachine] = useState<Maquina | null>(null);
    const [showMachineModal, setShowMachineModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Maintenance Specifics
    const [reportesFallas, setReportesFallas] = useState<ReporteFalla[]>([]);
    const [ordenesMantenimiento, setOrdenesMantenimiento] = useState<OrdenMantenimiento[]>([]);
    const [kpis, setKpis] = useState<any>(null);

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

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, []);

    // --- Handlers ---
    const handleSaveMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode && machineForm.id) {
                await axios.put(`${API_URL}/maintenance/maquinas/${machineForm.id}`, machineForm);
            } else {
                await axios.post(`${API_URL}/machines`, machineForm); // Use existing logic for create
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

            // 1. Complete maintenance data
            await axios.put(`${API_URL}/maintenance/complete/${activeMtto.id}`, completeMttoForm, { headers });

            // 2. Upload photos if any
            if (mttoPhotos.length > 0) {
                const formData = new FormData();
                mttoPhotos.forEach(file => formData.append('photos', file));
                await axios.post(`${API_URL}/maintenance/complete/${activeMtto.id}/photos`, formData, {
                    headers: {
                        ...headers,
                        'Content-Type': 'multipart/form-data'
                    }
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMachine) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Reusing general image upload endpoint if it exists, or assuming a specific one
            const res = await axios.post(`${API_URL}/machines/${selectedMachine.id}/image`, formData);
            setSelectedMachine({ ...selectedMachine, foto_url: res.data.foto_url });
            fetchAll();
        } catch (error) {
            alert('Error al subir imagen');
        }
    };

    // --- Filtering ---
    const filteredMachines = machines.filter(m => 
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Helpers ---
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Operativa': return 'bg-green-100 text-green-700';
            case 'En mantenimiento': return 'bg-blue-100 text-blue-700';
            case 'Fuera de servicio': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // --- Sub-Components ---
    
    // 1. Tab: Maestro de Equipos
    const MaestroTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre de máquina..."
                        className="w-full pl-16 pr-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => { setEditMode(false); setMachineForm({ estado: 'Operativa' }); setShowMachineModal(true); }}
                    className="bg-brand-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-brand-700 transition font-black"
                >
                    <Plus className="w-5 h-5" /> Nueva Máquina
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMachines.map(m => (
                    <div key={m.id} className="bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                        <div className="h-40 bg-slate-900 relative">
                            {m.foto_url ? (
                                <img src={`${BASE_URL}/images/${m.foto_url}`} alt={m.nombre} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/10 italic font-black uppercase tracking-widest pointer-events-none">MT ERP v2</div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
                                <span className={clsx("px-3 py-1 rounded-lg text-[10px] font-black uppercase", getStatusColor(m.estado))}>
                                    {m.estado}
                                </span>
                            </div>
                            <div className="absolute bottom-4 left-4 group/code">
                                <span className="text-white font-black text-lg tracking-tighter drop-shadow-md">{m.codigo}</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    id={`upload-${m.id}`} 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const formData = new FormData();
                                            formData.append('image', file);
                                            axios.post(`${API_URL}/machines/${m.id}/image`, formData, {
                                                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
                                            }).then(() => fetchAll());
                                        }
                                    }}
                                />
                                <label htmlFor={`upload-${m.id}`} className="ml-2 p-1.5 bg-white/20 backdrop-blur-md rounded-lg border border-white/30 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-4 h-4" />
                                </label>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-lg font-black text-slate-800 line-clamp-1">{m.nombre}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-4 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {m.area_produccion || 'General'}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-gray-300 uppercase">Marca</span>
                                    <span className="text-xs font-bold text-slate-700">{m.marca || '--'}</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-gray-300 uppercase">Responsable</span>
                                    <span className="text-xs font-bold text-slate-700 truncate w-full text-center">{m.responsable || '--'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => { 
                                        setEditMode(true); 
                                        setMachineForm(m); 
                                        setShowMachineModal(true); 
                                    }}
                                    className="bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button 
                                    onClick={() => {
                                        generateMachineFichaPDF(m);
                                    }}
                                    className="bg-orange-50 text-orange-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Ficha
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => { setSelectedMachine(m); setActiveTab('maestro'); }}
                                className="w-full mt-2 bg-slate-50 text-slate-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-50 hover:text-brand-600 transition flex items-center justify-center gap-2"
                            >
                                <Layout className="w-4 h-4" /> Detalle Técnico
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // 2. Tab: Mantenimiento Preventivo
    const PreventivoTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-black flex items-center gap-2 mb-4"><Zap className="text-brand-500" /> Planificación</h3>
                    <p className="text-xs text-gray-500 font-bold mb-6">Próximos mantenimientos preventivos programados según el calendario.</p>
                    <div className="space-y-3">
                        {loading ? <div className="h-20 bg-gray-50 animate-pulse rounded-2xl"></div> : 
                         machines.flatMap(m => m.mantenimientos || []).filter(mt => mt.estado === 'Programado').slice(0, 5).map(mt => (
                            <div key={mt.id} className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">{new Date(mt.fecha_programada).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">Máquina: {machines.find(m => m.id === mt.maquina_id)?.codigo}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black text-slate-900">Cronograma de Ejecución</h3>
                        <div className="flex gap-2">
                             <button className="p-2 bg-gray-50 text-gray-500 rounded-xl"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                             <button className="p-2 bg-gray-50 text-gray-500 rounded-xl"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-6">Máquina</th>
                                    <th className="p-6">Actividad / Tarea</th>
                                    <th className="p-6">Fecha Programada</th>
                                    <th className="p-6">Estado</th>
                                    <th className="p-6 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                {machines.flatMap(m => (m.mantenimientos || []).map(mt => ({ ...mt, mCodigo: m.codigo, mNombre: m.nombre }))).map(mt => (
                                    <tr key={mt.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-[10px]">{mt.mCodigo}</div>
                                                <span className="text-slate-900">{mt.mNombre}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-slate-500 text-xs">Mantenimiento periódico preventivo</td>
                                        <td className="p-6 text-slate-900">{new Date(mt.fecha_programada).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <span className={clsx("px-2 py-1 rounded-full text-[9px] font-black uppercase", 
                                                mt.estado === 'Realizado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            )}>{mt.estado}</span>
                                        </td>
                                        <td className="p-6 text-right">
                                            {mt.estado !== 'Realizado' ? (
                                                <button 
                                                    onClick={() => { setActiveMtto(mt); setShowCompleteMttoModal(true); }}
                                                    className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black"
                                                >
                                                    REGISTRAR
                                                </button>
                                            ) : (
                                                <div className="flex justify-end gap-1">
                                                    {mt.fotos && mt.fotos.length > 0 && (
                                                        <div className="flex -space-x-2">
                                                            {mt.fotos.slice(0, 3).map(f => (
                                                                <img key={f.id} src={`${BASE_URL}${f.url}`} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                                                            ))}
                                                            {mt.fotos.length > 3 && <span className="w-6 h-6 rounded-full bg-gray-100 text-[8px] flex items-center justify-center font-bold">+{mt.fotos.length - 3}</span>}
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
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestión de Fallas y Reparaciones</h2>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowFallaModal(true)}
                        className="bg-red-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-red-700 transition font-black text-sm"
                    >
                        <AlertTriangle className="w-5 h-5" /> Reportar Falla
                    </button>
                    <button 
                        onClick={() => setShowOMModal(true)}
                        className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition font-black text-sm"
                    >
                        <Wrench className="w-5 h-5" /> Nueva Orden
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Failures */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2"><AlertTriangle className="text-red-600" /> Reportes de Falla Activos</h3>
                    <div className="space-y-4">
                        {reportesFallas.filter(f => f.estado !== 'Cerrado').map(falla => (
                            <div key={falla.id} className="p-5 bg-red-50/50 border border-red-100 rounded-[2rem] flex justify-between items-start">
                                <div className="flex gap-4">
                                     <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-black">
                                         {falla.maquina?.codigo || '??'}
                                     </div>
                                     <div>
                                         <p className="font-black text-slate-800 text-lg">{falla.maquina?.nombre}</p>
                                         <p className="text-sm text-slate-500 italic mt-1 font-medium">"{falla.descripcion}"</p>
                                         <div className="flex gap-3 mt-3 items-center">
                                             <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                                 falla.prioridad === 'Alta' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                                             )}>Prioridad: {falla.prioridad}</span>
                                             <span className="text-[10px] font-black text-gray-400 flex items-center gap-1"><User className="w-3 h-3" /> {falla.reportado_por}</span>
                                             <span className="text-[10px] font-black text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(falla.fecha_reporte).toLocaleString()}</span>
                                         </div>
                                     </div>
                                </div>
                                <button 
                                    onClick={() => { setOmForm({ ...omForm, maquina_id: falla.maquina_id.toString(), falla_id: falla.id.toString(), tipo: 'Correctivo' }); setShowOMModal(true); }}
                                    className="bg-white text-slate-900 border-2 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition"
                                >
                                    CREAR OM
                                </button>
                            </div>
                        ))}
                        {reportesFallas.filter(f => f.estado !== 'Cerrado').length === 0 && (
                            <div className="p-10 text-center border-2 border-dashed rounded-[2.5rem] text-gray-300 font-black uppercase text-xs tracking-widest">
                                Sin fallas activas reportadas
                            </div>
                        )}
                    </div>
                </div>

                {/* Open Work Orders */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Wrench className="text-brand-600" /> Órdenes en Proceso</h3>
                    <div className="space-y-4">
                        {ordenesMantenimiento.filter(om => om.estado !== 'Cerrada').map(om => (
                            <div key={om.id} className="p-5 bg-brand-50/50 border border-brand-100 rounded-[2rem] flex justify-between items-center text-slate-900">
                                <div className="flex gap-4 items-center">
                                     <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-black">
                                         OM
                                     </div>
                                     <div>
                                         <p className="font-black text-slate-800">#{om.id} - {om.maquina?.codigo}</p>
                                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{om.tipo} | Técnico: {om.tecnico}</p>
                                     </div>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => { setActiveOM(om); setShowCloseOMModal(true); }}
                                        className="bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-brand-100"
                                     >
                                         CERRAR OM
                                     </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // 4. Tab: Dashboard
    const DashboardTab = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                     <p className="text-[10px] font-black uppercase text-brand-400 tracking-widest mb-2">MTTR (Reparación Media)</p>
                     <h4 className="text-5xl font-black tracking-tighter">{kpis?.mttr || 0} <span className="text-lg text-slate-500">hrs</span></h4>
                     <div className="mt-4 flex items-center gap-2 text-green-400 font-bold text-xs">
                         <Activity className="w-3 h-3" /> Promedio de respuesta
                     </div>
                 </div>
                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Órdenes Ejecutadas (Mes)</p>
                     <h4 className="text-5xl font-black tracking-tighter text-slate-900">{kpis?.totalOrders || 0}</h4>
                     <div className="mt-4 flex items-center gap-2 text-brand-600 font-bold text-xs">
                         <CheckCircle className="w-3 h-3" /> Cumplimiento: 92%
                     </div>
                 </div>
                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Tiempo Muerto Total</p>
                     <h4 className="text-5xl font-black tracking-tighter text-red-600">{kpis?.totalDowntime || 0} <span className="text-lg text-gray-300">hrs</span></h4>
                     <div className="mt-4 flex items-center gap-2 text-red-500 font-bold text-xs">
                         <AlertTriangle className="w-3 h-3" /> Crítico para productividad
                     </div>
                 </div>
                 <div className="bg-brand-600 p-8 rounded-[2.5rem] text-white">
                     <p className="text-[10px] font-black uppercase text-brand-200 tracking-widest mb-2">Disponibilidad Planta</p>
                     <h4 className="text-5xl font-black tracking-tighter">97.8 <span className="text-lg text-brand-300">%</span></h4>
                     <div className="mt-4 flex items-center gap-2 text-white font-bold text-xs">
                         <Zap className="w-3 h-3" /> Alto Desempaño
                     </div>
                 </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm h-80 flex items-center justify-center text-gray-300 font-black uppercase tracking-[0.2em]">
                {/* Placeholder for High-End Charts */}
                <div className="flex flex-col items-center gap-4">
                    <BarChart className="w-16 h-16 opacity-30" />
                    Gráfico de Tendencia de Fallas vs Preventivos
                </div>
            </div>
        </div>
    );

    // --- Main Layout ---
    return (
        <div className="space-y-6 pb-20">
            {/* Super Header */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/20 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight flex items-center gap-4">
                            <Settings className="w-12 h-12 text-brand-500 animate-spin-slow" /> Mantenimiento & Planta
                        </h1>
                        <p className="text-slate-400 font-bold text-lg mt-2">Mando integral de maquinaria, ingeniería clínica y control de activos industriales.</p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-xl p-2 rounded-[2rem] flex gap-2 border border-white/10">
                        <button onClick={() => setActiveTab('maestro')} className={clsx("px-6 py-3 rounded-2xl font-black text-sm transition-all", activeTab === 'maestro' ? "bg-brand-600 text-white shadow-xl shadow-brand-600/30" : "text-slate-400 hover:text-white")}>
                            Maestro
                        </button>
                        <button onClick={() => setActiveTab('preventivo')} className={clsx("px-6 py-3 rounded-2xl font-black text-sm transition-all", activeTab === 'preventivo' ? "bg-brand-600 text-white shadow-xl shadow-brand-600/30" : "text-slate-400 hover:text-white")}>
                            Preventivo
                        </button>
                        <button onClick={() => setActiveTab('correctivo')} className={clsx("px-6 py-3 rounded-2xl font-black text-sm transition-all", activeTab === 'correctivo' ? "bg-brand-600 text-white shadow-xl shadow-brand-600/30" : "text-slate-400 hover:text-white")}>
                            Correctivo
                        </button>
                        <button onClick={() => setActiveTab('dashboard')} className={clsx("px-6 py-3 rounded-2xl font-black text-sm transition-all", activeTab === 'dashboard' ? "bg-brand-600 text-white shadow-xl shadow-brand-600/30" : "text-slate-400 hover:text-white")}>
                            Indicadores
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area Rendering */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'maestro' && <MaestroTab />}
                {activeTab === 'preventivo' && <PreventivoTab />}
                {activeTab === 'correctivo' && <CorrectivoTab />}
                {activeTab === 'dashboard' && <DashboardTab />}
            </div>

            {/* --- MODALS --- */}
            
            {/* Machine Create/Edit Modal */}
            {showMachineModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                     <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl">
                          <div className="flex justify-between items-center mb-10">
                              <h2 className="text-3xl font-black tracking-tighter text-slate-900">{editMode ? 'Editar Activo' : 'Registrar Máquina Nueva'}</h2>
                              <button onClick={() => setShowMachineModal(false)} className="p-4 bg-gray-50 text-slate-400 rounded-full hover:bg-gray-100 transition"><X /></button>
                          </div>
                          <form onSubmit={handleSaveMachine} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-6">
                                   <div>
                                       <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Código Interno</label>
                                       <input type="text" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none font-bold" value={machineForm.codigo} onChange={e => setMachineForm({...machineForm, codigo: e.target.value})} placeholder="Ej: M-123" />
                                   </div>
                                   <div>
                                       <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Nombre del Equipo</label>
                                       <input type="text" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none font-bold" value={machineForm.nombre} onChange={e => setMachineForm({...machineForm, nombre: e.target.value})} placeholder="Ej: Torno CNC Mazak" />
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Marca</label>
                                            <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 outline-none font-bold" value={machineForm.marca} onChange={e => setMachineForm({...machineForm, marca: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Modelo</label>
                                            <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 outline-none font-bold" value={machineForm.modelo} onChange={e => setMachineForm({...machineForm, modelo: e.target.value})} />
                                        </div>
                                   </div>
                               </div>
                               <div className="space-y-6">
                                   <div>
                                       <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Área de Producción</label>
                                       <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 outline-none font-bold" value={machineForm.area_produccion} onChange={e => setMachineForm({...machineForm, area_produccion: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Estado Operativo</label>
                                       <select className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 outline-none font-bold" value={machineForm.estado} onChange={e => setMachineForm({...machineForm, estado: e.target.value})}>
                                            <option value="Operativa">Operativa</option>
                                            <option value="En mantenimiento">En mantenimiento</option>
                                            <option value="Fuera de servicio">Fuera de servicio</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Responsable de Equipo</label>
                                       <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 outline-none font-bold" value={machineForm.responsable} onChange={e => setMachineForm({...machineForm, responsable: e.target.value})} />
                                   </div>
                               </div>
                               <div className="col-span-full pt-6 flex gap-4">
                                   <button type="button" onClick={() => setShowMachineModal(false)} className="flex-1 py-5 rounded-2xl font-black text-gray-400 uppercase tracking-[0.2em] text-xs">Descartar</button>
                                   <button type="submit" className="flex-1 bg-brand-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition">GUARDAR MAESTRO</button>
                               </div>
                          </form>
                     </div>
                </div>
            )}

            {/* Falla Modal */}
            {showFallaModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                     <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-2xl text-slate-900">
                          <div className="flex justify-between items-center mb-8">
                               <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3"><AlertTriangle className="text-red-600 w-8 h-8" /> Reportar Falla</h2>
                               <button onClick={() => setShowFallaModal(false)} className="p-3 bg-gray-50 text-slate-400 rounded-full hover:bg-gray-100 transition"><X /></button>
                          </div>
                          <form onSubmit={handleReportFalla} className="space-y-6">
                               <div>
                                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Equipo Afectado</label>
                                   <select required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent font-bold outline-none focus:border-red-500 focus:bg-white" value={fallaForm.maquina_id} onChange={e => setFallaForm({...fallaForm, maquina_id: e.target.value})}>
                                       <option value="">Seleccionar máquina...</option>
                                       {machines.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>)}
                                   </select>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Reportado por</label>
                                        <input type="text" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent font-bold" value={fallaForm.reportado_por} onChange={e => setFallaForm({...fallaForm, reportado_por: e.target.value})} placeholder="Nombre operario" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Prioridad</label>
                                        <select className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent font-bold" value={fallaForm.prioridad} onChange={e => setFallaForm({...fallaForm, prioridad: e.target.value as any})}>
                                            <option value="Baja">Baja</option>
                                            <option value="Media">Media</option>
                                            <option value="Alta">Alta (PARADA TOTAL)</option>
                                        </select>
                                    </div>
                               </div>
                               <div>
                                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Descripción del Síntoma</label>
                                   <textarea required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent font-bold h-32 outline-none focus:border-red-500 focus:bg-white" value={fallaForm.descripcion} onChange={e => setFallaForm({...fallaForm, descripcion: e.target.value})} placeholder="Ej: Ruido extraño en el cabezal al superar las 2000 RPM..."></textarea>
                               </div>
                               <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition flex items-center justify-center gap-3">
                                   <Upload className="w-5 h-5" /> DESPACHAR REPORTE CRÍTICO
                               </button>
                          </form>
                     </div>
                </div>
            )}

            {/* OM Close Modal */}
            {showCloseOMModal && activeOM && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                     <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl text-slate-900 text-slate-900">
                          <div className="flex justify-between items-center mb-8">
                               <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3"><CheckCircle className="text-green-600 w-8 h-8" /> Cerrar Orden #{activeOM.id}</h2>
                               <button onClick={() => setShowCloseOMModal(false)} className="p-4 bg-gray-50 text-slate-400 rounded-full hover:bg-gray-100 transition"><X /></button>
                          </div>
                          <form onSubmit={handleCloseOM} className="space-y-6">
                               <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mb-4">
                                   <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Equipo Atendido</p>
                                   <p className="font-black text-slate-800 text-lg">{activeOM.maquina?.codigo} - {activeOM.maquina?.nombre}</p>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Tiempo Muerto (Hrs)</label>
                                         <input type="number" step="0.5" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-black text-xl text-center" value={closeOMForm.tiempo_muerto_hrs} onChange={e => setCloseOMForm({...closeOMForm, tiempo_muerto_hrs: Number(e.target.value)})} />
                                     </div>
                                     <div>
                                         <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Costo Técnico ($)</label>
                                         <input type="number" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-black text-xl text-center" value={closeOMForm.costo} onChange={e => setCloseOMForm({...closeOMForm, costo: Number(e.target.value)})} />
                                     </div>
                               </div>
                               <div>
                                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Actividades Realizadas</label>
                                   <textarea required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-bold h-24" value={closeOMForm.actividades} onChange={e => setCloseOMForm({...closeOMForm, actividades: e.target.value})} placeholder="Describe el trabajo técnico ejecutado..."></textarea>
                               </div>
                               <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-brand-600 transition flex items-center justify-center gap-2">
                                   <Save className="w-5 h-5" /> CERTIFICAR MANTENIMIENTO Y CERRAR
                               </button>
                          </form>
                     </div>
                </div>
            )}

            {/* Complete Preventive Maintenance Modal */}
            {showCompleteMttoModal && activeMtto && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                     <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl text-slate-900">
                          <div className="flex justify-between items-center mb-8">
                               <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3"><CheckCircle className="text-brand-600 w-8 h-8" /> Completar Mantenimiento</h2>
                               <button onClick={() => setShowCompleteMttoModal(false)} className="p-4 bg-gray-50 text-slate-400 rounded-full hover:bg-gray-100 transition"><X /></button>
                          </div>
                          <form onSubmit={handleCompleteMtto} className="space-y-6">
                               <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100">
                                   <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Equipo</p>
                                   <p className="font-black text-slate-800 text-lg">
                                       {machines.find(m => m.id === activeMtto.maquina_id)?.codigo} - {machines.find(m => m.id === activeMtto.maquina_id)?.nombre}
                                   </p>
                                   <p className="text-xs font-bold text-brand-600 mt-1">Programado para: {new Date(activeMtto.fecha_programada).toLocaleDateString()}</p>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Fecha Realización</label>
                                        <input type="date" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-bold" value={completeMttoForm.fecha_realizada} onChange={e => setCompleteMttoForm({...completeMttoForm, fecha_realizada: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Técnico Responsable</label>
                                        <input type="text" required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-bold" value={completeMttoForm.tecnico_responsable} onChange={e => setCompleteMttoForm({...completeMttoForm, tecnico_responsable: e.target.value})} placeholder="Nombre" />
                                    </div>
                               </div>

                               <div>
                                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Evidencia Fotográfica (Max 5)</label>
                                   <div className="flex flex-wrap gap-2 mb-2">
                                       {mttoPhotos.map((p, i) => (
                                           <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border">
                                               <img src={URL.createObjectURL(p)} className="w-full h-full object-cover" />
                                               <button type="button" onClick={() => setMttoPhotos(mttoPhotos.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"><X className="w-3 h-3" /></button>
                                           </div>
                                       ))}
                                       {mttoPhotos.length < 5 && (
                                           <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-brand-500 cursor-pointer">
                                               <Plus className="w-6 h-6" />
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
                                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Observaciones Técincas</label>
                                   <textarea className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-bold h-24" value={completeMttoForm.observaciones} onChange={e => setCompleteMttoForm({...completeMttoForm, observaciones: e.target.value})} placeholder="Detalles del trabajo realizado..."></textarea>
                               </div>

                               <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Costo Insumos/Servicio ($)</label>
                                    <input type="number" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 font-black text-xl" value={completeMttoForm.costo_mantenimiento} onChange={e => setCompleteMttoForm({...completeMttoForm, costo_mantenimiento: Number(e.target.value)})} />
                               </div>

                               <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-brand-600 transition flex items-center justify-center gap-2">
                                   <Save className="w-5 h-5" /> GUARDAR EJECUCIÓN
                               </button>
                          </form>
                     </div>
                </div>
            )}
        </div>
    );
};
