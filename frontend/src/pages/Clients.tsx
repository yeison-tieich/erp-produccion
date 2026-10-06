
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../api';
import { GlassCard } from '../components/ui/GlassCard';
import {
    Users, Search, Package, ArrowRight,
    Box, MapPin, X, Edit3, Phone, Star, Trash2, CheckSquare, Square, Link2, Unlink,
    Plus, FileText, Loader2, CheckCircle, ExternalLink
} from 'lucide-react';

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
    cliente_id?: number | null;
}

interface ClientOrder {
    id: number;
    numero_ot: string;
    estado_ot: string;
    fecha_creacion: string;
    fecha_entrega_req?: string | null;
    precio_venta?: number | string | null;
    costo_total_real?: number | string | null;
}

export const Clients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [catalogMode, setCatalogMode] = useState<'linked' | 'select'>('linked');
    const [isSavingProducts, setIsSavingProducts] = useState(false);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
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

    const fetchAllProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setAllProducts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const openProductsModal = async (client: Client) => {
        setSelectedClient(client);
        setSelectedProductIds([]);
        setProductSearchTerm('');
        setCatalogMode('linked');
        await fetchAllProducts();
        setShowProductsModal(true);
    };

    const openOrdersModal = async (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();
        setSelectedClient(client);
        setClientOrders([]);
        setOrdersError(null);
        setOrdersLoading(true);
        setShowOrdersModal(true);

        try {
            const response = await axios.get(`${API_URL}/orders`, { params: { clientId: client.id } });
            setClientOrders(response.data);
        } catch (error: any) {
            setOrdersError(error.response?.data?.error || 'No fue posible cargar las Ã³rdenes del cliente.');
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleDeleteClient = async (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();
        if (!window.confirm(`¿Está seguro de eliminar al cliente "${client.nombre}"?`)) return;

        try {
            const res = await axios.delete(`${API_URL}/clients/${client.id}`);
            alert(res.data.message);
            fetchClients();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al eliminar cliente');
        }
    };

    const handleBindProducts = async () => {
        if (!selectedClient || selectedProductIds.length === 0) return;
        setIsSavingProducts(true);
        try {
            await axios.post(`${API_URL}/clients/${selectedClient.id}/bind-products`, {
                productIds: selectedProductIds
            });
            setSelectedProductIds([]);
            setCatalogMode('linked');
            await Promise.all([fetchAllProducts(), fetchClients()]);
        } catch (error: any) {
            alert(error.response?.data?.error || 'No fue posible vincular los productos.');
        } finally {
            setIsSavingProducts(false);
        }
    };

    const handleUnbindProducts = async () => {
        if (!selectedClient || selectedProductIds.length === 0) return;
        try {
            await axios.post(`${API_URL}/clients/${selectedClient.id}/unbind-products`, {
                productIds: selectedProductIds
            });
            setSelectedProductIds([]);
            await Promise.all([fetchAllProducts(), fetchClients()]);
        } catch (error: any) {
            alert(error.response?.data?.error || 'No fue posible desvincular los productos.');
        }
    };

    const handleUnbindProduct = async (productId: number) => {
        if (!selectedClient) return;
        try {
            await axios.post(`${API_URL}/clients/${selectedClient.id}/unbind-products`, { productIds: [productId] });
            await Promise.all([fetchAllProducts(), fetchClients()]);
        } catch (error: any) {
            alert(error.response?.data?.error || 'No fue posible desvincular el producto.');
        }
    };

    const toggleSelectProduct = (id: number) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = (filteredProds: Product[]) => {
        const filteredIds = filteredProds.map(p => p.id);
        const allSelected = filteredIds.every(id => selectedProductIds.includes(id));
        if (allSelected) {
            setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredIds])));
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

    const linkedProducts = allProducts.filter(p => p.cliente_id === selectedClient?.id);
    const availableProducts = allProducts.filter(p => !p.cliente_id);
    const filteredModalProducts = (catalogMode === 'linked' ? linkedProducts : availableProducts).filter(p =>
        p.nombre_producto.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        p.sku_producto.toLowerCase().includes(productSearchTerm.toLowerCase())
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
                    <GlassCard
                        key={client.id}
                        className="!rounded-[2rem] !p-6 cursor-pointer group relative"
                        onClick={() => openProductsModal(client)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                                <Users className="w-7 h-7" />
                            </div>
                            <div className="flex gap-1.5 items-center">
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
                                <button
                                    onClick={(e) => openOrdersModal(e, client)}
                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-transparent hover:border-blue-100"
                                    title="Ver Ã“rdenes"
                                    aria-label={`Ver Ã³rdenes de ${client.nombre}`}
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClient(e, client)}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition border border-transparent hover:border-red-100"
                                    title="Eliminar Cliente"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="bg-gray-50 px-3 py-1 rounded-full text-xs font-bold text-gray-500 border border-gray-100 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    {client._count.productos} PRODS
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
                            Ver / Vincular Catálogo
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Client Products & Binding Modal */}
            {showProductsModal && selectedClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">{selectedClient.nombre}</h2>
                                <p className="text-brand-600 font-bold text-sm">Catálogo y Gestión de Productos Vinculados</p>
                            </div>
                            <button
                                onClick={() => setShowProductsModal(false)}
                                className="p-3 hover:bg-white rounded-full bg-gray-100 transition"
                            ><X /></button>
                        </div>

                        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 min-w-0 flex-1">
                                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o SKU..."
                                    className="w-full min-w-0 focus:outline-none text-sm font-medium"
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                />
                            </div>
                            {catalogMode === 'linked' ? (
                                <button onClick={() => { setCatalogMode('select'); setSelectedProductIds([]); }} className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-brand-700 transition shadow-sm">
                                    <Plus className="w-4 h-4" /> Vincular mas productos
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => toggleSelectAll(filteredModalProducts)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 hover:bg-gray-100">
                                        <CheckSquare className="w-4 h-4 text-brand-600" /> Seleccionar ({selectedProductIds.length})
                                    </button>
                                    <button onClick={handleBindProducts} disabled={selectedProductIds.length === 0 || isSavingProducts} className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-brand-700 disabled:opacity-50 transition shadow-sm">
                                        {isSavingProducts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Guardar seleccinados
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
                            {filteredModalProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredModalProducts.map((p) => {
                                        const isSelected = selectedProductIds.includes(p.id);
                                        return (
                                            <div key={p.id} onClick={() => catalogMode === 'select' && toggleSelectProduct(p.id)} className={`border rounded-2xl p-4 flex gap-3 min-w-0 transition ${catalogMode === 'select' ? 'cursor-pointer' : ''} ${isSelected ? 'border-brand-500 bg-brand-50/20 shadow-md' : 'border-gray-200 bg-white'}`}>
                                                {catalogMode === 'select' && <div className="mt-1 shrink-0">{isSelected ? <CheckSquare className="w-5 h-5 text-brand-600" /> : <Square className="w-5 h-5 text-gray-300" />}</div>}
                                                <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0">{p.imagen_url ? <img src={p.imagen_url.startsWith('http') ? p.imagen_url : `${BASE_URL}${p.imagen_url}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Box className="text-gray-300 w-6 h-6" /></div>}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 text-sm truncate">{p.nombre_producto}</h4>
                                                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest truncate">{p.sku_producto}</p>
                                                    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[15px] font-bold text-gray-500">Stock: {p.stock_actual}</span>{catalogMode === 'linked' && <button onClick={(e) => { e.stopPropagation(); handleUnbindProduct(p.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Desvincular producto"><Unlink className="w-4 h-4" /></button>}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4">
                                    {catalogMode === 'linked' ? <CheckCircle className="w-12 h-12 text-brand-300 mx-auto mb-3" /> : <Box className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
                                    <p className="text-gray-600 font-bold">{catalogMode === 'linked' ? 'Este cliente todavÃ­a no tiene productos vinculados.' : 'No hay productos disponibles para vincular.'}</p>
                                    {catalogMode === 'linked' && <button onClick={() => setCatalogMode('select')} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-black inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Vincular mÃ¡s productos</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {showEditModal && selectedClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Editar Cliente</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
                        </div>

                        <form onSubmit={handleEditClient} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Nombre Comercial</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-sm"
                                    value={editData.nombre}
                                    onChange={e => setEditData({ ...editData, nombre: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Contacto / Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                        value={editData.contacto}
                                        onChange={e => setEditData({ ...editData, contacto: e.target.value })}
                                        placeholder="Ej: +57 321..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Dirección Fiscal</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                        value={editData.direccion}
                                        onChange={e => setEditData({ ...editData, direccion: e.target.value })}
                                        placeholder="Dirección completa"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-black text-sm transition hover:bg-gray-200"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-black text-sm shadow-md hover:bg-brand-700 transition"
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
                        <h3 className="text-2xl font-black text-gray-900 mb-1">Calificar Cliente</h3>
                        <p className="text-gray-500 font-bold mb-6 text-sm">{selectedClientForRating.nombre}</p>

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setTempRating(star)}
                                    className="transition-all hover:scale-125"
                                >
                                    <Star
                                        className={`w-10 h-10 cursor-pointer transition-all ${star <= tempRating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300 hover:text-yellow-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-3xl font-black text-gray-900">{tempRating}</p>
                            <p className="text-gray-500 font-bold text-xs">de 5 estrellas</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRatingModal(false);
                                    setSelectedClientForRating(null);
                                }}
                                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-black text-sm transition hover:bg-gray-200"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveRating}
                                className="flex-1 bg-yellow-500 text-white py-3 rounded-xl font-black text-sm transition hover:bg-yellow-600 shadow-md"
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

