
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { ClipboardList, Plus, Search, Calendar, User, Wrench, CheckCircle, Clock } from 'lucide-react';

interface Prestamo {
    id: number;
    herramienta_id: number;
    personal_id: number;
    fecha_prestamo: string;
    fecha_devolucion: string | null;
    cantidad: number;
    estado: 'ACTIVO' | 'DEVUELTO';
    observaciones: string;
    herramienta: { nombre: string; codigo: string };
    personal: { nombre: string; cedula: string };
}

interface Herramienta {
    id: number;
    nombre: string;
    codigo: string;
    cantidad_disponible: number;
}

interface Personal {
    id: number;
    nombre: string;
}

export const ToolLoans = () => {
    const [loans, setLoans] = useState<Prestamo[]>([]);
    const [tools, setTools] = useState<Herramienta[]>([]);
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ACTIVO');

    const [formData, setFormData] = useState({
        herramienta_id: '',
        personal_id: '',
        cantidad: 1,
        observaciones: ''
    });

    useEffect(() => {
        fetchLoans();
        fetchTools();
        fetchPersonal();
    }, [filterStatus]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/loans`, { params: { status: filterStatus !== 'TODOS' ? filterStatus : undefined } });
            setLoans(res.data);
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTools = async () => {
        try {
            const res = await axios.get(`${API_URL}/tools`);
            setTools(res.data.filter((t: Herramienta) => t.cantidad_disponible > 0));
        } catch (error) {
            console.error('Error fetching tools:', error);
        }
    };

    const fetchPersonal = async () => {
        try {
            const res = await axios.get(`${API_URL}/personal`);
            setPersonal(res.data);
        } catch (error) {
            console.error('Error fetching personal:', error);
        }
    };

    const handleLend = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/loans/lend`, formData);
            setShowModal(false);
            setFormData({ herramienta_id: '', personal_id: '', cantidad: 1, observaciones: '' });
            fetchLoans();
            fetchTools();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al procesar préstamo');
        }
    };

    const handleReturn = async (id: number) => {
        if (!window.confirm('¿Confirmar devolución de herramienta?')) return;
        try {
            await axios.post(`${API_URL}/loans/return/${id}`);
            fetchLoans();
            fetchTools();
        } catch (error: any) {
            console.error('Error returning tool:', error);
            alert(`Error al devolver: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">📋 Préstamos de Herramientas</h1>
                    <p className="text-gray-500 font-medium">Control de entregas y devoluciones de herramientas</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-purple-700 transition shadow-lg shadow-purple-200"
                >
                    <Plus size={20} />
                    Nuevo Préstamo
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {['ACTIVO', 'DEVUELTO', 'TODOS'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${filterStatus === status ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {status === 'ACTIVO' ? '🚨 Activos' : status === 'DEVUELTO' ? '✅ Devueltos' : '📚 Historial'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-wider">Herramienta</th>
                            <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-wider">Entregado a</th>
                            <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-wider">Fecha Préstamo</th>
                            <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
                            <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold italic">Cargando préstamos...</td></tr>
                        ) : loans.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold italic">No hay registros</td></tr>
                        ) : loans.map(loan => (
                            <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
                                            <Wrench size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800">{loan.herramienta?.nombre}</p>
                                            <p className="text-xs font-bold text-slate-400">{loan.herramienta?.codigo} • {loan.cantidad} unidad(es)</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800">{loan.personal?.nombre}</p>
                                            <p className="text-xs font-bold text-slate-400">{loan.personal?.cedula}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                                            <p className="text-[10px] font-bold text-gray-400 capitalize">
                                                {new Date(loan.fecha_prestamo).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • Cantidad: {loan.cantidad}
                                            </p>
                                    </div>
                                    {loan.fecha_devolucion && (
                                        <p className="text-xs text-green-500 font-bold mt-1">Devuelto: {new Date(loan.fecha_devolucion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    )}
                                </td>
                                <td className="p-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${loan.estado === 'ACTIVO' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {loan.estado}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    {loan.estado === 'ACTIVO' && (
                                        <button 
                                            onClick={() => handleReturn(loan.id)}
                                            className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-sm hover:bg-green-100 transition-colors flex items-center gap-2 float-right"
                                        >
                                            <CheckCircle size={16} />
                                            Recibir
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Préstamo */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-8 border-b-2 border-slate-50 bg-slate-50/50">
                            <h2 className="text-2xl font-black text-slate-800">🚀 Registrar Préstamo</h2>
                            <p className="text-slate-500 font-medium">Asigna una herramienta a un trabajador</p>
                        </div>
                        <form onSubmit={handleLend} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Herramienta Disponible</label>
                                <select 
                                    required
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                    value={formData.herramienta_id}
                                    onChange={e => setFormData({...formData, herramienta_id: e.target.value})}
                                >
                                    <option value="">Selecciona herramienta...</option>
                                    {tools.map(t => (
                                        <option key={t.id} value={t.id}>{t.nombre} ({t.cantidad_disponible} disponibles)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Trabajador</label>
                                <select 
                                    required
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                    value={formData.personal_id}
                                    onChange={e => setFormData({...formData, personal_id: e.target.value})}
                                >
                                    <option value="">Selecciona trabajador...</option>
                                    {personal.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Cantidad</label>
                                <input 
                                    required
                                    type="number" 
                                    min="1"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                    value={formData.cantidad}
                                    onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Observaciones</label>
                                <textarea 
                                    rows={2}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                    value={formData.observaciones}
                                    onChange={e => setFormData({...formData, observaciones: e.target.value})}
                                ></textarea>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition shadow-lg shadow-purple-200"
                                >
                                    Prestar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
