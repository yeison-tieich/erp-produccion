import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../api';
import {
    Package, Plus, Search, AlertCircle, ArrowUpCircle,
    Edit3, X, Eye, History, ShoppingCart, Filter,
    ChevronRight, ArrowDownCircle, FileText, Download,
    RotateCcw
} from 'lucide-react';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { MaterialForm } from '../components/inventory/MaterialForm';
import { AddStockModal } from '../components/inventory/AddStockModal';
import clsx from 'clsx';
import { formatNumber, formatUnit, formatCurrency } from '../utils/formatting';
import { materiaPrimaRepository } from '../repositories/materiaPrimaRepository';
import { inventarioRepository } from '../repositories/inventarioRepository';

interface Material {
    id: number;
    sku_mp: string;
    nombre_mp: string;
    categoria_mp: string;
    stock_actual: number;
    stock_reservado: number;
    devoluciones?: number;
    punto_reorden: number;
    unidad_medida_stock: string;
    espesor: number;
    ancho: number;
    largo: number;
    densidad: number;
    peso_unitario: number;
    costo_unitario?: number;
}

interface Movement {
    id: number;
    tipo_movimiento: string;
    cantidad: number;
    fecha_hora: string;
    referencia_id: string | null;
    imagen_remision_url: string | null;
    cliente?: { nombre: string };
}

export const Inventory = () => {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'low-stock'>('all');
    const [monthlyMovements, setMonthlyMovements] = useState(0);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    const [formData, setFormData] = useState({
        sku_mp: '',
        nombre_mp: '',
        categoria_mp: '',
        unidad_medida_stock: 'Kg',
        stock_actual: 0,
        stock_reservado: 0,
        devoluciones: 0,
        punto_reorden: 0,
        espesor: 0,
        ancho: 0,
        largo: 0,
        densidad: 7.85,
        peso_unitario: 0,
        costo_unitario: 0
    });

    const fetchInventory = async () => {
        try {
            const data = await materiaPrimaRepository.getAll();
            setMaterials(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryStats = async () => {
        try {
            // Stats currently require API, but we'll try-catch
            const res = await axios.get(`${API_URL}/inventory/stats`);
            setMonthlyMovements(res.data.monthlyMovements);
        } catch (error) {
            console.error('Stats fetch failed (offline?)', error);
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchInventoryStats();
    }, []);

    const calculateMaterialWeight = (material: any) => {
        if (material.categoria_mp === 'Lámina' || material.categoria_mp === 'Placa') {
            // Area in m2 * thickness in mm * density
            const areaM2 = (Number(material.ancho) / 1000) * (Number(material.largo) / 1000);
            return areaM2 * Number(material.espesor) * Number(material.densidad) * Number(material.stock_actual);
        } else if (material.peso_unitario > 0) {
            return Number(material.stock_actual) * Number(material.peso_unitario);
        }
        return 0;
    };

    const stats = {
        totalItems: materials.length,
        lowStockCount: materials.filter(m => Number(m.stock_actual) <= Number(m.punto_reorden)).length,
        totalWeight: materials.reduce((acc, m) => acc + calculateMaterialWeight(m), 0),
        monthlyMovements: monthlyMovements
    };

    const handleCreateMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await materiaPrimaRepository.create(formData);
            setShowCreateModal(false);
            fetchInventory();
            alert('Material creado con éxito (Híbrido)');
        } catch (error) {
            alert('Error al crear material');
        }
    };

    const handleUpdateMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) return;
        try {
            await materiaPrimaRepository.update(
                selectedMaterial.id_local,
                selectedMaterial.id || selectedMaterial.id_server,
                formData
            );
            setShowEditModal(false);
            fetchInventory();
            alert('Material actualizado con éxito');
        } catch (error) {
            alert('Error al actualizar material');
        }
    };

    const openDetailModal = async (material: any) => {
        setSelectedMaterial(material);
        setShowDetailModal(true);
        setLoadingMovements(true);
        try {
            // Movements can be fetched from repository if native
            const matId = material.id || material.id_server;
            const res = await axios.get(`${API_URL}/inventory/${matId}/movements`);
            setMovements(res.data);
        } catch (error) {
            console.error('Movements fetch failed', error);
            setMovements([]);
        } finally {
            setLoadingMovements(false);
        }
    };

    const handleAddStock = async (amount: number, type: string, reference: string, imageFile?: File) => {
        if (!selectedMaterial) return;
        try {
            const matId = selectedMaterial.id || selectedMaterial.id_server;
            const data: any = {
                materia_prima_id: matId,
                cantidad: amount,
                tipo_movimiento: type,
                referencia_id: reference
            };

            await inventarioRepository.create(data);

            // Si hay imagen y estamos en web, subimos
            if (imageFile) {
                // ... logic for image upload ...
            }

            fetchInventory();
            setShowAddModal(false);
            alert('Movimiento registrado con éxito');
        } catch (error) {
            alert('Error al registrar movimiento');
        }
    };

    const handleReverseMovement = async (movId: number) => {
        if (!window.confirm('¿Estás seguro de que deseas revertir este movimiento? El stock será ajustado automáticamente.')) return;
        try {
            await axios.post(`${API_URL}/inventory/movements/${movId}/reverse`);
            if (selectedMaterial) {
                const matId = selectedMaterial.id || selectedMaterial.id_server;
                const res = await axios.get(`${API_URL}/inventory/${matId}/movements`);
                setMovements(res.data);
                fetchInventory();
            }
        } catch (error) {
            console.error('Error reversing movement:', error);
            alert('Error al revertir el movimiento');
        }
    };

    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.nombre_mp.toLowerCase().includes(searchTerm.toLowerCase()) || m.sku_mp.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || (Number(m.stock_actual) <= Number(m.punto_reorden));
        return matchesSearch && matchesTab;
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Inventario MP</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-pulse"></div>
                            Sistema de Control Real-Time
                        </span>
                        <p className="text-gray-500 text-sm font-medium">Gestiona materias primas y consumibles.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setFormData({
                                sku_mp: '',
                                nombre_mp: '',
                                categoria_mp: '',
                                unidad_medida_stock: 'Kg',
                                stock_actual: 0,
                                stock_reservado: 0,
                                devoluciones: 0,
                                punto_reorden: 0,
                                espesor: 0,
                                ancho: 0,
                                largo: 0,
                                densidad: 7.85,
                                peso_unitario: 0,
                                costo_unitario: 0
                            });
                            setShowCreateModal(true);
                        }}
                        className="bg-brand-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-100 active:scale-95 transition-all font-bold"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Material
                    </button>
                </div>
            </div>

            {/* Stats Section */}
            {!loading && <InventoryStats {...stats} />}

            {/* Content Section */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs & Toolbar */}
                <div className="px-8 py-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex bg-gray-50 p-1 rounded-2xl self-start">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={clsx(
                                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                activeTab === 'all' ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Package className="w-4 h-4" /> Todos los Materiales
                        </button>
                        <button
                            onClick={() => setActiveTab('low-stock')}
                            className={clsx(
                                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                activeTab === 'low-stock' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <ShoppingCart className="w-4 h-4" /> Por Comprar
                            {stats.lowStockCount > 0 && (
                                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md text-[10px]">{stats.lowStockCount}</span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o SKU..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition shadow-sm">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Table - Desktop View */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Material / SKU</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Stock Actual</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">En Proceso</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Peso Est.</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredMaterials.map((material) => {
                                const isLow = Number(material.stock_actual) <= Number(material.punto_reorden);
                                const weight = calculateMaterialWeight(material);

                                return (
                                    <tr key={material.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-black text-gray-900 group-hover:text-brand-600 transition-colors uppercase tracking-tight">{material.nombre_mp}</p>
                                                <p className="text-xs font-mono text-gray-400 mt-0.5">{material.sku_mp}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase">
                                                {material.categoria_mp}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-black text-gray-900">{formatNumber(material.stock_actual, 'produccion')}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{material.unidad_medida_stock}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-black text-orange-600">{formatNumber(material.stock_reservado || 0, 'produccion')}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{material.unidad_medida_stock}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {weight > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold text-blue-600">{formatUnit(weight, 'peso')}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">--</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            {isLow ? (
                                                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-xl w-fit">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase">Crítico</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-xl w-fit">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                    <span className="text-[10px] font-black uppercase">En Stock</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setSelectedMaterial(material); setShowAddModal(true); }}
                                                    className="p-2.5 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-600 hover:text-white transition shadow-sm"
                                                    title="Ingresar Stock"
                                                >
                                                    <ArrowUpCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedMaterial(material);
                                                        setFormData({
                                                            sku_mp: material.sku_mp,
                                                            nombre_mp: material.nombre_mp,
                                                            categoria_mp: material.categoria_mp,
                                                            unidad_medida_stock: material.unidad_medida_stock,
                                                            stock_actual: material.stock_actual,
                                                            stock_reservado: material.stock_reservado,
                                                            // @ts-ignore
                                                            devoluciones: material.devoluciones || 0,
                                                            punto_reorden: material.punto_reorden,
                                                            espesor: material.espesor,
                                                            ancho: material.ancho,
                                                            largo: material.largo,
                                                            densidad: material.densidad,
                                                            peso_unitario: material.peso_unitario,
                                                            costo_unitario: material.costo_unitario || 0
                                                        });
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                                                    title="Editar Especificaciones"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openDetailModal(material)}
                                                    className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition shadow-sm"
                                                    title="Ver Historial"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Cards - Mobile View */}
                <div className="lg:hidden p-4 space-y-4">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse h-32"></div>
                        ))
                    ) : filteredMaterials.map((material) => {
                        const isLow = Number(material.stock_actual) <= Number(material.punto_reorden);
                        const weight = calculateMaterialWeight(material);
                        return (
                            <div key={material.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="pr-2">
                                        <p className="font-black text-gray-900 text-base uppercase tracking-tight leading-tight">{material.nombre_mp}</p>
                                        <p className="text-xs font-mono text-gray-400 mt-1">{material.sku_mp}</p>
                                    </div>
                                    <div className="shrink-0">
                                        {isLow ? (
                                            <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                                <AlertCircle className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase">Crítico</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                <span className="text-[9px] font-black uppercase">En Stock</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Categoría</p>
                                        <p className="text-xs font-bold text-gray-700">{material.categoria_mp}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Stock Actual</p>
                                        <p className="text-xs font-black text-brand-600">{formatNumber(material.stock_actual, 'produccion')} <span className="text-[10px] text-gray-400">{material.unidad_medida_stock}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">En Proceso</p>
                                        <p className="text-xs font-black text-orange-600">{formatNumber(material.stock_reservado || 0, 'produccion')} <span className="text-[10px] text-gray-400">{material.unidad_medida_stock}</span></p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50 mt-1">
                                    <button
                                        onClick={() => { setSelectedMaterial(material); setShowAddModal(true); }}
                                        className="p-2 bg-brand-50 text-brand-600 rounded-lg active:bg-brand-600 active:text-white transition"
                                    >
                                        <ArrowUpCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedMaterial(material);
                                            setFormData({
                                                sku_mp: material.sku_mp,
                                                nombre_mp: material.nombre_mp,
                                                categoria_mp: material.categoria_mp,
                                                unidad_medida_stock: material.unidad_medida_stock,
                                                stock_actual: material.stock_actual,
                                                stock_reservado: material.stock_reservado,
                                                // @ts-ignore
                                                devoluciones: material.devoluciones || 0,
                                                punto_reorden: material.punto_reorden,
                                                espesor: material.espesor,
                                                ancho: material.ancho,
                                                largo: material.largo,
                                                densidad: material.densidad,
                                                peso_unitario: material.peso_unitario,
                                                costo_unitario: material.costo_unitario || 0
                                            });
                                            setShowEditModal(true);
                                        }}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg active:bg-blue-600 active:text-white transition"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openDetailModal(material)}
                                        className="p-2 bg-purple-50 text-purple-600 rounded-lg active:bg-purple-600 active:text-white transition"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredMaterials.length === 0 && !loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <Package className="w-10 h-10 opacity-20 mb-2" />
                            <p className="text-sm font-bold">No se encontraron materiales</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <MaterialForm
                    title="Registrar Nuevo Material"
                    data={formData}
                    setData={setFormData}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateMaterial}
                />
            )}

            {showEditModal && (
                <MaterialForm
                    title="Editar Material"
                    data={formData}
                    setData={setFormData}
                    onClose={() => setShowEditModal(false)}
                    onSubmit={handleUpdateMaterial}
                    isEdit={true}
                />
            )}

            {showAddModal && selectedMaterial && (
                <AddStockModal
                    material={selectedMaterial}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchInventory}
                />
            )}

            {showDetailModal && selectedMaterial && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Detail Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded-md mb-2 inline-block">Ficha Técnica</span>
                                <h3 className="text-3xl font-black text-gray-900">{selectedMaterial.nombre_mp}</h3>
                                <p className="text-sm text-gray-400 font-mono mt-1 lowercase tracking-tight">{selectedMaterial.sku_mp} • {selectedMaterial.categoria_mp}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-gray-100">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Scrolling Content */}
                        <div className="overflow-y-auto p-8 flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
                                    <p className="text-xs font-black text-gray-400 uppercase mb-3">Stock Disponible</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-4xl font-black text-brand-600">{formatNumber(selectedMaterial.stock_actual, 'produccion')}</p>
                                        <p className="text-sm font-bold text-gray-400">{selectedMaterial.unidad_medida_stock}</p>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500 rounded-full"
                                                style={{ width: `${Math.min((Number(selectedMaterial.stock_actual) / (Number(selectedMaterial.punto_reorden) || 1)) * 50, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">Punto de reorden: {selectedMaterial.punto_reorden}</span>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
                                    <p className="text-xs font-black text-gray-400 uppercase mb-3 text-center">Peso por Unidad</p>
                                    <div className="flex flex-col items-center">
                                        <div className="p-3 bg-blue-50 rounded-2xl mb-2">
                                            <ArrowDownCircle className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="text-2xl font-black text-gray-900">
                                            {formatUnit(calculateMaterialWeight(selectedMaterial) / (Number(selectedMaterial.stock_actual) || 1), 'peso')}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
                                    <p className="text-xs font-black text-gray-400 uppercase mb-3">Especificaciones</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Espesor:</span>
                                            <span className="text-xs font-bold font-mono">{selectedMaterial.espesor} mm</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Medidas:</span>
                                            <span className="text-xs font-bold font-mono">{selectedMaterial.ancho} x {selectedMaterial.largo} mm</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Densidad:</span>
                                            <span className="text-xs font-bold font-mono">{selectedMaterial.densidad} g/cm³</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Movement History */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <History className="w-6 h-6 text-brand-600" /> Historial de Movimientos
                                    </h4>
                                    <button className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 transition">
                                        <Download className="w-4 h-4" /> Exportar Registro
                                    </button>
                                </div>

                                {loadingMovements ? (
                                    <div className="flex flex-col items-center py-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-200" />
                                        <p className="text-sm font-medium text-gray-400 mt-2">Sincronizando registros...</p>
                                    </div>
                                ) : movements.length > 0 ? (
                                    <div className="space-y-4">
                                        {movements.map((mov) => (
                                            <div key={mov.id} className="group bg-white border border-gray-50 rounded-[2rem] p-5 hover:border-brand-100 hover:shadow-xl hover:shadow-brand-50/20 transition-all duration-300">
                                                <div className="flex items-start gap-4">
                                                    <div className={clsx(
                                                        "p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110 duration-300",
                                                        mov.tipo_movimiento === 'Ingreso Compra' ? "bg-green-50 text-green-600" :
                                                            mov.tipo_movimiento === 'Consumo OT' ? "bg-red-50 text-red-600" :
                                                                "bg-gray-50 text-gray-600"
                                                    )}>
                                                        {mov.tipo_movimiento === 'Ingreso Compra' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-black text-gray-900 uppercase text-sm tracking-tight">{mov.tipo_movimiento}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                                                                    {new Date(mov.fecha_hora).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={clsx(
                                                                    "text-xl font-black",
                                                                    mov.tipo_movimiento === 'Ingreso Compra' ? "text-green-600" : "text-red-600"
                                                                )}>
                                                                    {mov.tipo_movimiento === 'Ingreso Compra' ? '+' : '-'}{mov.cantidad}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedMaterial.unidad_medida_stock}</p>

                                                                {mov.tipo_movimiento === 'Consumo OT' && (
                                                                    <button
                                                                        onClick={() => handleReverseMovement(mov.id)}
                                                                        className="mt-2 p-1.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition flex items-center gap-1 text-[10px] font-black uppercase w-fit ml-auto shadow-sm"
                                                                        title="Devolver al stock"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" /> Devolver
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-4">
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                                <FileText className="w-3.5 h-3.5" />
                                                                Ref: <span className="text-gray-900 font-bold">{mov.referencia_id || 'S/N'}</span>
                                                            </div>
                                                            {mov.cliente && (
                                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium font-bold">
                                                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
                                                                    Cliente: <span className="text-brand-600">{mov.cliente.nombre}</span>
                                                                </div>
                                                            )}
                                                            {mov.imagen_remision_url && (
                                                                <a
                                                                    href={mov.imagen_remision_url.startsWith('http') ? mov.imagen_remision_url : `${BASE_URL}${mov.imagen_remision_url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-xs text-brand-600 font-bold hover:underline"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Ver Remisión
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 font-bold">No hay movimientos registrados para este material.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-8 py-3 bg-white text-gray-900 font-black rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-100 transition active:scale-95"
                            >
                                CERRAR FICHA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

