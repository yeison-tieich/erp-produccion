import React, { useEffect, useState } from 'react';
import {
    Layers, Plus, Search, Trash2, Edit2, CheckCircle2,
    FileText, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAssetUrl } from '../../api';
import { qualityService, ControlPlan, ControlCharacteristic } from '../../services/qualityService';

export const ControlPlansPage = () => {
    const [plans, setPlans] = useState<ControlPlan[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

    // Form
    const [formProductId, setFormProductId] = useState('');
    const [formCodigo, setFormCodigo] = useState('');
    const [formNombre, setFormNombre] = useState('');
    const [formVersion, setFormVersion] = useState('1.0');
    const [formNotas, setFormNotas] = useState('');
    const [characteristics, setCharacteristics] = useState<ControlCharacteristic[]>([
        {
            secuencia: 10,
            caracteristica: 'Diámetro exterior',
            cota_nominal: 25.00,
            tolerancia_min: -0.02,
            tolerancia_max: 0.02,
            unidad: 'mm',
            instrumento: 'Micrómetro',
            metodo_medicion: '3 puntos a 120°',
            frecuencia: '100%',
            criterio_aceptacion: '±0.02',
            es_critica: true
        }
    ]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const data = await qualityService.getControlPlans();
            setPlans(data);
        } catch (error) {
            console.error('Error fetching control plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setProducts(res.data || []);
        } catch (e) {
            console.error('Error fetching products:', e);
        }
    };

    useEffect(() => {
        fetchPlans();
        fetchProducts();
    }, []);

    const handleOpenCreate = () => {
        setEditingPlanId(null);
        setFormProductId('');
        setFormCodigo(`PC-${Date.now().toString().slice(-6)}`);
        setFormNombre('');
        setFormVersion('1.0');
        setFormNotas('');
        setCharacteristics([
            {
                secuencia: 10,
                caracteristica: 'Diámetro exterior',
                cota_nominal: 25.00,
                tolerancia_min: -0.02,
                tolerancia_max: 0.02,
                unidad: 'mm',
                instrumento: 'Micrómetro',
                frecuencia: '100%',
                criterio_aceptacion: '±0.02',
                es_critica: true
            }
        ]);
        setShowModal(true);
    };

    const handleOpenEdit = (plan: ControlPlan) => {
        setEditingPlanId(plan.id);
        setFormProductId(plan.producto_id.toString());
        setFormCodigo(plan.codigo);
        setFormNombre(plan.nombre);
        setFormVersion(plan.version);
        setFormNotas(plan.notas || '');
        setCharacteristics(plan.caracteristicas || []);
        setShowModal(true);
    };

    const addCharacteristicRow = () => {
        setCharacteristics([
            ...characteristics,
            {
                secuencia: (characteristics.length + 1) * 10,
                caracteristica: '',
                cota_nominal: 0,
                tolerancia_min: 0,
                tolerancia_max: 0,
                unidad: 'mm',
                instrumento: 'Calibrador',
                frecuencia: '100%',
                criterio_aceptacion: '',
                es_critica: false
            }
        ]);
    };

    const removeCharacteristicRow = (index: number) => {
        setCharacteristics(characteristics.filter((_, i) => i !== index));
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                producto_id: Number(formProductId),
                codigo: formCodigo,
                nombre: formNombre,
                version: formVersion,
                notas: formNotas,
                caracteristicas: characteristics
            };

            if (editingPlanId) {
                await qualityService.updateControlPlan(editingPlanId, payload);
            } else {
                await qualityService.createControlPlan(payload);
            }
            setShowModal(false);
            fetchPlans();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar plan de control');
        }
    };

    const handleDeletePlan = async (id: number) => {
        if (!window.confirm('¿Eliminar este plan de control?')) return;
        try {
            await qualityService.deleteControlPlan(id);
            fetchPlans();
        } catch (error: any) {
            alert('Error al eliminar');
        }
    };

    const filtered = plans.filter(p =>
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.producto?.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Layers className="w-6 h-6 text-brand-600" />
                        Planes de Control de Producto
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Definición de cotas nominales, límites de tolerancia, instrumentos de medición y criterios de aceptación.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Plan de Control
                </button>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel p-3.5 rounded-2xl flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre o producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(plan => (
                    <div key={plan.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">{plan.codigo} v{plan.version}</span>
                                    <h3 className="font-bold text-sm text-slate-900 leading-tight mt-0.5">{plan.nombre}</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(plan)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5"
                                        title="Editar plan"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePlan(plan.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-black/5"
                                        title="Eliminar plan"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs mb-3">
                                <div className="text-[11px] text-slate-500">Producto Asignado:</div>
                                <div className="font-bold text-slate-800">{plan.producto?.nombre_producto}</div>
                                <div className="text-[10px] text-slate-400">SKU: {plan.producto?.sku_producto}</div>
                            </div>

                            {/* Characteristics Summary */}
                            <div className="space-y-1 text-xs">
                                <div className="font-bold text-[11px] text-slate-700 flex items-center justify-between">
                                    <span>Cotas Críticas & Mediciones ({plan.caracteristicas?.length || 0}):</span>
                                </div>
                                <div className="divide-y divide-black/5 max-h-40 overflow-y-auto pr-1">
                                    {plan.caracteristicas?.map((c, i) => (
                                        <div key={i} className="py-1.5 flex items-center justify-between text-[11px]">
                                            <span className="font-medium text-slate-700 truncate mr-2">
                                                {c.es_critica && <span className="text-rose-600 font-bold mr-1">★</span>}
                                                {c.caracteristica}
                                            </span>
                                            <span className="font-mono text-slate-500 whitespace-nowrap">
                                                {c.cota_nominal !== null ? `${c.cota_nominal} ${c.unidad}` : ''}
                                                {c.tolerancia_min !== null && ` [${c.tolerancia_min}, +${c.tolerancia_max}]`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {plan.producto?.plano_pdf_url && (
                            <a
                                href={getAssetUrl(plan.producto.plano_pdf_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" /> Ver Plano Técnico PDF
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-brand-600" />
                                {editingPlanId ? 'Editar Plan de Control' : 'Nuevo Plan de Control de Producto'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4 mt-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Producto Asociado *</label>
                                    <select
                                        value={formProductId}
                                        onChange={(e) => setFormProductId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                        required
                                    >
                                        <option value="">Seleccionar Producto...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.sku_producto} - {p.nombre_producto}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Código del Plan *</label>
                                    <input
                                        type="text"
                                        value={formCodigo}
                                        onChange={(e) => setFormCodigo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Versión *</label>
                                    <input
                                        type="text"
                                        value={formVersion}
                                        onChange={(e) => setFormVersion(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Nombre del Plan *</label>
                                <input
                                    type="text"
                                    value={formNombre}
                                    onChange={(e) => setFormNombre(e.target.value)}
                                    placeholder="Ej. Plan de Control Dimensional y Acabado para Eje X"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            {/* Characteristics Grid Table */}
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Cotas, Tolerancias e Instrumentos de Medición
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addCharacteristicRow}
                                        className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Agregar Fila
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {characteristics.map((c, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                                            <div className="sm:col-span-2">
                                                <span className="text-[10px] text-slate-500 block">Característica:</span>
                                                <input
                                                    type="text"
                                                    value={c.caracteristica}
                                                    onChange={(e) => {
                                                        const copy = [...characteristics];
                                                        copy[idx].caracteristica = e.target.value;
                                                        setCharacteristics(copy);
                                                    }}
                                                    placeholder="Diámetro / Longitud"
                                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">Nominal:</span>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={c.cota_nominal !== undefined && c.cota_nominal !== null ? c.cota_nominal : ''}
                                                    onChange={(e) => {
                                                        const copy = [...characteristics];
                                                        copy[idx].cota_nominal = e.target.value ? Number(e.target.value) : 0;
                                                        setCharacteristics(copy);
                                                    }}
                                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">Tol Mín / Máx:</span>
                                                <div className="flex gap-1">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={c.tolerancia_min !== undefined && c.tolerancia_min !== null ? c.tolerancia_min : ''}
                                                        onChange={(e) => {
                                                            const copy = [...characteristics];
                                                            copy[idx].tolerancia_min = e.target.value ? Number(e.target.value) : 0;
                                                            setCharacteristics(copy);
                                                        }}
                                                        placeholder="Mín"
                                                        className="w-1/2 px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={c.tolerancia_max !== undefined && c.tolerancia_max !== null ? c.tolerancia_max : ''}
                                                        onChange={(e) => {
                                                            const copy = [...characteristics];
                                                            copy[idx].tolerancia_max = e.target.value ? Number(e.target.value) : 0;
                                                            setCharacteristics(copy);
                                                        }}
                                                        placeholder="Máx"
                                                        className="w-1/2 px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">Instrumento:</span>
                                                <input
                                                    type="text"
                                                    value={c.instrumento}
                                                    onChange={(e) => {
                                                        const copy = [...characteristics];
                                                        copy[idx].instrumento = e.target.value;
                                                        setCharacteristics(copy);
                                                    }}
                                                    placeholder="Micrómetro"
                                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between pt-3 sm:pt-0">
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={c.es_critica}
                                                        onChange={(e) => {
                                                            const copy = [...characteristics];
                                                            copy[idx].es_critica = e.target.checked;
                                                            setCharacteristics(copy);
                                                        }}
                                                        className="rounded text-brand-600"
                                                    />
                                                    <span className="text-[10px] font-bold text-rose-600">Crítica</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCharacteristicRow(idx)}
                                                    className="text-slate-400 hover:text-rose-600"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm"
                                >
                                    {editingPlanId ? 'Actualizar Plan' : 'Crear Plan de Control'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
