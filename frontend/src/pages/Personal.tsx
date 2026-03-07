
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users, Plus, Search, User, CreditCard,
    Briefcase, DollarSign, Award, Activity,
    Clock, Trash2, Edit2, X, Check, Calendar,
    ShieldCheck, Filter, FileText, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../api';

interface Personal {
    id: number;
    nombre: string;
    cedula: string;
    cargo: string;
    kpi_puntualidad: number | null;
    salario: number | null;
    calificacion: string | null;
    eficiencia: number | null;
    productividad: number | null;
    registrosTiempo?: any[];
    dotaciones?: any[];
    tareas?: any[];
}

export const PersonalPage = () => {
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showTimeLogModal, setShowTimeLogModal] = useState(false);
    const [showDotacionModal, setShowDotacionModal] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Personal | null>(null);
    const [detailedPerson, setDetailedPerson] = useState<Personal | null>(null);

    // Filter
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    const [formData, setFormData] = useState({
        nombre: '',
        cedula: '',
        cargo: '',
        salario: '',
        calificacion: '',
        kpi_puntualidad: ''
    });

    const [timeLogForm, setTimeLogForm] = useState({
        tipo: 'Hora Extra',
        fecha: new Date().toISOString().split('T')[0],
        horas: '',
        motivo: ''
    });

    const [dotacionForm, setDotacionForm] = useState({
        item: 'Guantes de Vaqueta',
        cantidad: '1',
        comentarios: ''
    });

    const fetchPersonal = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/personal`);
            setPersonal(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (id: number) => {
        try {
            const res = await axios.get(`${API_URL}/personal/${id}`);
            setDetailedPerson(res.data);
            setShowDetailsModal(true);
        } catch (error) {
            alert('Error cargando detalles');
        }
    };

    useEffect(() => {
        fetchPersonal();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode && selectedPerson) {
                await axios.put(`${API_URL}/personal/${selectedPerson.id}`, formData);
            } else {
                await axios.post(`${API_URL}/personal`, formData);
            }
            setShowModal(false);
            fetchPersonal();
        } catch (error) {
            alert('Error guardando personal');
        }
    };

    const handleAddTimeLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPerson) return;
        try {
            await axios.post(`${API_URL}/personal/${selectedPerson.id}/time-log`, timeLogForm);
            setShowTimeLogModal(false);
            if (showDetailsModal) fetchDetails(selectedPerson.id);
        } catch (error) {
            alert('Error registrando tiempo');
        }
    };

    const handleAddDotacion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPerson) return;
        try {
            await axios.post(`${API_URL}/personal/${selectedPerson.id}/dotacion`, dotacionForm);
            setShowDotacionModal(false);
            if (showDetailsModal) fetchDetails(selectedPerson.id);
        } catch (error) {
            alert('Error registrando dotación');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
        try {
            await axios.delete(`${API_URL}/personal/${id}`);
            fetchPersonal();
        } catch (error) {
            alert('Error eliminando personal');
        }
    };

    const openEditModal = (person: Personal) => {
        setSelectedPerson(person);
        setFormData({
            nombre: person.nombre,
            cedula: person.cedula,
            cargo: person.cargo,
            salario: person.salario?.toString() || '',
            calificacion: person.calificacion || '',
            kpi_puntualidad: person.kpi_puntualidad?.toString() || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const filteredPersonal = personal.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTimeLogs = detailedPerson?.registrosTiempo?.filter(log => {
        if (!dateFilter.start && !dateFilter.end) return true;
        const logDate = new Date(log.fecha).getTime();
        const start = dateFilter.start ? new Date(dateFilter.start).getTime() : 0;
        const end = dateFilter.end ? new Date(dateFilter.end).getTime() + 86400000 : Infinity;
        return logDate >= start && logDate <= end;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
                        <Users className="w-10 h-10 text-brand-600" /> Control de Personal
                    </h1>
                    <p className="text-gray-500 font-bold mt-1">Gestión administrativa, EPP y registro de tiempos.</p>
                </div>
                <button
                    onClick={() => { setEditMode(false); setFormData({ nombre: '', cedula: '', cargo: '', salario: '', calificacion: '', kpi_puntualidad: '' }); setShowModal(true); }}
                    className="bg-brand-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-brand-700 transition shadow-xl shadow-brand-100 font-black text-lg"
                >
                    <Plus className="w-6 h-6" /> Vincular Personal
                </button>
            </div>

            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o cargo..."
                        className="w-full pl-16 pr-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="bg-white h-72 rounded-[2.5rem] animate-pulse border"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPersonal.map(person => (
                        <div key={person.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col justify-between h-full">
                            {/* Hover Actions */}
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => openEditModal(person)} className="p-3 bg-white shadow-lg text-gray-600 rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition">
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(person.id)} className="p-3 bg-white shadow-lg text-gray-600 rounded-2xl hover:bg-red-50 hover:text-red-600 transition">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 leading-tight text-xl truncate">{person.nombre}</h3>
                                        <p className="text-xs font-black text-brand-600 uppercase tracking-widest mt-1 truncate">{person.cargo}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4" /> ID Cédula</span>
                                        <span className="font-mono font-black text-gray-700">{person.cedula}</span>
                                    </div>

                                    <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Eficiencia</span>
                                            <span className="text-2xl font-black text-gray-800">{person.eficiencia || '0'}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Puntualidad</span>
                                            <span className="text-2xl font-black text-gray-800">{person.kpi_puntualidad || '0'}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={() => fetchDetails(person.id)}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                                >
                                    <Eye className="w-4 h-4" /> Ver Detalles
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setSelectedPerson(person); setShowTimeLogModal(true); }}
                                        className="bg-orange-50 text-orange-700 py-4 rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-orange-100 transition border border-orange-100"
                                    >
                                        Extras/Permisos
                                    </button>
                                    <button
                                        onClick={() => { setSelectedPerson(person); setShowDotacionModal(true); }}
                                        className="bg-blue-50 text-blue-700 py-4 rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-blue-100 transition border border-blue-100"
                                    >
                                        Registrar EPP
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: DETAILS */}
            {showDetailsModal && detailedPerson && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[150] flex items-center justify-center p-0 lg:p-12">
                    <div className="bg-white rounded-none lg:rounded-[3rem] w-full max-w-7xl h-full flex flex-col shadow-2xl overflow-hidden">
                        {/* Header Details */}
                        <div className="bg-slate-950 p-10 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-8">
                                <div className="w-24 h-24 bg-brand-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-500/20">
                                    <User className="w-12 h-12" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <h2 className="text-4xl font-black tracking-tighter">{detailedPerson.nombre}</h2>
                                        <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/20">{detailedPerson.cargo}</span>
                                    </div>
                                    <div className="flex gap-10 text-slate-400 font-bold">
                                        <p className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> {detailedPerson.cedula}</p>
                                        <p className="flex items-center gap-2 text-green-400 font-black"><DollarSign className="w-4 h-4" /> Salario: ${detailedPerson.salario?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-5 bg-white/5 hover:bg-white/10 rounded-full transition"><X className="w-8 h-8" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left: Overtime & Permissions */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                                        <div className="p-8 border-b flex justify-between items-end bg-gray-50/50">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900">Registro de Horas Extras y Permisos</h3>
                                                <p className="text-sm text-gray-500 font-bold mt-1">Historial acumulado del trabajador.</p>
                                            </div>
                                            <div className="flex gap-4 items-end">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Desde</label>
                                                    <input type="date" className="p-2 border rounded-xl text-xs font-bold" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Hasta</label>
                                                    <input type="date" className="p-2 border rounded-xl text-xs font-bold" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
                                                </div>
                                                <button
                                                    onClick={() => setDateFilter({ start: '', end: '' })}
                                                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                                                >
                                                    <Filter className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        <th className="p-4">Fecha</th>
                                                        <th className="p-4">Tipo</th>
                                                        <th className="p-4 text-center">Horas</th>
                                                        <th className="p-4">Motivo / Descripción</th>
                                                        <th className="p-4">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                    {filteredTimeLogs?.map(log => (
                                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4">{new Date(log.fecha).toLocaleDateString()}</td>
                                                            <td className="p-4">
                                                                <span className={clsx(
                                                                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase border",
                                                                    log.tipo === 'Hora Extra' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-purple-50 text-purple-600 border-purple-100"
                                                                )}>{log.tipo}</span>
                                                            </td>
                                                            <td className="p-4 text-center text-lg">{log.horas} <span className="text-[10px] text-gray-300">hrs</span></td>
                                                            <td className="p-4 text-gray-500 italic">{log.motivo || '--'}</td>
                                                            <td className="p-4">
                                                                <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase">
                                                                    <Check className="w-3 h-3" /> APROBADO
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredTimeLogs?.length === 0 && (
                                                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-black">-- NO HAY REGISTROS EN ESTE PERIODO --</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: PPE & Stats */}
                                <div className="space-y-8">
                                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <ShieldCheck className="w-6 h-6 text-blue-600" /> Entrega de Dotación (EPP)
                                        </h3>
                                        <div className="space-y-4">
                                            {detailedPerson.dotaciones?.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="font-black text-slate-700">{item.item}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(item.fecha_entrega).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="bg-blue-600 text-white px-3 py-1 rounded-xl font-black text-xs">x{item.cantidad}</span>
                                                </div>
                                            ))}
                                            {detailedPerson.dotaciones?.length === 0 && (
                                                <p className="text-center py-10 text-gray-300 font-black uppercase text-xs">Sin dotaciones registradas</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-brand-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-brand-100">
                                        <h3 className="font-black text-sm uppercase tracking-widest mb-6 border-b border-brand-500 pb-4">Performance Resumen</h3>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-brand-200 uppercase">Productividad</span>
                                                <span className="text-3xl font-black">{detailedPerson.productividad || '0'}%</span>
                                            </div>
                                            <div className="w-full bg-brand-700 h-2.5 rounded-full overflow-hidden">
                                                <div className="bg-white h-full" style={{ width: `${detailedPerson.productividad || 0}%` }}></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mt-8">
                                                <div className="bg-brand-700/50 p-4 rounded-2xl border border-brand-500">
                                                    <span className="text-[10px] font-black uppercase block opacity-60">Tareas OK</span>
                                                    <span className="text-xl font-black">{detailedPerson.tareas?.length || 0}</span>
                                                </div>
                                                <div className="bg-brand-700/50 p-4 rounded-2xl border border-brand-500">
                                                    <span className="text-[10px] font-black uppercase block opacity-60">Incidencias</span>
                                                    <span className="text-xl font-black">0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: TIME LOG (Extras/Permisos) */}
            {showTimeLogModal && selectedPerson && (
                <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] max-w-md w-full p-10">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                            <Clock className="w-8 h-8 text-orange-500" /> Registro Novedad Tiempo
                        </h2>
                        <form onSubmit={handleAddTimeLog} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Tipo de Registro</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none font-bold"
                                    value={timeLogForm.tipo}
                                    onChange={e => setTimeLogForm({ ...timeLogForm, tipo: e.target.value })}
                                >
                                    <option value="Hora Extra">Hora Extra (+)</option>
                                    <option value="Permiso">Permiso / Ausencia (-)</option>
                                    <option value="Incapacidad">Incapacidad</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Fecha</label>
                                    <input type="date" required className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-bold" value={timeLogForm.fecha} onChange={e => setTimeLogForm({ ...timeLogForm, fecha: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Horas</label>
                                    <input type="number" step="0.5" required className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-black text-xl text-center" value={timeLogForm.horas} onChange={e => setTimeLogForm({ ...timeLogForm, horas: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Observaciones</label>
                                <textarea className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-bold h-24" value={timeLogForm.motivo} onChange={e => setTimeLogForm({ ...timeLogForm, motivo: e.target.value })} placeholder="Ej: Trabajo en domingo OT-123"></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowTimeLogModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase tracking-widest">Cerrar</button>
                                <button type="submit" className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-orange-100">REGISTRAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DOTACION (EPP) */}
            {showDotacionModal && selectedPerson && (
                <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] max-w-md w-full p-10">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-blue-500" /> Entrega de EPP / Dotación
                        </h2>
                        <form onSubmit={handleAddDotacion} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Elemento de Protección</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-bold"
                                    value={dotacionForm.item}
                                    onChange={e => setDotacionForm({ ...dotacionForm, item: e.target.value })}
                                >
                                    <option value="Guantes de Vaqueta">Guantes de Vaqueta</option>
                                    <option value="Guantes de Nitrilo">Guantes de Nitrilo</option>
                                    <option value="Botas de Seguridad">Botas de Seguridad</option>
                                    <option value="Overol / Dotación">Overol / Dotación</option>
                                    <option value="Protección Auditiva">Protección Auditiva</option>
                                    <option value="Gafas Claras">Gafas Claras</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Cantidad</label>
                                <input type="number" required className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-black text-xl text-center" value={dotacionForm.cantidad} onChange={e => setDotacionForm({ ...dotacionForm, cantidad: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Comentarios</label>
                                <textarea className="w-full p-4 rounded-2xl bg-gray-50 border-2 font-bold h-24" value={dotacionForm.comentarios} onChange={e => setDotacionForm({ ...dotacionForm, comentarios: e.target.value })} placeholder="Ej: Entrega por inicio de labor"></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowDotacionModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase tracking-widest">Cerrar</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100">CONFIRMAR ENTREGA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT PERSONAL MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] max-w-2xl w-full p-10">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black tracking-tighter">{editMode ? 'Editar Perfil Operativo' : 'Vincular Nuevo Personal'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition"><X /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Nombre Completo</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Número de Cédula</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.cedula}
                                        onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Cargo / Función</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.cargo}
                                        onChange={e => setFormData({ ...formData, cargo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Salario Mensual</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.salario}
                                        onChange={e => setFormData({ ...formData, salario: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Calificación Actual</label>
                                    <select
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.calificacion}
                                        onChange={e => setFormData({ ...formData, calificacion: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Colaborador Clave (Supera)">Colaborador Clave (Supera)</option>
                                        <option value="Cumple Sólidamente (Estándar)">Cumple Sólidamente (Estándar)</option>
                                        <option value="En Desarrollo (Bajo)">En Desarrollo (Bajo)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] font-black text-gray-400 uppercase tracking-widest">CANCELAR</button>
                                <button type="submit" className="flex-1 bg-brand-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition">GUARDAR PERFIL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Eye icon since I removed it from the big list
const Eye = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
