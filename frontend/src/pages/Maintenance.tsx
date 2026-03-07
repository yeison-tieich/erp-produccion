
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Settings, Plus, Search, Activity,
    Calendar, AlertTriangle, CheckCircle, Info,
    X, Edit2, Trash2, Camera, Zap, Clock
} from 'lucide-react';
import clsx from 'clsx';

interface Maquina {
    id: number;
    codigo: string;
    descripcion: string;
    adquirida_en: string | null;
    estado: string;
    observaciones: string | null;
    motor_hp: string | null;
    consumo_mes: string | null;
    capacidad_trabajo: string | null;
    horas_maquina_mes: string | null;
    foto_url: string | null;
}

export const MaintenancePage = () => {
    const [machines, setMachines] = useState<Maquina[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Maquina | null>(null);

    const [formData, setFormData] = useState({
        codigo: '',
        descripcion: '',
        adquirida_en: '',
        estado: 'ACTIVA',
        motor_hp: '',
        horas_maquina_mes: '',
        observaciones: ''
    });

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/machines');
            setMachines(res.data);
        } catch (error) {
            console.error('Error fetching machines:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode && selectedMachine) {
                await axios.put(`http://localhost:3000/api/machines/${selectedMachine.id}`, formData);
            } else {
                await axios.post('http://localhost:3000/api/machines', formData);
            }
            setShowModal(false);
            fetchMachines();
        } catch (error) {
            alert('Error guardando máquina');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
        try {
            await axios.delete(`http://localhost:3000/api/machines/${id}`);
            fetchMachines();
        } catch (error) {
            alert('Error eliminando máquina');
        }
    };

    const openEditModal = (machine: Maquina) => {
        setSelectedMachine(machine);
        setFormData({
            codigo: machine.codigo,
            descripcion: machine.descripcion,
            adquirida_en: machine.adquirida_en || '',
            estado: machine.estado,
            motor_hp: machine.motor_hp || '',
            horas_maquina_mes: machine.horas_maquina_mes || '',
            observaciones: machine.observaciones || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const filteredMachines = machines.filter(m =>
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header Area */}
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
                        <Settings className="w-10 h-10 text-brand-600 animate-spin-slow" /> Mantenimiento y Maquinaria
                    </h1>
                    <p className="text-gray-500 font-bold mt-1">Control de activos, estado de máquinas y cronograma técnico.</p>
                </div>
                <button
                    onClick={() => { setEditMode(false); setFormData({ codigo: '', descripcion: '', adquirida_en: '', estado: 'ACTIVA', motor_hp: '', horas_maquina_mes: '', observaciones: '' }); setShowModal(true); }}
                    className="bg-brand-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-brand-700 transition shadow-xl shadow-brand-100 font-black text-lg"
                >
                    <Plus className="w-6 h-6" /> Añadir Máquina
                </button>
            </div>

            {/* Search Box */}
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
            </div>

            {/* Grid display */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white h-72 rounded-[2.5rem] animate-pulse border"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white-100">
                    {filteredMachines.map(machine => (
                        <div key={machine.id} className="bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
                            {/* Card Header/Photo */}
                            <div className="h-48 bg-slate-900 relative overflow-hidden">
                                {machine.foto_url ? (
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(http://localhost:3000/images/${machine.foto_url})` }}></div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                        <Settings className="w-24 h-24" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button onClick={() => openEditModal(machine)} className="p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white hover:text-brand-600 transition border border-white/20">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(machine.id)} className="p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-red-500 hover:text-white transition border border-white/20">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="bg-brand-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">ID: {machine.codigo}</span>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-8 flex-1 flex flex-col">
                                <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight min-h-[3rem] line-clamp-2">{machine.descripcion}</h3>

                                <div className="space-y-4 mb-6 mt-4">
                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> Estado actual
                                        </span>
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                            machine.estado === 'ACTIVA' || machine.estado === 'ACTIVO' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {machine.estado}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Motor (HP)</span>
                                            <span className="text-lg font-black text-slate-800 flex items-center justify-center gap-1 group-hover:scale-110 transition">
                                                <Zap className="w-3 h-3 text-brand-500" /> {machine.motor_hp || '--'}
                                            </span>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Hrs/Mes</span>
                                            <span className="text-lg font-black text-slate-800 flex items-center justify-center gap-1">
                                                <Clock className="w-3 h-3 text-brand-500" /> {machine.horas_maquina_mes || '--'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t flex items-center justify-between text-xs text-gray-400 font-bold">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Adq: {machine.adquirida_en || '??'}</span>
                                    <button className="text-brand-600 hover:text-brand-700 font-black uppercase tracking-widest flex items-center gap-1">
                                        Ver Bitácora <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {editMode ? 'Editar Información' : 'Registrar Nueva Máquina'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition"><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Código Máquina</label>
                                    <input
                                        type="text" required placeholder="Ej: M99"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.codigo}
                                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Estado</label>
                                    <select
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                        value={formData.estado}
                                        onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                    >
                                        <option value="ACTIVA">ACTIVA / ACTIVO</option>
                                        <option value="INACTIVA">INACTIVA</option>
                                        <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                        <option value="VENDIDO">VENDIDO</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Descripción</label>
                                    <input
                                        type="text" required placeholder="Nombre de la máquina..."
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Año Adquisición</label>
                                    <input
                                        type="text" placeholder="Ej: 2024"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                        value={formData.adquirida_en}
                                        onChange={e => setFormData({ ...formData, adquirida_en: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Motor (HP)</label>
                                        <input
                                            type="text" placeholder="7.5"
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.motor_hp}
                                            onChange={e => setFormData({ ...formData, motor_hp: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Horas/Mes</label>
                                        <input
                                            type="text" placeholder="192"
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.horas_maquina_mes}
                                            onChange={e => setFormData({ ...formData, horas_maquina_mes: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Observaciones</label>
                                    <textarea
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold h-24"
                                        value={formData.observaciones}
                                        onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] font-black text-gray-400 uppercase tracking-widest">CANCELAR</button>
                                <button type="submit" className="flex-1 bg-brand-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition">GUARDAR ACTIVO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChevronRight = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
