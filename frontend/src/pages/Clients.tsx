
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
    Users, Search, Package, ArrowRight,
    Box, User, MapPin, ExternalLink, X, Edit3, Phone, Star
} from 'lucide-react';
import clsx from 'clsx';

interface Client {
    id: number;
    nombre: string;
    contacto: string;
    direccion: string;
    calificacion: number;
    _count: { productos: number };
}

interface Product {
    id: number;
    sku_producto: string;
    nombre_producto: string;
    imagen_url: string;
    stock_actual: number;
}

export const Clients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientProducts, setSelectedClientProducts] = useState<Product[]>([]);
    const [selectedClientName, setSelectedClientName] = useState('');
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedClientForRating, setSelectedClientForRating] = useState<Client | null>(null);
    const [tempRating, setTempRating] = useState(0);
    const [editData, setEditData] = useState({
        nombre: '',
        contacto: '',
        direccion: ''
    });

    const fetchClients = async () => {
        try {
            const res = await axios.get(`${API_URL}/clients`);
            setClients(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientProducts = async (clientId: number, clientName: string) => {
        try {
            const res = await axios.get(`${API_URL}/clients/${clientId}`);
            setSelectedClientProducts(res.data.productos);
            setSelectedClientName(clientName);
            setShowProductsModal(true);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        try {
            await axios.put(`${API_URL}/clients/${selectedClient.id}`, editData);
            setShowEditModal(false);
            fetchClients();
            alert('Cliente actualizado con éxito');
        } catch (error) {
            alert('Error actualizando cliente');
        }
    };

    const openEditModal = (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();
        setSelectedClient(client);
        setEditData({
            nombre: client.nombre,
            contacto: client.contacto || '',
            direccion: client.direccion || ''
        });
        setShowEditModal(true);
    };

    const openRatingModal = (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();
        setSelectedClientForRating(client);
        setTempRating(client.calificacion || 0);
        setShowRatingModal(true);
    };

    const handleSaveRating = async () => {
        if (!selectedClientForRating) return;
        try {
            await axios.patch(`${API_URL}/clients/${selectedClientForRating.id}/rating`, {
                calificacion: tempRating
            });
            setShowRatingModal(false);
            setSelectedClientForRating(null);
            fetchClients();
            alert('Calificación actualizada correctamente');
        } catch (error) {
            alert('Error al actualizar calificación');
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filteredClients = clients.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Directorio de Clientes</h1>
                    <p className="text-gray-500">Gestión de cartera y vinculación de productos.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <Search className="text-gray-400 w-5 h-5 ml-2" />
                <input
                    type="text"
                    placeholder="Buscar cliente por nombre..."
                    className="flex-1 py-2 focus:outline-none text-lg font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <div
                        key={client.id}
                        className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group"
                        onClick={() => fetchClientProducts(client.id, client.nombre)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                                <Users className="w-7 h-7" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => openRatingModal(e, client)}
                                    className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition border border-transparent hover:border-yellow-100"
                                    title="Calificar Cliente"
                                >
                                    <Star className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => openEditModal(e, client)}
                                    className="p-2 hover:bg-brand-50 text-brand-600 rounded-lg transition border border-transparent hover:border-brand-100"
                                    title="Editar Cliente"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <div className="bg-gray-50 px-3 py-1 rounded-full text-xs font-bold text-gray-500 border border-gray-100 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    {client._count.productos} PRODUCTOS
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition truncate">
                            {client.nombre}
                        </h3>

                        <div className="mt-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= client.calificacion ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                            ))}
                            <span className="text-xs font-bold text-gray-400 ml-1">({client.calificacion}/5)</span>
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{client.direccion || 'Dirección no registrada'}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-brand-600 font-bold text-sm">
                            Ver catálogo asociado
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Client Products Modal */}
            {showProductsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900">{selectedClientName}</h2>
                                <p className="text-brand-600 font-bold">Catálogo de productos vinculados</p>
                            </div>
                            <button
                                onClick={() => setShowProductsModal(false)}
                                className="p-3 hover:bg-white rounded-full bg-gray-100 transition"
                            ><X /></button>
                        </div>

                        <div className="overflow-y-auto p-8">
                            {selectedClientProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedClientProducts.map((p) => (
                                        <div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col gap-4 shadow-sm hover:border-brand-200 transition">
                                            <div className="aspect-video bg-gray-50 rounded-2xl overflow-hidden relative">
                                                {p.imagen_url ? (
                                                    <img src={p.imagen_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Box className="text-gray-200 w-10 h-10" /></div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-brand-600 text-white px-2 py-1 rounded-lg text-[10px] font-black">
                                                    STOCK: {p.stock_actual}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 line-clamp-1">{p.nombre_producto}</h4>
                                                <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">{p.sku_producto}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <Box className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium text-lg">Este cliente aún no tiene productos asociados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {showEditModal && selectedClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-900">Editar Cliente</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
                        </div>

                        <form onSubmit={handleEditClient} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nombre Comercial</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                    value={editData.nombre}
                                    onChange={e => setEditData({ ...editData, nombre: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Contacto / Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.contacto}
                                        onChange={e => setEditData({ ...editData, contacto: e.target.value })}
                                        placeholder="Ej: +57 321..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Dirección Fiscal</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.direccion}
                                        onChange={e => setEditData({ ...editData, direccion: e.target.value })}
                                        placeholder="Dirección completa"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black transition hover:bg-gray-200"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-brand-100 hover:bg-brand-700 transition"
                                >
                                    GUARDAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RATING MODAL */}
            {showRatingModal && selectedClientForRating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-sm w-full p-8">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Calificar Cliente</h3>
                        <p className="text-gray-500 font-bold mb-6">{selectedClientForRating.nombre}</p>

                        {/* Star Rating Input */}
                        <div className="flex justify-center gap-3 mb-8">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setTempRating(star)}
                                    className="transition-all hover:scale-125"
                                >
                                    <Star
                                        className={`w-12 h-12 cursor-pointer transition-all ${star <= tempRating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300 hover:text-yellow-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        <div className="text-center mb-8">
                            <p className="text-4xl font-black text-gray-900">{tempRating}</p>
                            <p className="text-gray-500 font-bold">de 5 estrellas</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRatingModal(false);
                                    setSelectedClientForRating(null);
                                }}
                                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-black transition hover:bg-gray-200"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveRating}
                                className="flex-1 bg-yellow-500 text-white py-3 rounded-2xl font-black transition hover:bg-yellow-600 shadow-lg shadow-yellow-100"
                            >
                                GUARDAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
