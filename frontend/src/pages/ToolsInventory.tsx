
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { Package, Plus, Search, Filter, Edit, Trash2, Wrench, ShoppingCart, Info, MapPin } from 'lucide-react';

interface Herramienta {
    id: number;
    codigo: string;
    nombre: string;
    tipo: 'HERRAMIENTA' | 'CONSUMIBLE';
    cantidad_total: number;
    cantidad_disponible: number;
    estado: string;
    ubicacion: string;
    observaciones: string;
}

export const ToolsInventory = () => {
    const [tools, setTools] = useState<Herramienta[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState('TODOS');
    const [showModal, setShowModal] = useState(false);
    const [editingTool, setEditingTool] = useState<Herramienta | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        codigo: '',
        tipo: 'HERRAMIENTA',
        cantidad_total: 0,
        ubicacion: '',
        observaciones: ''
    });

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/tools`);
            setTools(res.data);
        } catch (error) {
            console.error('Error fetching tools:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTool) {
                await axios.put(`${API_URL}/tools/${editingTool.id}`, formData);
            } else {
                await axios.post(`${API_URL}/tools`, formData);
            }
            setShowModal(false);
            setEditingTool(null);
            setFormData({ nombre: '', codigo: '', tipo: 'HERRAMIENTA', cantidad_total: 0, ubicacion: '', observaciones: '' });
            fetchTools();
        } catch (error) {
            console.error('Error saving tool:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar este elemento?')) return;
        try {
            await axios.delete(`${API_URL}/tools/${id}`);
            fetchTools();
        } catch (error) {
            console.error('Error deleting tool:', error);
        }
    };

    const filteredTools = tools.filter(t => 
        (t.nombre.toLowerCase().includes(search.toLowerCase()) || (t.codigo && t.codigo.toLowerCase().includes(search.toLowerCase()))) &&
        (filterTipo === 'TODOS' || t.tipo === filterTipo)
    );

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'DISPONIBLE': return 'bg-green-100 text-green-700';
            case 'EN USO': return 'bg-red-100 text-red-700';
            case 'PARCIALMENTE EN USO': return 'bg-orange-100 text-orange-700';
            case 'MANTENIMIENTO': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">🛠️ Inventario de Herramientas</h1>
                    <p className="text-gray-500 font-medium">Gestiona herramientas y consumibles de la planta</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTool(null);
                        setFormData({ nombre: '', codigo: '', tipo: 'HERRAMIENTA', cantidad_total: 0, ubicacion: '', observaciones: '' });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-700 transition shadow-lg shadow-brand-200"
                >
                    <Plus size={20} />
                    Nuevo Elemento
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-brand-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl">
                    <Filter size={18} className="text-slate-500" />
                    <select 
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                        className="bg-transparent border-none font-bold text-slate-700 outline-none"
                    >
                        <option value="TODOS">Todos los tipos</option>
                        <option value="HERRAMIENTA">Herramientas</option>
                        <option value="CONSUMIBLE">Consumibles</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">Cargando inventario...</div>
                ) : filteredTools.length === 0 ? (
                    <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">No se encontraron elementos</div>
                ) : filteredTools.map(tool => (
                    <div key={tool.id} className="bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-brand-200 hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-3 ${tool.tipo === 'HERRAMIENTA' ? 'text-brand-500' : 'text-purple-500'} opacity-20 group-hover:opacity-40 transition-opacity`}>
                            {tool.tipo === 'HERRAMIENTA' ? <Wrench size={60} /> : <Package size={60} />}
                        </div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(tool.estado)}`}>
                                {tool.estado}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                    setEditingTool(tool);
                                    setFormData({
                                        nombre: tool.nombre,
                                        codigo: tool.codigo || '',
                                        tipo: tool.tipo,
                                        cantidad_total: tool.cantidad_total,
                                        ubicacion: tool.ubicacion || '',
                                        observaciones: tool.observaciones || ''
                                    });
                                    setShowModal(true);
                                }} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(tool.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{tool.codigo || 'S/C'}</p>
                            <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-brand-600 transition-colors">{tool.nombre}</h3>
                        </div>

                        <div className="flex items-center justify-between border-t-2 border-slate-50 pt-4 mt-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Disponible</p>
                                <p className="text-2xl font-black text-slate-800">{tool.cantidad_disponible} <span className="text-sm font-bold text-slate-400">/ {tool.cantidad_total}</span></p>
                            </div>
                            {tool.ubicacion && (
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-slate-400">
                                        <MapPin size={12} />
                                        <p className="text-[10px] font-black uppercase">Ubicación</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">{tool.ubicacion}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-8 border-b-2 border-slate-50 bg-slate-50/50">
                            <h2 className="text-2xl font-black text-slate-800">{editingTool ? '📝 Editar Elemento' : '✨ Nuevo Elemento'}</h2>
                            <p className="text-slate-500 font-medium">Completa los campos del inventario</p>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nombre del Elemento</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.nombre}
                                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Código</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.codigo}
                                        onChange={e => setFormData({...formData, codigo: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tipo</label>
                                    <select 
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.tipo}
                                        onChange={e => setFormData({...formData, tipo: e.target.value as any})}
                                    >
                                        <option value="HERRAMIENTA">Herramienta</option>
                                        <option value="CONSUMIBLE">Consumible</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Cantidad Total</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.cantidad_total}
                                        onChange={e => setFormData({...formData, cantidad_total: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Ubicación</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.ubicacion}
                                        onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Observaciones</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                                        value={formData.observaciones}
                                        onChange={e => setFormData({...formData, observaciones: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black hover:bg-brand-700 transition shadow-lg shadow-brand-200"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
