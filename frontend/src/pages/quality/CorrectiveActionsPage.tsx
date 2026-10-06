import React, { useEffect, useState } from 'react';
import {
    FileCheck, Plus, Search, Filter, CheckCircle2,
    XCircle, Clock, AlertTriangle, RefreshCw, Calendar, User, Eye
} from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';
import { API_URL } from '../../api';
import { qualityService, CorrectiveAction, NonConformance } from '../../services/qualityService';

export const CorrectiveActionsPage = () => {
    const [actions, setActions] = useState<CorrectiveAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);

    // Form: Create CAPA
    const [ncs, setNcs] = useState<NonConformance[]>([]);
    const [personalList, setPersonalList] = useState<any[]>([]);

    const [formNCId, setFormNCId] = useState('');
    const [formTipo, setFormTipo] = useState<'CORRECTIVA' | 'PREVENTIVA' | 'MEJORA'>('CORRECTIVA');
    const [formTitulo, setFormTitulo] = useState('');
    const [formProblema, setFormProblema] = useState('');
    const [formCausaRaiz, setFormCausaRaiz] = useState('');
    const [formAccion, setFormAccion] = useState('');
    const [formPersonalId, setFormPersonalId] = useState('');
    const [formFechaLimite, setFormFechaLimite] = useState('');

    // Form: Verification
    const [verifyEficaz, setVerifyEficaz] = useState(true);
    const [verifyObservaciones, setVerifyObservaciones] = useState('');

    const fetchActions = async () => {
        try {
            setLoading(true);
            const data = await qualityService.getCorrectiveActions();
            setActions(data);
        } catch (error) {
            console.error('Error fetching CAPA:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [ncsRes, persRes] = await Promise.all([
                qualityService.getNonConformances(),
                axios.get(`${API_URL}/personal`)
            ]);
            setNcs(ncsRes || []);
            setPersonalList(persRes.data || []);
        } catch (e) {
            console.error('Error fetching catalogs:', e);
        }
    };

    useEffect(() => {
        fetchActions();
        fetchCatalogs();
    }, []);

    const handleNCSelect = (ncIdStr: string) => {
        setFormNCId(ncIdStr);
        const nc = ncs.find(n => n.id === Number(ncIdStr));
        if (nc) {
            setFormProblema(nc.descripcion);
            if (nc.analisisCausa?.causa_raiz) {
                setFormCausaRaiz(nc.analisisCausa.causa_raiz);
            }
            setFormTitulo(`Acción Correctiva para ${nc.codigo}`);
        }
    };

    const handleCreateCAPA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await qualityService.createCorrectiveAction({
                no_conformidad_id: formNCId ? Number(formNCId) : undefined,
                tipo: formTipo,
                titulo: formTitulo,
                descripcion_problema: formProblema,
                causa_raiz: formCausaRaiz,
                accion_propuesta: formAccion,
                personal_id: formPersonalId ? Number(formPersonalId) : undefined,
                fecha_limite: formFechaLimite
            });
            setShowCreateModal(false);
            fetchActions();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al registrar acción correctiva');
        }
    };

    const handleVerifyCAPA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAction) return;
        try {
            await qualityService.updateCorrectiveAction(selectedAction.id, {
                estado: verifyEficaz ? 'EFICAZ' : 'NO_EFICAZ',
                fecha_verificacion: new Date().toISOString(),
                eficacia_evaluada: verifyEficaz,
                observaciones_verificacion: verifyObservaciones
            });
            setShowVerifyModal(false);
            fetchActions();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al verificar acción correctiva');
        }
    };

    const filtered = actions.filter(a => {
        const matchesSearch =
            a.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.accion_propuesta.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'TODOS' || a.estado === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileCheck className="w-6 h-6 text-blue-600" />
                        Acciones Correctivas y Mejora (CAPA)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Gestión del ciclo completo: Causa Raíz → Acción Implementada → Verificación de Eficacia ISO 9001.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Acción Correctiva
                </button>
            </div>

            {/* Filters Bar */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por código, título o acción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl bg-white/70 border border-black/5 font-medium text-slate-700"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="ABIERTA">Abierta</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="PENDIENTE_VERIFICACION">Pendiente Verificación</option>
                        <option value="EFICAZ">Eficaz (Cerrada)</option>
                        <option value="NO_EFICAZ">No Eficaz</option>
                    </select>
                </div>
            </div>

            {/* Actions Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/5 text-slate-600 font-bold border-b border-black/5">
                            <tr>
                                <th className="p-3.5">Código</th>
                                <th className="p-3.5">Tipo</th>
                                <th className="p-3.5">Título / Problema</th>
                                <th className="p-3.5">Acción Propuesta</th>
                                <th className="p-3.5">Responsable</th>
                                <th className="p-3.5">Fecha Límite</th>
                                <th className="p-3.5">Estado</th>
                                <th className="p-3.5 text-right">Verificación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        No hay acciones correctivas registradas.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(a => (
                                    <tr key={a.id} className="hover:bg-white/40 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-900">{a.codigo}</td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                {a.tipo}
                                            </span>
                                        </td>
                                        <td className="p-3.5 max-w-[220px]">
                                            <div className="font-bold text-slate-900 truncate">{a.titulo}</div>
                                            {a.noConformidad && (
                                                <div className="text-[10px] text-amber-700 font-semibold">
                                                    Origen: {a.noConformidad.codigo}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5 max-w-[250px] truncate" title={a.accion_propuesta}>
                                            {a.accion_propuesta}
                                        </td>
                                        <td className="p-3.5 text-slate-700 font-medium">
                                            {a.responsable?.nombre || 'No asignado'}
                                        </td>
                                        <td className="p-3.5 text-slate-500">
                                            {new Date(a.fecha_limite).toLocaleDateString()}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit",
                                                a.estado === 'ABIERTA' && "bg-amber-100 text-amber-800",
                                                a.estado === 'EN_PROCESO' && "bg-blue-100 text-blue-800",
                                                a.estado === 'PENDIENTE_VERIFICACION' && "bg-purple-100 text-purple-800",
                                                a.estado === 'EFICAZ' && "bg-emerald-100 text-emerald-800 border border-emerald-300",
                                                a.estado === 'NO_EFICAZ' && "bg-rose-100 text-rose-800"
                                            )}>
                                                {a.estado === 'EFICAZ' && <CheckCircle2 className="w-3 h-3" />}
                                                {a.estado === 'NO_EFICAZ' && <XCircle className="w-3 h-3" />}
                                                {a.estado}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            {a.estado !== 'EFICAZ' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedAction(a);
                                                        setVerifyObservaciones(a.observaciones_verificacion || '');
                                                        setShowVerifyModal(true);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200"
                                                >
                                                    Evaluar Eficacia
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE CAPA MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-blue-600" />
                                Nueva Acción Correctiva / Preventiva (CAPA)
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateCAPA} className="space-y-4 mt-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Vincular a No Conformidad</label>
                                    <select
                                        value={formNCId}
                                        onChange={(e) => handleNCSelect(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="">Sin vincular (Acción independiente)...</option>
                                        {ncs.map(n => (
                                            <option key={n.id} value={n.id}>{n.codigo} - {n.descripcion.slice(0, 40)}...</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Tipo de Acción *</label>
                                    <select
                                        value={formTipo}
                                        onChange={(e: any) => setFormTipo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="CORRECTIVA">Acción Correctiva (Eliminar causa raíz)</option>
                                        <option value="PREVENTIVA">Acción Preventiva (Evitar potencial no conformidad)</option>
                                        <option value="MEJORA">Acción de Mejora Continua</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Título de la Acción *</label>
                                <input
                                    type="text"
                                    value={formTitulo}
                                    onChange={(e) => setFormTitulo(e.target.value)}
                                    placeholder="Ej. Protocolo de cambio y calibración de insertos Torno CNC"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Problema Encontrado *</label>
                                    <textarea
                                        value={formProblema}
                                        onChange={(e) => setFormProblema(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Causa Raíz Identificada</label>
                                    <textarea
                                        value={formCausaRaiz}
                                        onChange={(e) => setFormCausaRaiz(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Plan de Acción / Medida de Fondo *</label>
                                <textarea
                                    value={formAccion}
                                    onChange={(e) => setFormAccion(e.target.value)}
                                    rows={3}
                                    placeholder="Específica la acción concreta que se implementará para que el problema no vuelva a ocurrir..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Responsable de Ejecución *</label>
                                    <select
                                        value={formPersonalId}
                                        onChange={(e) => setFormPersonalId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                        required
                                    >
                                        <option value="">Seleccionar personal...</option>
                                        {personalList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre} ({p.cargo})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Fecha Límite de Implementación *</label>
                                    <input
                                        type="date"
                                        value={formFechaLimite}
                                        onChange={(e) => setFormFechaLimite(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                                >
                                    Crear Acción Correctiva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VERIFY CAPA MODAL */}
            {showVerifyModal && selectedAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Verificación de Eficacia ISO 9001 ({selectedAction.codigo})
                            </h3>
                            <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleVerifyCAPA} className="space-y-4 mt-4 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="font-bold text-slate-900">{selectedAction.titulo}</div>
                                <div className="text-slate-600 mt-1">{selectedAction.accion_propuesta}</div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-2">Resultado de la Evaluación de Eficacia: *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setVerifyEficaz(true)}
                                        className={clsx(
                                            "p-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all",
                                            verifyEficaz
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400"
                                                : "bg-white text-slate-600 border-slate-200"
                                        )}
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> EFICAZ (Cierre Exitoso)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVerifyEficaz(false)}
                                        className={clsx(
                                            "p-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all",
                                            !verifyEficaz
                                                ? "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400"
                                                : "bg-white text-slate-600 border-slate-200"
                                        )}
                                    >
                                        <XCircle className="w-4 h-4 text-rose-600" /> NO EFICAZ (Reabrir)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Evidencia y Observaciones de Verificación: *</label>
                                <textarea
                                    value={verifyObservaciones}
                                    onChange={(e) => setVerifyObservaciones(e.target.value)}
                                    rows={3}
                                    placeholder="Detalla cómo se comprobó que el defecto no volvió a manifestarse en producción..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => setShowVerifyModal(false)}
                                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                                >
                                    Registrar Verificación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
