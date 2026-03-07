
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box, Plus, Search, Layers, Activity,
    ShoppingCart, ArrowUpDown, Edit3,
    MoreVertical, User, Tag, MapPin,
    X, Check, AlertCircle, Package
} from 'lucide-react';
import clsx from 'clsx';

interface Product {
    id: number;
    sku_producto: string;
    nombre_producto: string;
    descripcion?: string | null;
    cliente_id?: number | null;
    cliente?: { id: number; nombre: string; contacto?: string; direccion?: string } | null;
    acabado?: string | null;
    imagen_url?: string | null;
    stock_actual: number;
    ancho_tira?: number | null;
    medidas_pieza?: string | null;
    piezas_lamina_4x8?: string | null;
    piezas_lamina_2x1?: string | null;
    empaque_de?: string | null;
    listaMateriales?: any[];
    rutas?: any[];
}

const initialNewProductState = {
    nombre_producto: '',
    sku_producto: '',
    cliente_id: '',
    acabado: '',
    ancho_tira: '',
    medidas_pieza: '',
    empaque_de: '',
    stock_actual: 0,
};

export const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [materialFilter, setMaterialFilter] = useState('');
    const [sortByClientAsc, setSortByClientAsc] = useState(true);

    // UI States
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showOTModal, setShowOTModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form States
    const [stockQty, setStockQty] = useState('');
    const [stockType, setStockType] = useState<'entrada' | 'salida'>('entrada');
    const [otQty, setOtQty] = useState('');
    const [otDate, setOtDate] = useState('');

    // Edit Form States
    const [editData, setEditData] = useState<any>({ ...initialNewProductState });
    const [newProductData, setNewProductData] = useState<any>({ ...initialNewProductState });
    
    const [clients, setClients] = useState<any[]>([]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/products', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setProducts(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/clients', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setClients(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const allMaterials = Array.from(new Set(products.flatMap(p => (p.listaMateriales || []).map((m: any) => m.materiaPrima?.nombre_mp)))).filter(Boolean);

    const handleStockAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            await axios.post(`http://localhost:3000/api/products/${selectedProduct.id}/stock`, {
                cantidad: Number(stockQty),
                tipo: stockType
            });
            setShowStockModal(false);
            setStockQty('');
            fetchProducts();
        } catch (error) {
            alert('Error ajustando stock');
        }
    };

    const handleCreateOT = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/orders', {
                tipo_orden: 'PRODUCCION_SERIE',
                producto_id: selectedProduct.id,
                cantidad_fabricar: Number(otQty),
                cliente: selectedProduct.cliente?.nombre,
                fecha_entrega_req: otDate
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowOTModal(false);
            setOtQty('');
            setOtDate('');
            alert('Orden de Trabajo creada con éxito');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error creando OT';
            alert(errMsg);
        }
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            // If there's a new image file selected, upload it first
            if ((editData as any).imageFile) {
                const form = new FormData();
                form.append('image', (editData as any).imageFile);
                await axios.post(`http://localhost:3000/api/products/${selectedProduct.id}/image`, form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // Remove from payload
                delete (editData as any).imageFile;
            }

            await axios.put(`http://localhost:3000/api/products/${selectedProduct.id}`, editData);
            setShowEditModal(false);
            fetchProducts();
            alert('Producto actualizado con éxito');
        } catch (error) {
            alert('Error actualizando producto');
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/products', newProductData, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowCreateModal(false);
            setNewProductData({ ...initialNewProductState });
            fetchProducts();
            alert('Producto creado con éxito');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error creando producto';
            alert(errMsg);
        }
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setEditData({
            nombre_producto: product.nombre_producto,
            sku_producto: product.sku_producto,
            cliente_id: (product as any).cliente_id?.toString() || '',
            acabado: product.acabado || '',
            ancho_tira: product.ancho_tira || '',
            medidas_pieza: (product as any).medidas_pieza || '',
            empaque_de: (product as any).empaque_de || ''
        });
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        setNewProductData({ ...initialNewProductState });
        setShowCreateModal(true);
    };

    const filteredProducts = products
        .filter(p => {
            const q = searchTerm.toLowerCase();
            if (!q) return true;
            return p.nombre_producto.toLowerCase().includes(q) || p.sku_producto.toLowerCase().includes(q) || (p.cliente?.nombre && p.cliente.nombre.toLowerCase().includes(q));
        })
        .filter(p => (clientFilter ? String(p.cliente_id) === String(clientFilter) : true))
        .filter(p => (materialFilter ? (p.listaMateriales || []).some((m: any) => m.materiaPrima?.nombre_mp === materialFilter) : true))
        .sort((a, b) => {
            if (!sortByClientAsc) return 0;
            const an = a.cliente?.nombre || '';
            const bn = b.cliente?.nombre || '';
            return an.localeCompare(bn);
        });

    return (
        <div className="space-y-6 pb-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Catálogo de Productos</h1>
                    <p className="text-gray-500 mt-1">Gestiona el inventario de productos terminados y sus rutas de fabricación.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-brand-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-100 font-semibold"
                >
                    <Plus className="w-5 h-5" /> Nuevo Producto
                </button>
            </div>

            {/* Search and Filters bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o cliente..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={clientFilter}
                        onChange={e => setClientFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border bg-gray-50"
                    >
                        <option value="">Todos los clientes</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>

                    <select
                        value={materialFilter}
                        onChange={e => setMaterialFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border bg-gray-50"
                    >
                        <option value="">Todos los materiales</option>
                        {allMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <button
                        onClick={() => setSortByClientAsc(s => !s)}
                        className="px-3 py-2 rounded-xl border bg-white text-sm"
                    >
                        Ordenar por cliente: {sortByClientAsc ? 'ASC' : 'OFF'}
                    </button>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    Mostrando <strong>{filteredProducts.length}</strong> productos
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="bg-white rounded-2xl h-[380px] animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col relative"
                            onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }}
                        >
                            {/* Card Header: Name and Stock */}
                            <div className="p-5 flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{product.nombre_producto}</h3>
                                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{product.sku_producto}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 border border-brand-100">
                                        <Package className="w-4 h-4" />
                                        {product.stock_actual.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Product Image */}
                            <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden mx-4 rounded-2xl flex items-center justify-center">
                                {product.imagen_url ? (
                                    <img
                                        src={product.imagen_url}
                                        alt={product.nombre_producto}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.target as any).src = 'https://placehold.co/400x300?text=Sin+Imagen';
                                        }}
                                    />
                                ) : (
                                    <Box className="w-16 h-16 text-gray-200" />
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="p-5 space-y-3 flex-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium truncate">{product.cliente?.nombre || 'Sin cliente'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{product.acabado || 'Sin acabado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{product.ancho_tira || 'Sin ancho'}</span>
                                </div>
                            </div>

                            {/* Action Buttons Footer */}
                            <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { setSelectedProduct(product); setShowOTModal(true); }}
                                    className="text-brand-600 bg-white border border-brand-100 hover:bg-brand-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    CREAR NUEVA OT
                                </button>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setSelectedProduct(product); setShowStockModal(true); }}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition whitespace-nowrap"
                                        title="Movimiento Stock"
                                    >
                                        <ArrowUpDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* All other modals (Detail, Stock, OT, Edit) go here... */}

            {/* CREATE PRODUCT MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-xl max-w-2xl w-full p-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black">Crear Nuevo Producto</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nombre del Producto</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                        value={newProductData.nombre_producto}
                                        onChange={e => setNewProductData({ ...newProductData, nombre_producto: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">SKU</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-mono text-sm"
                                        value={newProductData.sku_producto}
                                        onChange={e => setNewProductData({ ...newProductData, sku_producto: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Cliente</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                        value={newProductData.cliente_id}
                                        onChange={e => setNewProductData({ ...newProductData, cliente_id: e.target.value })}
                                    >
                                        <option value="">Seleccionar Cliente</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Acabado</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={newProductData.acabado}
                                        onChange={e => setNewProductData({ ...newProductData, acabado: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Ancho Tira (mm)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={newProductData.ancho_tira}
                                        onChange={e => setNewProductData({ ...newProductData, ancho_tira: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Dimensiones (mm)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={newProductData.medidas_pieza}
                                        onChange={e => setNewProductData({ ...newProductData, medidas_pieza: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Empaque de</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={newProductData.empaque_de}
                                        onChange={e => setNewProductData({ ...newProductData, empaque_de: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black transition hover:bg-gray-200"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-brand-100 hover:bg-brand-700 transition"
                                >
                                    CREAR PRODUCTO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Other modals here... */}
            {showDetailModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">{selectedProduct.nombre_producto}</h2>
                                <p className="text-sm font-mono text-gray-400">{selectedProduct.sku_producto}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white rounded-full"><X /></button>
                        </div>
                        <div className="overflow-y-auto p-8 flex flex-col md:flex-row gap-10">
                            <div className="w-full md:w-1/2 aspect-square rounded-3xl bg-gray-100 overflow-hidden">
                                {selectedProduct.imagen_url ? (
                                    <img src={selectedProduct.imagen_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Box className="w-24 h-24 text-gray-200" /></div>
                                )}
                            </div>
                            <div className="w-full md:w-1/2 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Stock Actual</span>
                                        <span className="text-2xl font-black text-brand-600">{selectedProduct.stock_actual}</span>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ancho Tira (mm)</span>
                                        <span className="text-lg font-bold text-gray-700">{selectedProduct.ancho_tira || 'No definida'}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-gray-500 font-medium flex items-center gap-2"><User className="w-4 h-4" /> Cliente:</span>
                                        <span className="font-bold">{selectedProduct.cliente?.nombre || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-gray-500 font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Ancho Tira:</span>
                                        <span className="font-bold">{selectedProduct.ancho_tira || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-gray-500 font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Acabado:</span>
                                        <span className="font-bold">{selectedProduct.acabado || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="text-gray-500 font-medium flex items-center gap-2"><Layers className="w-4 h-4" /> Dimensiones:</span>
                                        <span className="font-bold">{selectedProduct.medidas_pieza || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b pb-2 text-blue-600">
                                        <span className="text-gray-500 font-medium flex items-center gap-2"><Activity className="w-4 h-4" /> Piezas/Hora:</span>
                                        <span className="font-black">{selectedProduct.rutas && selectedProduct.rutas.length > 0 ? selectedProduct.rutas[0]?.piezas_por_hora_estimado : 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-blue-400 uppercase">Lámina 4x8</span>
                                        <span className="text-lg font-black text-blue-700">{selectedProduct.piezas_lamina_4x8 || '-'}</span>
                                    </div>
                                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-purple-400 uppercase">Lámina 2x1</span>
                                        <span className="text-lg font-black text-purple-700">{selectedProduct.piezas_lamina_2x1 || '-'}</span>
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">Empaque de</span>
                                    <span className="text-md font-bold text-orange-700">{selectedProduct.empaque_de || 'No definido'}</span>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Materiales (BoM)</h4>
                                    <div className="space-y-2">
                                        {selectedProduct.listaMateriales && selectedProduct.listaMateriales.map((m: any) => (
                                            <div key={m.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-sm font-semibold">{m.materiaPrima.nombre_mp}</span>
                                                <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border border-gray-100">
                                                    {m.cantidad_requerida} {m.materiaPrima.unidad_medida_stock}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStockModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">Ajustar Stock</h3>
                            <button onClick={() => setShowStockModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-gray-500 mb-6 text-sm">Registra una entrada o salida de inventario para: <br /><strong>{selectedProduct.nombre_producto}</strong></p>

                        <form onSubmit={handleStockAdjustment} className="space-y-6">
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setStockType('entrada')}
                                    className={clsx(
                                        "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                                        stockType === 'entrada' ? "bg-white text-green-600 shadow-sm" : "text-gray-400"
                                    )}
                                >
                                    ENTRADA (+)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStockType('salida')}
                                    className={clsx(
                                        "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                                        stockType === 'salida' ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                                    )}
                                >
                                    SALIDA (-)
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Cantidad de Piezas</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-xl"
                                    value={stockQty}
                                    onChange={e => setStockQty(e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-brand-100 hover:bg-brand-700 transition">
                                CONFIRMAR MOVIMIENTO
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showOTModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">Crear Orden de Trabajo</h3>
                            <button onClick={() => setShowOTModal(false)}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-brand-50 p-4 rounded-2xl mb-8 flex items-center gap-4 border border-brand-100">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0">
                                <img src={selectedProduct.imagen_url || ''} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="font-bold text-brand-900 line-clamp-1">{selectedProduct.nombre_producto}</h4>
                                <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">{selectedProduct.cliente?.nombre}</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateOT} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Cantidad a fabricar</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                    value={otQty}
                                    onChange={e => setOtQty(e.target.value)}
                                    placeholder="Cantidad"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fecha Estimada Entrega</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                    value={otDate}
                                    onChange={e => setOtDate(e.target.value)}
                                />
                            </div>

                            <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-brand-100 hover:bg-brand-700 transition">
                                LANZAR PRODUCCIÓN
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {showEditModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-xl max-w-2xl w-full p-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black">Editar Producto</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleEditProduct} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nombre del Producto</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                        value={editData.nombre_producto}
                                        onChange={e => setEditData({ ...editData, nombre_producto: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Imagen del Producto</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setEditData({ ...editData, imageFile: e.target.files ? e.target.files[0] : undefined })}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">SKU</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-mono text-sm"
                                        value={editData.sku_producto}
                                        onChange={e => setEditData({ ...editData, sku_producto: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Cliente</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                        value={editData.cliente_id}
                                        onChange={e => setEditData({ ...editData, cliente_id: e.target.value })}
                                    >
                                        <option value="">Seleccionar Cliente</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Acabado</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.acabado}
                                        onChange={e => setEditData({ ...editData, acabado: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Ancho Tira (mm)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.ancho_tira}
                                        onChange={e => setEditData({ ...editData, ancho_tira: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Dimensiones (mm)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.medidas_pieza}
                                        onChange={e => setEditData({ ...editData, medidas_pieza: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Empaque de</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={editData.empaque_de}
                                        onChange={e => setEditData({ ...editData, empaque_de: e.target.value })}
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
                                    GUARDAR CAMBIOS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
