import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, Plus, Search, Filter, FileText, CheckCircle2,
    XCircle, Clock, ExternalLink, RefreshCw, Eye, AlertTriangle,
    Download, ArrowRight, Layers
} from 'lucide-react';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { API_URL, getAssetUrl } from '../../api';
import { qualityService, Inspection, ControlPlan } from '../../services/qualityService';

export const InspectionsPage = () => {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('TODOS');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Form states
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [personalList, setPersonalList] = useState<any[]>([]);
    const [controlPlans, setControlPlans] = useState<ControlPlan[]>([]);

    const [formTipo, setFormTipo] = useState<'RECEPCION' | 'EN_PROCESO' | 'FINAL' | 'DESPACHO' | 'ESPECIAL'>('FINAL');
    const [formOTId, setFormOTId] = useState<string>('');
    const [formProductId, setFormProductId] = useState<string>('');
    const [formSupplierId, setFormSupplierId] = useState<string>('');
    const [formClientId, setFormClientId] = useState<string>('');
    const [formInspectorId, setFormInspectorId] = useState<string>('');
    const [formOperarioId, setFormOperarioId] = useState<string>('');
    const [formLote, setFormLote] = useState<string>('');
    const [formCantidadInspeccionada, setFormCantidadInspeccionada] = useState<number>(1);
    const [formObservaciones, setFormObservaciones] = useState<string>('');

    // Dynamic measurements in the form
    const [measurements, setMeasurements] = useState<Array<{
        caracteristica_id?: number;
        nombre_caracteristica: string;
        cota_nominal?: number;
        tolerancia_min?: number;
        tolerancia_max?: number;
        instrumento?: string;
        valores_input: string; // e.g. "24.99, 25.01, 25.00"
        promedio?: number;
        minimo?: number;
        maximo?: number;
        rango?: number;
        desviacion?: number;
        cumple: boolean;
    }>>([]);

    const fetchInspections = async () => {
        try {
            setLoading(true);
            const data = await qualityService.getInspections();
            setInspections(data);
        } catch (error) {
            console.error('Error fetching inspections:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedData = async () => {
        try {
            const [ordersRes, prodsRes, suppRes, persRes, plansRes] = await Promise.all([
                axios.get(`${API_URL}/orders`),
                axios.get(`${API_URL}/products`),
                qualityService.getSuppliers(),
                axios.get(`${API_URL}/personal`),
                qualityService.getControlPlans()
            ]);
            setOrders(ordersRes.data || []);
            setProducts(prodsRes.data || []);
            setSuppliers(suppRes || []);
            setPersonalList(persRes.data || []);
            setControlPlans(plansRes || []);
        } catch (e) {
            console.error('Error fetching related data:', e);
        }
    };

    useEffect(() => {
        fetchInspections();
        fetchRelatedData();
    }, []);

    // When an OT is selected in create modal, auto-fill Product, Client, and load its Control Plan
    const handleOTChange = (otIdStr: string) => {
        setFormOTId(otIdStr);
        if (!otIdStr) return;

        const order = orders.find(o => o.id === Number(otIdStr));
        if (order) {
            if (order.producto_id) {
                setFormProductId(order.producto_id.toString());
                loadControlPlanForProduct(order.producto_id);
            }
            if (order.producto?.cliente_id) {
                setFormClientId(order.producto.cliente_id.toString());
            }
            if (order.cantidad_fabricar) {
                setFormCantidadInspeccionada(order.cantidad_fabricar);
            }
        }
    };

    const handleProductChange = (prodIdStr: string) => {
        setFormProductId(prodIdStr);
        if (prodIdStr) {
            loadControlPlanForProduct(Number(prodIdStr));
        } else {
            setMeasurements([]);
        }
    };

    const loadControlPlanForProduct = (prodId: number) => {
        const plan = controlPlans.find(p => p.producto_id === prodId && p.activo);
        if (plan && plan.caracteristicas && plan.caracteristicas.length > 0) {
            setMeasurements(plan.caracteristicas.map(c => ({
                caracteristica_id: c.id,
                nombre_caracteristica: c.caracteristica,
                cota_nominal: c.cota_nominal !== null && c.cota_nominal !== undefined ? Number(c.cota_nominal) : undefined,
                tolerancia_min: c.tolerancia_min !== null && c.tolerancia_min !== undefined ? Number(c.tolerancia_min) : undefined,
                tolerancia_max: c.tolerancia_max !== null && c.tolerancia_max !== undefined ? Number(c.tolerancia_max) : undefined,
                instrumento: c.instrumento,
                valores_input: c.cota_nominal !== null && c.cota_nominal !== undefined ? `${c.cota_nominal}` : '',
                promedio: c.cota_nominal !== null && c.cota_nominal !== undefined ? Number(c.cota_nominal) : undefined,
                cumple: true
            })));
        } else {
            // Default blank characteristic
            setMeasurements([{
                nombre_caracteristica: 'Cota Principal',
                valores_input: '',
                cumple: true
            }]);
        }
    };

    // Recalculate stats when values change
    const handleValueChange = (index: number, valStr: string) => {
        const updated = [...measurements];
        const m = updated[index];
        m.valores_input = valStr;

        const numbers = valStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            const min = Math.min(...numbers);
            const max = Math.max(...numbers);
            const sum = numbers.reduce((a, b) => a + b, 0);
            const avg = Number((sum / numbers.length).toFixed(4));
            m.minimo = min;
            m.maximo = max;
            m.rango = max - min;
            m.promedio = avg;

            if (numbers.length > 1) {
                const variance = numbers.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (numbers.length - 1);
                m.desviacion = Number(Math.sqrt(variance).toFixed(4));
            } else {
                m.desviacion = 0;
            }

            // Check tolerance
            if (m.cota_nominal !== undefined) {
                const lower = m.tolerancia_min !== undefined ? m.cota_nominal + m.tolerancia_min : m.cota_nominal;
                const upper = m.tolerancia_max !== undefined ? m.cota_nominal + m.tolerancia_max : m.cota_nominal;
                m.cumple = numbers.every(val => val >= lower - 0.0001 && val <= upper + 0.0001);
            } else {
                m.cumple = true;
            }
        }
        setMeasurements(updated);
    };

    const addManualCharacteristic = () => {
        setMeasurements([
            ...measurements,
            {
                nombre_caracteristica: `Cota ${measurements.length + 1}`,
                valores_input: '',
                cumple: true
            }
        ]);
    };

    const removeCharacteristic = (index: number) => {
        setMeasurements(measurements.filter((_, i) => i !== index));
    };

    const handleSaveInspection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                tipo: formTipo,
                orden_trabajo_id: formOTId ? Number(formOTId) : undefined,
                producto_id: formProductId ? Number(formProductId) : undefined,
                proveedor_id: formSupplierId ? Number(formSupplierId) : undefined,
                cliente_id: formClientId ? Number(formClientId) : undefined,
                personal_id: formInspectorId ? Number(formInspectorId) : undefined,
                operario_id: formOperarioId ? Number(formOperarioId) : undefined,
                lote: formLote || undefined,
                cantidad_inspeccionada: Number(formCantidadInspeccionada || 1),
                observaciones: formObservaciones,
                mediciones: measurements.map(m => ({
                    caracteristica_id: m.caracteristica_id,
                    nombre_caracteristica: m.nombre_caracteristica,
                    cota_nominal: m.cota_nominal,
                    tolerancia_min: m.tolerancia_min,
                    tolerancia_max: m.tolerancia_max,
                    instrumento: m.instrumento,
                    valores_medidos: m.valores_input.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
                }))
            };

            await qualityService.createInspection(payload);
            setShowCreateModal(false);
            fetchInspections();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar inspección');
        }
    };



    // PDF Report Generator
    const generateInspectionPDF = (insp: Inspection) => {
        const doc = new jsPDF();


        // Header
        doc.setFillColor(250, 204, 21); // brand-400
        doc.rect(0, 0, 210, 22, 'F');
        doc.setTextColor(66, 32, 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ERP MECAYTRO - CERTIFICADO DE INSPECCIÓN DE CALIDAD', 14, 14);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);

        doc.text(`Código Inspección: ${insp.codigo}`, 14, 30);
        doc.text(`Tipo: ${insp.tipo}`, 14, 36);
        doc.text(`Fecha: ${new Date(insp.fecha_inspeccion).toLocaleDateString()}`, 14, 42);
        doc.text(`Inspector: ${insp.inspector?.nombre || 'No registrado'}`, 14, 48);

        doc.text(`Orden de Trabajo: ${insp.ordenTrabajo?.numero_ot || 'N/A'}`, 110, 30);
        doc.text(`Producto: ${insp.producto?.nombre_producto || 'N/A'}`, 110, 36);
        doc.text(`SKU: ${insp.producto?.sku_producto || 'N/A'}`, 110, 42);
        doc.text(`Cliente: ${insp.cliente?.nombre || 'N/A'}`, 110, 48);

        // Result Badge in PDF
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (insp.estado_resultado === 'APROBADO') {
            doc.setTextColor(22, 163, 74);
            doc.text('RESULTADO: APROBADO (CONFORME)', 14, 58);
        } else {
            doc.setTextColor(220, 38, 38);
            doc.text('RESULTADO: RECHAZADO (NO CONFORME)', 14, 58);
        }

        // Table of Measurements
        const tableBody = insp.mediciones.map((m, idx) => [
            (idx + 1).toString(),
            m.nombre_caracteristica,
            m.cota_nominal !== null && m.cota_nominal !== undefined ? `${m.cota_nominal} mm` : 'N/A',
            m.tolerancia_min !== undefined && m.tolerancia_max !== undefined ? `[${m.tolerancia_min}, +${m.tolerancia_max}]` : 'N/A',
            m.promedio !== null && m.promedio !== undefined ? `${m.promedio} mm` : 'N/A',
            m.minimo !== null && m.minimo !== undefined ? `${m.minimo}` : 'N/A',
            m.maximo !== null && m.maximo !== undefined ? `${m.maximo}` : 'N/A',
            m.desviacion !== null && m.desviacion !== undefined ? `${m.desviacion}` : 'N/A',
            m.cumple ? 'CUMPLE' : 'NO CUMPLE'
        ]);

        autoTable(doc, {
            startY: 64,
            head: [['#', 'Característica', 'Nominal', 'Tolerancia', 'Promedio', 'Mín', 'Máx', 'Desv.', 'Veredicto']],
            body: tableBody,
            headStyles: { fillColor: [202, 138, 4] },
            styles: { fontSize: 8 }
        });

        // Observations and Signatures
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(`Observaciones: ${insp.observaciones || 'Sin observaciones.'}`, 14, finalY);

        doc.line(14, finalY + 30, 80, finalY + 30);
        doc.text('Firma Inspector de Calidad', 14, finalY + 35);

        doc.line(120, finalY + 30, 186, finalY + 30);
        doc.text('Firma Responsable de Producción', 120, finalY + 35);

        doc.save(`Certificado_Inspeccion_${insp.codigo}.pdf`);
    };

    const filtered = inspections.filter(i => {
        const matchesSearch =
            i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.ordenTrabajo?.numero_ot.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.producto?.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'TODOS' || i.tipo === typeFilter;
        const matchesStatus = statusFilter === 'TODOS' || i.estado_resultado === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const selectedProductObj = products.find(p => p.id === Number(formProductId));

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-brand-600" />
                        Inspecciones de Calidad
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Control en recepción, fabricación en proceso, liberación final y despacho.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setMeasurements([]);
                        setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm transition-all self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Registrar Inspección
                </button>
            </div>

            {/* Filters Bar */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por código, OT o producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 font-medium text-slate-700"
                    >
                        <option value="TODOS">Todos los tipos</option>
                        <option value="RECEPCION">Recepción MP</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="FINAL">Final</option>
                        <option value="DESPACHO">Despacho</option>
                        <option value="ESPECIAL">Especial</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 font-medium text-slate-700"
                    >
                        <option value="TODOS">Todos los resultados</option>
                        <option value="APROBADO">Aprobadas</option>
                        <option value="RECHAZADO">Rechazadas</option>
                        <option value="PENDIENTE">Pendientes</option>
                    </select>
                </div>
            </div>

            {/* Inspections Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/5 text-slate-600 font-bold border-b border-black/5">
                            <tr>
                                <th className="p-3.5">Código</th>
                                <th className="p-3.5">Tipo</th>
                                <th className="p-3.5">OT / Producto</th>
                                <th className="p-3.5">Fecha</th>
                                <th className="p-3.5">Inspector</th>
                                <th className="p-3.5 text-center">Cant. Insp.</th>
                                <th className="p-3.5">Resultado</th>
                                <th className="p-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        No se encontraron registros de inspección.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((insp) => (
                                    <tr key={insp.id} className="hover:bg-white/40 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-900">{insp.codigo}</td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {insp.tipo}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            {insp.ordenTrabajo && (
                                                <div className="font-bold text-brand-700">{insp.ordenTrabajo.numero_ot}</div>
                                            )}
                                            <div className="text-slate-600 truncate max-w-[200px]">
                                                {insp.producto?.nombre_producto || 'Sin producto'}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-slate-500">
                                            {new Date(insp.fecha_inspeccion).toLocaleDateString()}
                                        </td>
                                        <td className="p-3.5 font-medium text-slate-700">
                                            {insp.inspector?.nombre || 'N/A'}
                                        </td>
                                        <td className="p-3.5 text-center font-bold text-slate-800">
                                            {insp.cantidad_inspeccionada}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit",
                                                insp.estado_resultado === 'APROBADO' && "bg-emerald-100 text-emerald-800 border border-emerald-300",
                                                insp.estado_resultado === 'RECHAZADO' && "bg-rose-100 text-rose-800 border border-rose-300",
                                                insp.estado_resultado === 'PENDIENTE' && "bg-amber-100 text-amber-800 border border-amber-300"
                                            )}>
                                                {insp.estado_resultado === 'APROBADO' && <CheckCircle2 className="w-3 h-3" />}
                                                {insp.estado_resultado === 'RECHAZADO' && <XCircle className="w-3 h-3" />}
                                                {insp.estado_resultado === 'PENDIENTE' && <Clock className="w-3 h-3" />}
                                                {insp.estado_resultado}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedInspection(insp);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:bg-black/5"
                                                    title="Ver detalle de cotas"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => generateInspectionPDF(insp)}
                                                    className="p-1.5 rounded-lg text-brand-700 hover:bg-brand-50"
                                                    title="Descargar Certificado PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE INSPECTION MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-brand-600" />
                                    Nueva Inspección de Calidad Digital
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Vincula la inspección con la OT o Producto y captura las cotas de muestra.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveInspection} className="space-y-5 mt-4">
                            {/* General Data Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Inspección *</label>
                                    <select
                                        value={formTipo}
                                        onChange={(e: any) => setFormTipo(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                                        required
                                    >
                                        <option value="FINAL">Inspección Final (Liberación OT)</option>
                                        <option value="EN_PROCESO">Inspección en Proceso</option>
                                        <option value="RECEPCION">Recepción de Materia Prima</option>
                                        <option value="DESPACHO">Inspección de Despacho</option>
                                        <option value="ESPECIAL">Inspección Especial / Prototipo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Orden de Trabajo (OT)</label>
                                    <select
                                        value={formOTId}
                                        onChange={(e) => handleOTChange(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="">Seleccionar OT...</option>
                                        {orders.map(o => (
                                            <option key={o.id} value={o.id}>
                                                {o.numero_ot} - {o.producto?.nombre_producto || o.cliente || 'OT'} ({o.estado_calidad || 'Pendiente'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Producto *</label>
                                    <select
                                        value={formProductId}
                                        onChange={(e) => handleProductChange(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                                        required
                                    >
                                        <option value="">Seleccionar producto...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.sku_producto} - {p.nombre_producto}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Inspector Responsable</label>
                                    <select
                                        value={formInspectorId}
                                        onChange={(e) => setFormInspectorId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="">Seleccionar personal...</option>
                                        {personalList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre} ({p.cargo})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cant. Inspeccionada (Muestra) *</label>
                                    <input
                                        type="number"
                                        value={formCantidadInspeccionada}
                                        onChange={(e) => setFormCantidadInspeccionada(Number(e.target.value))}
                                        min="1"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Lote / Colada de Material</label>
                                    <input
                                        type="text"
                                        value={formLote}
                                        onChange={(e) => setFormLote(e.target.value)}
                                        placeholder="Ej. L-4140-02"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    />
                                </div>
                            </div>

                            {/* Planos Reference Banner */}
                            {selectedProductObj?.plano_pdf_url && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <span>Plano de Fabricación asociado al producto disponible:</span>
                                    </div>
                                    <a
                                        href={getAssetUrl(selectedProductObj.plano_pdf_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Abrir Plano PDF
                                    </a>
                                </div>
                            )}

                            {/* Measurements & Characteristics Input Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-brand-600" />
                                        Registro de Cotas y Mediciones Reales
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addManualCharacteristic}
                                        className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Agregar Cota
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {measurements.map((m, idx) => (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 mr-2">
                                                    <input
                                                        type="text"
                                                        value={m.nombre_caracteristica}
                                                        onChange={(e) => {
                                                            const copy = [...measurements];
                                                            copy[idx].nombre_caracteristica = e.target.value;
                                                            setMeasurements(copy);
                                                        }}
                                                        placeholder="Nombre de cota"
                                                        className="font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none"
                                                    />
                                                    <span className="text-slate-400 text-[10px]">({m.instrumento || 'Instrumento'})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded-full font-bold text-[10px]",
                                                        m.cumple ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 font-black"
                                                    )}>
                                                        {m.cumple ? "✓ CONFORME" : "✗ FUERA DE TOLERANCIA"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCharacteristic(idx)}
                                                        className="text-slate-400 hover:text-rose-600 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 block">Cota Nominal:</span>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={m.cota_nominal || ''}
                                                        onChange={(e) => {
                                                            const copy = [...measurements];
                                                            copy[idx].cota_nominal = e.target.value ? Number(e.target.value) : undefined;
                                                            setMeasurements(copy);
                                                        }}
                                                        placeholder="25.00"
                                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 block">Tol. Mín (ej. -0.02):</span>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={m.tolerancia_min || ''}
                                                        onChange={(e) => {
                                                            const copy = [...measurements];
                                                            copy[idx].tolerancia_min = e.target.value ? Number(e.target.value) : undefined;
                                                            setMeasurements(copy);
                                                        }}
                                                        placeholder="-0.02"
                                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 block">Tol. Máx (ej. +0.02):</span>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={m.tolerancia_max || ''}
                                                        onChange={(e) => {
                                                            const copy = [...measurements];
                                                            copy[idx].tolerancia_max = e.target.value ? Number(e.target.value) : undefined;
                                                            setMeasurements(copy);
                                                        }}
                                                        placeholder="+0.02"
                                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 block">Valores Medidos (sep. comas):</span>
                                                    <input
                                                        type="text"
                                                        value={m.valores_input}
                                                        onChange={(e) => handleValueChange(idx, e.target.value)}
                                                        placeholder="24.99, 25.01, 25.00"
                                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Calculations Preview Bar */}
                                            {m.promedio !== undefined && (
                                                <div className="flex items-center gap-4 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                                                    <span><strong>Promedio:</strong> {m.promedio} mm</span>
                                                    <span><strong>Mín:</strong> {m.minimo} mm</span>
                                                    <span><strong>Máx:</strong> {m.maximo} mm</span>
                                                    <span><strong>Rango:</strong> {m.rango?.toFixed(3)} mm</span>
                                                    <span><strong>Desv. Est:</strong> {m.desviacion}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observaciones Generales</label>
                                <textarea
                                    value={formObservaciones}
                                    onChange={(e) => setFormObservaciones(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                                    placeholder="Detalles adicionales de la inspección o estado superficial..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm"
                                >
                                    Finalizar y Registrar Inspección
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {showDetailModal && selectedInspection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">
                                    Detalle Inspección {selectedInspection.codigo}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedInspection.producto?.nombre_producto} ({selectedInspection.tipo})
                                </p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-4 my-4">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-slate-500">OT:</span> {selectedInspection.ordenTrabajo?.numero_ot || 'N/A'}</div>
                                <div><span className="text-slate-500">Fecha:</span> {new Date(selectedInspection.fecha_inspeccion).toLocaleDateString()}</div>
                                <div><span className="text-slate-500">Inspector:</span> {selectedInspection.inspector?.nombre || 'N/A'}</div>
                                <div><span className="text-slate-500">Cantidad:</span> {selectedInspection.cantidad_inspeccionada} piezas</div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-xs text-slate-700">Mediciones Registradas</h4>
                                {selectedInspection.mediciones.map((m, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                        <div className="flex items-center justify-between font-bold mb-1">
                                            <span>{m.nombre_caracteristica}</span>
                                            <span className={m.cumple ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                                                {m.cumple ? "CUMPLE" : "NO CUMPLE"}
                                            </span>
                                        </div>
                                        <div className="text-slate-500 text-[11px] grid grid-cols-3 gap-2">
                                            <span>Nominal: {m.cota_nominal || 'N/A'} mm</span>
                                            <span>Promedio: {m.promedio || 'N/A'} mm</span>
                                            <span>Desviación: {m.desviacion || '0'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-black/5">
                            <button
                                onClick={() => generateInspectionPDF(selectedInspection)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-900 bg-brand-400 rounded-xl"
                            >
                                <Download className="w-3.5 h-3.5" /> Descargar Certificado PDF
                            </button>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
