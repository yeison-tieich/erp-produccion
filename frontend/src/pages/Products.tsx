import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box, Plus, Search, Layers, Activity,
    ShoppingCart, ArrowUpDown, Edit3,
    MoreVertical, User, Tag, MapPin,
    X, Check, AlertCircle, Package, Trash2, FileText, Eye, Upload, Calendar, History
} from 'lucide-react';
import clsx from 'clsx';
import { API_URL, BASE_URL } from '../api';

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.8);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

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
    plano_pdf_url?: string | null;
    activo: boolean;
    precio_venta?: number | null;
    listaMateriales?: { id: number; materia_prima_id: number; materiaPrima: { nombre_mp: string; unidad_medida_stock: string }; cantidad_requerida: number }[];
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
    precio_venta: '',
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
    const [showKardexModal, setShowKardexModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [routesData, setRoutesData] = useState<any[]>([]);

    // Form States
    const [stockQty, setStockQty] = useState('');
    const [stockType, setStockType] = useState<'entrada' | 'salida'>('entrada');
    const [otQty, setOtQty] = useState('');
    const [otDate, setOtDate] = useState('');
    const [sheetQty, setSheetQty] = useState('');
    const [sheetType, setSheetType] = useState<'4x8' | '2x1'>('4x8');

    // Edit Form States
    const [editData, setEditData] = useState<any>({ ...initialNewProductState, materials: [] });
    const [newProductData, setNewProductData] = useState<any>({ ...initialNewProductState });

    const [clients, setClients] = useState<any[]>([]);
    const [allMateriaPrima, setAllMateriaPrima] = useState<any[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/products`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setProducts(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMateriaPrima = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/inventory`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setAllMateriaPrima(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/clients`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setClients(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchClients();
        fetchMateriaPrima();
    }, []);

    const allMaterials = Array.from(new Set(products.flatMap(p => (p.listaMateriales || []).map((m: any) => m.materiaPrima?.nombre_mp)))).filter(Boolean);

    const handleStockAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            await axios.post(`${API_URL}/products/${selectedProduct.id}/stock`, {
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

    const fetchMovements = async (productId: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/products/${productId}/movements`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setMovements(res.data);
            setShowKardexModal(true);
        } catch (error) {
            alert('Error cargando movimientos');
        }
    };

    const handleCreateOT = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/orders`, {
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
            setSheetQty('');
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
            const token = localStorage.getItem('token');
            // If there's a new image file selected, upload it first
            if (editData.imageFile) {
                const compressedFile = await compressImage(editData.imageFile);
                const form = new FormData();
                form.append('image', compressedFile);
                await axios.post(`${API_URL}/products/${selectedProduct.id}/image`, form, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                delete editData.imageFile;
            }

            // If there's a new PDF file selected, upload it
            if (editData.pdfFile) {
                const form = new FormData();
                form.append('pdf', editData.pdfFile);
                await axios.post(`${API_URL}/products/${selectedProduct.id}/pdf`, form, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                delete editData.pdfFile;
            }

            // Prepare payload for material association
            const payload = {
                ...editData,
                precio_venta: editData.precio_venta ? Number(editData.precio_venta) : 0,
                materials: (editData.materials || []).map((m: any) => ({
                    materia_prima_id: m.materia_prima_id,
                    cantidad_requerida: Number(m.cantidad_requerida) || 1
                }))
            };

            await axios.put(`${API_URL}/products/${selectedProduct.id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowEditModal(false);
            fetchProducts();
            alert('Producto actualizado con éxito');
        } catch (error) {
            console.error(error);
            alert('Error actualizando producto');
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) return;
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el producto "${selectedProduct.nombre_producto}"? Esta acción no se puede deshacer.`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/products/${selectedProduct.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowDeleteModal(false);
            fetchProducts();
            alert('Producto eliminado con éxito');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error eliminando producto';
            alert(errMsg);
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/products`, newProductData, {
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

    const handleUpdateRoutes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/products/${selectedProduct.id}/routes`, {
                routes: routesData
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowRouteModal(false);
            fetchProducts();
            alert('Ruta de producción actualizada con éxito');
        } catch (error: any) {
            console.error('Error updating routes:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Error actualizando ruta de producción';
            alert(errorMsg);
        }
    };

    const openRouteModal = (product: Product) => {
        setSelectedProduct(product);
        setRoutesData((product.rutas || []).map(r => ({
            id: r.id,
            no: r.no_operacion,
            nombre: r.nombre_operacion,
            centro: r.centro_trabajo,
            piezas_hora: r.piezas_por_hora_estimado ?? '',
            tiempo_estandar: r.tiempo_estandar ?? ''
        })));
        setShowRouteModal(true);
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setEditData({
            nombre_producto: product.nombre_producto,
            sku_producto: product.sku_producto,
            cliente_id: product.cliente_id?.toString() || '',
            acabado: product.acabado || '',
            ancho_tira: product.ancho_tira || '',
            medidas_pieza: product.medidas_pieza || '',
            empaque_de: product.empaque_de || '',
            activo: product.activo ?? true,
            precio_venta: product.precio_venta || '',
            materials: (product.listaMateriales || []).map(m => ({
                materia_prima_id: m.materia_prima_id,
                nombre_mp: m.materiaPrima.nombre_mp,
                cantidad_requerida: m.cantidad_requerida
            }))
        });
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        setNewProductData({ ...initialNewProductState });
        setShowCreateModal(true);
    };

    const filteredProducts = products
        .filter(p => (showInactive ? true : p.activo !== false))
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
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Mostrar inactivos</span>
                    </label>
                </div>
                <div className="text-sm text-gray-500 font-medium ml-auto">
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
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 border border-brand-100">
                                        <Package className="w-4 h-4" />
                                        {product.stock_actual.toLocaleString()}
                                    </div>
                                    {!product.activo && (
                                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-gray-200">
                                            Oculto
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Product Image */}
                            <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden mx-4 rounded-2xl flex items-center justify-center">
                                {product.imagen_url ? (
                                    <img
                                        src={product.imagen_url.startsWith('http') ? product.imagen_url : `${BASE_URL}${product.imagen_url}`}
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
                                        onClick={() => openRouteModal(product)}
                                        className="p-2 text-brand-500 hover:bg-white hover:text-brand-900 rounded-lg border border-transparent hover:border-brand-100 transition"
                                        title="Definir Ruta"
                                    >
                                        <Activity className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(product); fetchMovements(product.id); }}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition"
                                        title="Ver Historial (Kardex)"
                                    >
                                        <History className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(product); handleDeleteProduct(); }}
                                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100 transition"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] shadow-xl max-w-2xl w-full flex flex-col max-h-[100vh] lg:max-h-[90vh] overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-600 p-3 rounded-2xl">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black">Crear Nuevo Producto</h3>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10">
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
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Precio de Venta</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                            value={newProductData.precio_venta}
                                            onChange={e => setNewProductData({ ...newProductData, precio_venta: e.target.value })}
                                            placeholder="0.00"
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
                </div>
            )}

            {/* Other modals here... */}
            {showDetailModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 print:bg-white print:p-0">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            body * { visibility: hidden; }
                            #printableArea, #printableArea * { visibility: visible; }
                            #printableArea { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-shadow: none; border: none; }
                            .print-hide { display: none !important; }
                        }
                    `}} />
                    <div id="printableArea" className="bg-white rounded-none lg:rounded-[3rem] w-full max-w-[95vw] h-full lg:h-[95vh] flex flex-col overflow-hidden transition-all duration-500 print:overflow-visible print:max-h-none print:shadow-none print:rounded-none">
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5 print-hide">
                            <div className="flex items-center gap-6">
                                <div className="bg-brand-600 p-4 rounded-3xl">
                                    <Package className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black">{selectedProduct.nombre_producto}</h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">SKU: {selectedProduct.sku_producto} • Estado: {selectedProduct.activo ? 'ACTIVO' : 'INACTIVO'}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> IMPRIMIR FICHA
                                </button>
                                <button onClick={() => setShowDetailModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                            </div>
                        </div>
                        {/* Print Header */}
                        <div className="hidden print:block mb-8 text-center border-b-2 pb-4 border-gray-900">
                            <h1 className="text-3xl font-black uppercase text-gray-900">Ficha Técnica de Procedimiento</h1>
                            <h2 className="text-xl font-bold text-gray-700">{selectedProduct.nombre_producto}</h2>
                            <p className="text-sm font-mono text-gray-500">SKU: {selectedProduct.sku_producto}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-gray-50/50 print:overflow-visible print:p-0">
                            <div className="flex flex-col md:flex-row gap-10">
                                <div className="w-full md:w-1/2 aspect-square rounded-3xl bg-gray-100 overflow-hidden print-hide">
                                    {selectedProduct.imagen_url ? (
                                        <img src={selectedProduct.imagen_url.startsWith('http') ? selectedProduct.imagen_url : `${BASE_URL}${selectedProduct.imagen_url}`} className="w-full h-full object-cover" />
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
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Precio de Venta</span>
                                            <span className="text-2xl font-black text-green-600">${selectedProduct.precio_venta?.toLocaleString() || '0'}</span>
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

                                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                                        <div>
                                            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">Empaque de</span>
                                            <span className="text-md font-bold text-orange-700">{selectedProduct.empaque_de || 'No definido'}</span>
                                        </div>
                                        {selectedProduct.plano_pdf_url && (
                                            <button
                                                onClick={() => setShowPDFModal(true)}
                                                className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-brand-700 transition"
                                            >
                                                <FileText className="w-4 h-4" /> VER PLANO PDF
                                            </button>
                                        )}
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

                            {/* PROCEDIMIENTO DETALLADO DE FABRICACIÓN */}
                            <div className="mt-8 pt-8 border-t-2 border-gray-100 print:border-gray-900 print:mt-4 print:pt-4">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-6">Procedimiento Detallado de Fabricación</h3>
                                {selectedProduct.rutas && selectedProduct.rutas.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 print:bg-gray-200">
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">No. Operación</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Operación</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Centro de Trabajo</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Pzs/Hora Est.</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Verificado Por</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedProduct.rutas
                                                    .sort((a: any, b: any) => a.no_operacion - b.no_operacion)
                                                    .map((ruta: any) => (
                                                        <tr key={ruta.id} className="print:break-inside-avoid">
                                                            <td className="p-3 border border-gray-200 font-bold">{ruta.no_operacion}</td>
                                                            <td className="p-3 border border-gray-200 font-bold">{ruta.nombre_operacion}</td>
                                                            <td className="p-3 border border-gray-200 text-gray-600">{ruta.centro_trabajo}</td>
                                                            <td className="p-3 border border-gray-200 font-mono text-center">{ruta.piezas_por_hora_estimado || '-'}</td>
                                                            <td className="p-3 border border-gray-200 w-32 border-b-2 border-b-gray-400"></td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        <div className="hidden print:block mt-8 p-4 border border-gray-400 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-4">Aprobación de Calidad</p>
                                            <div className="flex justify-between items-end mt-12">
                                                <div className="w-64 border-b border-gray-600 text-center pb-2">Firma Supervisor</div>
                                                <div className="w-64 border-b border-gray-600 text-center pb-2">Firma Calidad</div>
                                                <div className="w-48 border-b border-gray-600 text-center pb-2">Fecha</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No hay rutas de fabricación definidas para este producto.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStockModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-xl max-w-md w-full overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-600 p-2 rounded-xl">
                                    <ArrowUpDown className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black">Ajustar Stock</h3>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8">
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
                </div>
            )}

            {showOTModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-xl max-w-md w-full overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-600 p-2 rounded-xl">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black">Lanzar Producción</h3>
                            </div>
                            <button onClick={() => {
                                setShowOTModal(false);
                                setOtQty('');
                                setOtDate('');
                                setSheetQty('');
                            }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8">

                            <div className="bg-brand-50 p-4 rounded-2xl mb-8 flex items-center gap-4 border border-brand-100">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0">
                                    <img src={selectedProduct.imagen_url ? (selectedProduct.imagen_url.startsWith('http') ? selectedProduct.imagen_url : `${BASE_URL}${selectedProduct.imagen_url}`) : ''} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-brand-900 line-clamp-1">{selectedProduct.nombre_producto}</h4>
                                    <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">{selectedProduct.cliente?.nombre}</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateOT} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Número de láminas</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                            value={sheetQty}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSheetQty(val);
                                                if (val) {
                                                    const piezasXlaminaStr = sheetType === '4x8' ? selectedProduct?.piezas_lamina_4x8 : selectedProduct?.piezas_lamina_2x1;
                                                    // Extract number from string like "40 piezas" or "40"
                                                    const factor = parseInt(piezasXlaminaStr?.replace(/[^0-9]/g, '') || '0');
                                                    if (factor > 0) {
                                                        setOtQty((parseInt(val) * factor).toString());
                                                    }
                                                }
                                            }}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Tipo Lámina</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-sm"
                                            value={sheetType}
                                            onChange={e => {
                                                const newType = e.target.value as '4x8' | '2x1';
                                                setSheetType(newType);
                                                if (sheetQty) {
                                                    const piezasXlaminaStr = newType === '4x8' ? selectedProduct?.piezas_lamina_4x8 : selectedProduct?.piezas_lamina_2x1;
                                                    const factor = parseInt(piezasXlaminaStr?.replace(/[^0-9]/g, '') || '0');
                                                    if (factor > 0) {
                                                        setOtQty((parseInt(sheetQty) * factor).toString());
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="4x8">4' x 8' ({selectedProduct?.piezas_lamina_4x8 || '?'})</option>
                                            <option value="2x1">2' x 1' ({selectedProduct?.piezas_lamina_2x1 || '?'})</option>
                                        </select>
                                    </div>
                                </div>

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
                </div>
            )}

            {showEditModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] shadow-xl max-w-2xl w-full flex flex-col max-h-[100vh] lg:max-h-[90vh] overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-600 p-3 rounded-2xl">
                                    <Edit3 className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black">Editar Producto</h3>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10">

                            <form onSubmit={handleEditProduct} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 flex justify-between items-center bg-gray-50 p-4 rounded-2xl border">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("w-3 h-3 rounded-full", editData.activo ? "bg-green-500" : "bg-gray-300")}></div>
                                            <span className="font-bold text-gray-700">{editData.activo ? "Producto Visible" : "Producto Oculto"}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditData({ ...editData, activo: !editData.activo })}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl text-xs font-black transition",
                                                editData.activo ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"
                                            )}
                                        >
                                            {editData.activo ? "OCULTAR PRODUCTO" : "MOSTRAR PRODUCTO"}
                                        </button>
                                    </div>
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
                                    <div className="col-span-1">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Imagen del Producto</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="file"
                                                id="product-image"
                                                accept="image/*"
                                                onChange={e => setEditData({ ...editData, imageFile: e.target.files ? e.target.files[0] : undefined })}
                                                className="hidden"
                                            />
                                            <label htmlFor="product-image" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-500 cursor-pointer text-gray-500 font-bold transition">
                                                <Upload className="w-4 h-4" /> {editData.imageFile ? 'Imagen Listas' : 'Cargar Imagen'}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Plano PDF</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="file"
                                                id="product-pdf"
                                                accept="application/pdf"
                                                onChange={e => setEditData({ ...editData, pdfFile: e.target.files ? e.target.files[0] : undefined })}
                                                className="hidden"
                                            />
                                            <label htmlFor="product-pdf" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-500 cursor-pointer text-gray-500 font-bold transition">
                                                <FileText className="w-4 h-4" /> {editData.pdfFile ? 'PDF Listo' : 'Cargar Plano'}
                                            </label>
                                        </div>
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
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Precio de Venta</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                            value={editData.precio_venta}
                                            onChange={e => setEditData({ ...editData, precio_venta: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Materiales Requeridos (Materia Prima)</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const firstMP = allMateriaPrima[0];
                                                    if (firstMP) {
                                                        setEditData({
                                                            ...editData,
                                                            materials: [...(editData.materials || []), { materia_prima_id: firstMP.id, nombre_mp: firstMP.nombre_mp, cantidad_requerida: 1 }]
                                                        });
                                                    }
                                                }}
                                                className="text-brand-600 text-xs font-black hover:underline"
                                            >
                                                + AGREGAR MATERIAL
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(editData.materials || []).map((m: any, idx: number) => (
                                                <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border">
                                                    <select
                                                        className="flex-1 bg-transparent font-bold text-sm outline-none"
                                                        value={m.materia_prima_id}
                                                        onChange={e => {
                                                            const newMats = [...editData.materials];
                                                            newMats[idx].materia_prima_id = Number(e.target.value);
                                                            setEditData({ ...editData, materials: newMats });
                                                        }}
                                                    >
                                                        {allMateriaPrima.map(mp => (
                                                            <option key={mp.id} value={mp.id}>{mp.nombre_mp} ({mp.sku_mp})</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="w-20 bg-white px-2 py-1 rounded border text-center font-bold"
                                                        value={m.cantidad_requerida}
                                                        onChange={e => {
                                                            const newMats = [...editData.materials];
                                                            newMats[idx].cantidad_requerida = e.target.value;
                                                            setEditData({ ...editData, materials: newMats });
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newMats = editData.materials.filter((_: any, i: number) => i !== idx);
                                                            setEditData({ ...editData, materials: newMats });
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
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
                </div>
            )}

            {/* PDF VIEWER MODAL */}
            {showPDFModal && selectedProduct && selectedProduct.plano_pdf_url && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex flex-col p-4">
                    <div className="flex justify-between items-center text-white mb-4 px-4">
                        <div>
                            <h3 className="text-xl font-black">Plano: {selectedProduct.nombre_producto}</h3>
                            <p className="text-xs font-mono text-gray-400">{selectedProduct.sku_producto}</p>
                        </div>
                        <button
                            onClick={() => setShowPDFModal(false)}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="flex-1 bg-white rounded-3xl overflow-hidden relative flex flex-col">
                        <iframe
                            src={selectedProduct.plano_pdf_url.startsWith('http') ? selectedProduct.plano_pdf_url : `${BASE_URL}${selectedProduct.plano_pdf_url}`}
                            className="w-full h-full border-none flex-1"
                            title="Plano PDF"
                        />
                        <div className="p-4 bg-gray-50 flex justify-center border-t border-gray-100">
                            <a
                                href={selectedProduct.plano_pdf_url.startsWith('http') ? selectedProduct.plano_pdf_url : `${BASE_URL}${selectedProduct.plano_pdf_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Descargar o Ver Pantalla Completa
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* KARDEX MODAL */}
            {showKardexModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] shadow-xl max-w-2xl w-full h-full lg:h-[85vh] flex flex-col overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-600 p-3 rounded-2xl text-white">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black">Historial de Movimientos</h3>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{selectedProduct.nombre_producto}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowKardexModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                            {movements.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-400 font-bold">No hay movimientos registrados para este producto.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {movements.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                                    m.tipo_movimiento === 'entrada' ? "bg-green-50 text-green-600" :
                                                        m.tipo_movimiento === 'salida' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    {m.tipo_movimiento === 'entrada' ? <Plus className="w-5 h-5" /> :
                                                        m.tipo_movimiento === 'salida' ? <X className="w-5 h-5" /> : <ArrowUpDown className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx(
                                                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                                            m.tipo_movimiento === 'entrada' ? "bg-green-100 text-green-700" :
                                                                m.tipo_movimiento === 'salida' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {m.tipo_movimiento}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-bold">{new Date(m.fecha).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-700 mt-1">{m.referencia || 'Ajuste de inventario'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={clsx(
                                                    "text-lg font-black",
                                                    m.tipo_movimiento === 'entrada' ? "text-green-600" :
                                                        m.tipo_movimiento === 'salida' ? "text-red-600" : "text-blue-600"
                                                )}>
                                                    {m.tipo_movimiento === 'salida' ? '-' : '+'}{m.cantidad}
                                                </span>
                                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tight">Piezas</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowKardexModal(false)}
                                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-black hover:bg-gray-200 transition"
                            >
                                CERRAR HISTORIAL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ROUTE MODAL */}
            {showRouteModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] w-full max-w-5xl h-full lg:h-[90vh] flex flex-col overflow-hidden transition-all duration-500">
                        {/* Modal Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-6">
                                <div className="bg-brand-600 p-4 rounded-3xl">
                                    <Activity className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">Ruta de Producción</h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                                        {selectedProduct.nombre_producto} • SKU: {selectedProduct.sku_producto}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowRouteModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">

                            <form onSubmit={handleUpdateRoutes} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <div className="col-span-1">No.</div>
                                        <div className="col-span-4">Operación</div>
                                        <div className="col-span-3">Centro de Trabajo</div>
                                        <div className="col-span-2">Pzs/Hora</div>
                                        <div className="col-span-1">T. Est (min)</div>
                                        <div className="col-span-1 text-center">Acción</div>
                                    </div>

                                    <div className="space-y-3">
                                        {routesData.map((r, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-2xl border border-gray-100 hover:border-brand-200 transition shadow-sm">
                                                <div className="col-span-1 font-mono font-bold text-brand-600 text-center">{r.no}</div>
                                                <div className="col-span-4">
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-2.5 rounded-xl border-none bg-gray-50 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition"
                                                        value={r.nombre}
                                                        onChange={e => {
                                                            const newRoutes = [...routesData];
                                                            newRoutes[idx].nombre = e.target.value;
                                                            setRoutesData(newRoutes);
                                                        }}
                                                        placeholder="Ej: Corte, Troquelado..."
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-2.5 rounded-xl border-none bg-gray-50 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition"
                                                        value={r.centro}
                                                        onChange={e => {
                                                            const newRoutes = [...routesData];
                                                            newRoutes[idx].centro = e.target.value;
                                                            setRoutesData(newRoutes);
                                                        }}
                                                        placeholder="Ej: Cizalla, Prensa..."
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-2.5 rounded-xl border-none bg-gray-50 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition"
                                                        value={r.piezas_hora}
                                                        onChange={e => {
                                                            const newRoutes = [...routesData];
                                                            newRoutes[idx].piezas_hora = e.target.value;
                                                            setRoutesData(newRoutes);
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-3 py-2.5 rounded-xl border-none bg-gray-50 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition"
                                                        value={r.tiempo_estandar}
                                                        onChange={e => {
                                                            const newRoutes = [...routesData];
                                                            newRoutes[idx].tiempo_estandar = e.target.value;
                                                            setRoutesData(newRoutes);
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="col-span-1 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newRoutes = routesData.filter((_, i) => i !== idx);
                                                            setRoutesData(newRoutes);
                                                        }}
                                                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const lastNo = routesData.length > 0 ? routesData[routesData.length - 1].no : 0;
                                            setRoutesData([...routesData, { id: undefined, no: lastNo + 10, nombre: '', centro: '', piezas_hora: '', tiempo_estandar: '' }]);
                                        }}
                                        className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 hover:border-brand-500 hover:text-brand-600 font-black flex items-center justify-center gap-3 transition group"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" /> AGREGAR OPERACIÓN A LA RUTA
                                    </button>
                                </div>

                                <div className="flex gap-4 pt-8 border-t border-gray-100 bg-white p-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowRouteModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-[1.5rem] font-black hover:bg-gray-200 transition"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-brand-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-brand-100 hover:bg-brand-700 transition transform hover:scale-[1.02] active:scale-95"
                                    >
                                        GUARDAR RUTA DE FABRICACIÓN
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
