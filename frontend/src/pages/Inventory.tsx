
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Plus, Search, AlertCircle, ArrowUpCircle, Edit3, X } from 'lucide-react';

interface Material {
    id: number;
    sku_mp: string;
    nombre_mp: string;
    categoria_mp: string;
    stock_actual: number;
    stock_reservado: number;
    punto_reorden: number;
    unidad_medida_stock: string;
}

export const Inventory = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // States for Add Stock Modal
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [addAmount, setAddAmount] = useState('');
    const [refId, setRefId] = useState('');

    // Edit Material States
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        nombre_mp: '',
        categoria_mp: '',
        unidad_medida_stock: '',
        punto_reorden: ''
    });

    const fetchInventory = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/inventory');
            setMaterials(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) return;

        try {
            await axios.post(`http://localhost:3000/api/inventory/${selectedMaterial.id}/add-stock`, {
                cantidad: Number(addAmount),
                referencia_id: refId
            });
            setShowAddModal(false);
            setAddAmount('');
            setRefId('');
            fetchInventory();
        } catch (error) {
            alert('Error al agregar stock');
        }
    };

    const handleEditMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) return;
        try {
            await axios.put(`http://localhost:3000/api/inventory/${selectedMaterial.id}`, editData);
            setShowEditModal(false);
            fetchInventory();
            alert('Material actualizado con éxito');
        } catch (error) {
            alert('Error actualizando material');
        }
    };

    const openEditModal = (material: Material) => {
        setSelectedMaterial(material);
        setEditData({
            nombre_mp: material.nombre_mp,
            categoria_mp: material.categoria_mp,
            unidad_medida_stock: material.unidad_medida_stock,
            punto_reorden: material.punto_reorden.toString()
        });
        setShowEditModal(true);
    };

    const filteredMaterials = materials.filter(m =>
        m.nombre_mp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sku_mp.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Inventario Materia Prima</h1>
                <button
                    onClick={() => alert("Función para crear nuevo material (Admin)")} // Placeholder for Create Material
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition"
                >
                    <Plus className="w-4 h-4" /> Nuevo Material
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Material</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4 text-center">Disponible</th>
                                <th className="px-6 py-4 text-center">Reservado</th>
                                <th className="px-6 py-4 text-center">Total</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredMaterials.map((material) => {
                                const disponible = Number(material.stock_actual) - Number(material.stock_reservado);
                                const isLow = Number(material.stock_actual) <= Number(material.punto_reorden);

                                return (
                                    <tr key={material.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium">{material.sku_mp}</td>
                                        <td className="px-6 py-4 truncate max-w-xs">{material.nombre_mp}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{material.categoria_mp}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-800">{disponible}</td>
                                        <td className="px-6 py-4 text-center text-orange-600">{material.stock_reservado}</td>
                                        <td className="px-6 py-4 text-center">{material.stock_actual} {material.unidad_medida_stock}</td>
                                        <td className="px-6 py-4">
                                            {isLow ? (
                                                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                                                    <AlertCircle className="w-3 h-3" /> Bajo Stock
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setSelectedMaterial(material); setShowAddModal(true); }}
                                                    className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 p-2 rounded-full transition"
                                                    title="Ingresar Stock"
                                                >
                                                    <ArrowUpCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(material)}
                                                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
                                                    title="Editar Material"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredMaterials.length === 0 && (
                        <div className="p-8 text-center text-gray-400">No se encontraron materiales.</div>
                    )}
                </div>
            </div>

            {/* Add Stock Modal */}
            {showAddModal && selectedMaterial && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Ingresar Stock: {selectedMaterial.nombre_mp}</h3>
                        <form onSubmit={handleAddStock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cantidad a Ingresar</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={addAmount}
                                    onChange={e => setAddAmount(e.target.value)}
                                    required
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Referencia (Orden Compra / Factura)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={refId}
                                    onChange={e => setRefId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                                >
                                    Confirmar Ingreso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {showEditModal && selectedMaterial && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Editar Material</h3>
                            <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleEditMaterial} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Material</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={editData.nombre_mp}
                                    onChange={e => setEditData({ ...editData, nombre_mp: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoría</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={editData.categoria_mp}
                                    onChange={e => setEditData({ ...editData, categoria_mp: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Unidad Medida</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={editData.unidad_medida_stock}
                                        onChange={e => setEditData({ ...editData, unidad_medida_stock: e.target.value })}
                                        placeholder="Kg, Und, etc"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Punto Reorden</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={editData.punto_reorden}
                                        onChange={e => setEditData({ ...editData, punto_reorden: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
