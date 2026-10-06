import React, { useEffect, useState } from 'react';
import {
    ShieldAlert, Plus, Search, CheckCircle2, AlertTriangle,
    FileText, User, Calendar, RefreshCw, Award, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { qualityService, QualityRisk, Audit } from '../../services/qualityService';

export const RisksAndAuditsPage = () => {
    const [activeTab, setActiveTab] = useState<'RISKS' | 'AUDITS'>('RISKS');
    const [risks, setRisks] = useState<QualityRisk[]>([]);
    const [audits, setAudits] = useState<Audit[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [showFindingModal, setShowFindingModal] = useState(false);
    const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

    // Form: Risk
    const [formProceso, setFormProceso] = useState('Producción');
    const [formTipo, setFormTipo] = useState<'RIESGO' | 'OPORTUNIDAD'>('RIESGO');
    const [formDescripcion, setFormDescripcion] = useState('');
    const [formCausa, setFormCausa] = useState('');
    const [formConsecuencia, setFormConsecuencia] = useState('');
    const [formProbabilidad, setFormProbabilidad] = useState(2);
    const [formImpacto, setFormImpacto] = useState(3);
    const [formEstrategia, setFormEstrategia] = useState('Mitigar');
    const [formPlanAccion, setFormPlanAccion] = useState('');

    // Form: Audit
    const [auditTipo, setAuditTipo] = useState('INTERNA');
    const [auditTitulo, setAuditTitulo] = useState('');
    const [auditProceso, setAuditProceso] = useState('Producción y Control de Calidad');
    const [auditLider, setAuditLider] = useState('');
    const [auditFecha, setAuditFecha] = useState('');
    const [auditCriterios, setAuditCriterios] = useState('ISO 9001:2015');

    // Form: Finding
    const [findingTipo, setFindingTipo] = useState('NO_CONFORMIDAD_MENOR');
    const [findingClausula, setFindingClausula] = useState('8.5.1 Control de la producción');
    const [findingDescripcion, setFindingDescripcion] = useState('');
    const [findingEvidencia, setFindingEvidencia] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rData, aData] = await Promise.all([
                qualityService.getRisks(),
                qualityService.getAudits()
            ]);
            setRisks(rData || []);
            setAudits(aData || []);
        } catch (e) {
            console.error('Error fetching risks/audits:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRisk = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await qualityService.createRisk({
                tipo: formTipo,
                proceso: formProceso,
                descripcion: formDescripcion,
                causa: formCausa,
                consecuencia: formConsecuencia,
                probabilidad: Number(formProbabilidad),
                impacto: Number(formImpacto),
                estrategia: formEstrategia,
                plan_accion: formPlanAccion
            });
            setShowRiskModal(false);
            fetchData();
        } catch (error: any) {
            alert('Error al guardar riesgo');
        }
    };

    const handleCreateAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await qualityService.createAudit({
                tipo: auditTipo,
                titulo: auditTitulo,
                proceso_area: auditProceso,
                auditor_lider: auditLider,
                fecha_programada: auditFecha,
                criterios: auditCriterios
            });
            setShowAuditModal(false);
            fetchData();
        } catch (error: any) {
            alert('Error al programar auditoría');
        }
    };

    const handleAddFinding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAuditId) return;
        try {
            await qualityService.addAuditFinding(selectedAuditId, {
                tipo_hallazgo: findingTipo,
                clausula_iso: findingClausula,
                descripcion: findingDescripcion,
                evidencia: findingEvidencia
            });
            setShowFindingModal(false);
            fetchData();
        } catch (error: any) {
            alert('Error al registrar hallazgo');
        }
    };

    const getRiskColor = (level: number) => {
        if (level >= 16) return 'bg-rose-100 text-rose-800 border-rose-300 font-black';
        if (level >= 10) return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
        if (level >= 5) return 'bg-yellow-50 text-yellow-800 border-yellow-300 font-medium';
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    };

    const getRiskLabel = (level: number) => {
        if (level >= 16) return 'Crítico (16-25)';
        if (level >= 10) return 'Alto (10-15)';
        if (level >= 5) return 'Medio (5-9)';
        return 'Bajo (1-4)';
    };

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                        Riesgos, Oportunidades & Auditorías ISO 9001
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Gestión del riesgo operacional (Cláusula 6.1) y evaluación del desempeño mediante auditorías (Cláusula 9.2).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'RISKS' ? (
                        <button
                            onClick={() => setShowRiskModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Riesgo / Oportunidad
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAuditModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Programar Auditoría
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-black/5 pb-2 text-xs">
                <button
                    onClick={() => setActiveTab('RISKS')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold transition-all",
                        activeTab === 'RISKS' ? "bg-amber-100 text-amber-900 shadow-xs" : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    Matriz de Riesgos & Oportunidades ({risks.length})
                </button>
                <button
                    onClick={() => setActiveTab('AUDITS')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold transition-all",
                        activeTab === 'AUDITS' ? "bg-blue-100 text-blue-900 shadow-xs" : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    Auditorías del SGC ({audits.length})
                </button>
            </div>

            {/* TAB CONTENT: RISKS */}
            {activeTab === 'RISKS' && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/5 text-slate-600 font-bold border-b border-black/5">
                                <tr>
                                    <th className="p-3.5">Código</th>
                                    <th className="p-3.5">Tipo</th>
                                    <th className="p-3.5">Proceso</th>
                                    <th className="p-3.5">Descripción del Riesgo</th>
                                    <th className="p-3.5 text-center">Prob (P)</th>
                                    <th className="p-3.5 text-center">Imp (I)</th>
                                    <th className="p-3.5 text-center">Nivel (P×I)</th>
                                    <th className="p-3.5">Estrategia / Plan</th>
                                    <th className="p-3.5">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {risks.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin riesgos registrados</td></tr>
                                ) : (
                                    risks.map(r => (
                                        <tr key={r.id} className="hover:bg-white/40 transition-colors">
                                            <td className="p-3.5 font-bold text-slate-900">{r.codigo}</td>
                                            <td className="p-3.5">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                    r.tipo === 'RIESGO' ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"
                                                )}>
                                                    {r.tipo}
                                                </span>
                                            </td>
                                            <td className="p-3.5 font-semibold text-slate-700">{r.proceso}</td>
                                            <td className="p-3.5 max-w-[220px]">
                                                <div className="font-bold text-slate-900">{r.descripcion}</div>
                                                {r.causa && <div className="text-[10px] text-slate-500">Causa: {r.causa}</div>}
                                            </td>
                                            <td className="p-3.5 text-center font-bold text-slate-700">{r.probabilidad}</td>
                                            <td className="p-3.5 text-center font-bold text-slate-700">{r.impacto}</td>
                                            <td className="p-3.5 text-center">
                                                <span className={clsx("px-2.5 py-1 rounded-full text-[10px] border", getRiskColor(r.nivel_riesgo))}>
                                                    {r.nivel_riesgo} - {getRiskLabel(r.nivel_riesgo)}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-slate-600 max-w-[200px] truncate">
                                                <strong>{r.estrategia}:</strong> {r.plan_accion || 'Pendiente'}
                                            </td>
                                            <td className="p-3.5 font-bold text-slate-700">{r.estado}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: AUDITS */}
            {activeTab === 'AUDITS' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {audits.map(a => (
                            <div key={a.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div>
                                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{a.codigo} ({a.tipo})</span>
                                            <h3 className="font-bold text-sm text-slate-900 mt-0.5">{a.titulo}</h3>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                            {a.estado}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1">
                                        <div>Área: <strong>{a.proceso_area}</strong></div>
                                        <div>Auditor Líder: <strong>{a.auditor_lider}</strong></div>
                                        <div>Fecha Programada: <strong>{new Date(a.fecha_programada).toLocaleDateString()}</strong></div>
                                        <div>Criterios: <strong>{a.criterios || 'ISO 9001:2015'}</strong></div>
                                    </div>

                                    {/* Findings List */}
                                    <div className="mt-3 pt-3 border-t border-black/5">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                            <span>Hallazgos Registrados ({a.hallazgos?.length || 0}):</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedAuditId(a.id);
                                                    setShowFindingModal(true);
                                                }}
                                                className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-bold"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar Hallazgo
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                            {a.hallazgos?.map((h, idx) => (
                                                <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                                    <div className="flex items-center justify-between font-bold text-[11px]">
                                                        <span className={clsx(
                                                            h.tipo_hallazgo.includes('MAYOR') && "text-rose-700",
                                                            h.tipo_hallazgo.includes('MENOR') && "text-amber-700",
                                                            h.tipo_hallazgo.includes('MEJORA') && "text-blue-700"
                                                        )}>
                                                            {h.tipo_hallazgo}
                                                        </span>
                                                        <span className="text-slate-400 text-[10px]">{h.clausula_iso}</span>
                                                    </div>
                                                    <p className="text-slate-600 text-[11px] mt-0.5">{h.descripcion}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CREATE RISK MODAL */}
            {showRiskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                Nuevo Riesgo u Oportunidad ISO 9001
                            </h3>
                            <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateRisk} className="space-y-4 mt-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Tipo *</label>
                                    <select
                                        value={formTipo}
                                        onChange={(e: any) => setFormTipo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="RIESGO">Riesgo (Efecto Negativo)</option>
                                        <option value="OPORTUNIDAD">Oportunidad (Efecto Positivo)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Proceso *</label>
                                    <input
                                        type="text"
                                        value={formProceso}
                                        onChange={(e) => setFormProceso(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Descripción del Evento *</label>
                                <textarea
                                    value={formDescripcion}
                                    onChange={(e) => setFormDescripcion(e.target.value)}
                                    rows={2}
                                    placeholder="Detalla la situación que puede generar riesgo u oportunidad..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Probabilidad (1 a 5): {formProbabilidad}</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formProbabilidad}
                                        onChange={(e) => setFormProbabilidad(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Impacto (1 a 5): {formImpacto}</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formImpacto}
                                        onChange={(e) => setFormImpacto(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-slate-500">Nivel de Riesgo Resultante:</span>{' '}
                                <strong className="text-slate-900 text-sm">{formProbabilidad * formImpacto} - {getRiskLabel(formProbabilidad * formImpacto)}</strong>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Estrategia *</label>
                                    <select
                                        value={formEstrategia}
                                        onChange={(e) => setFormEstrategia(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="Mitigar">Mitigar / Reducir</option>
                                        <option value="Evitar">Evitar</option>
                                        <option value="Aceptar">Aceptar con control</option>
                                        <option value="Transferir">Transferir</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Plan de Acción / Control</label>
                                    <input
                                        type="text"
                                        value={formPlanAccion}
                                        onChange={(e) => setFormPlanAccion(e.target.value)}
                                        placeholder="Acción concreta de tratamiento..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button type="button" onClick={() => setShowRiskModal(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="px-5 py-2 font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm">Guardar Riesgo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE AUDIT MODAL */}
            {showAuditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Award className="w-4 h-4 text-blue-600" /> Programar Auditoría SGC
                            </h3>
                            <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateAudit} className="space-y-4 mt-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Tipo de Auditoría *</label>
                                    <select
                                        value={auditTipo}
                                        onChange={(e) => setAuditTipo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="INTERNA">Auditoría Interna ISO 9001</option>
                                        <option value="EXTERNA">Auditoría Externa / Certificación</option>
                                        <option value="PROVEEDOR">Auditoría a Proveedor</option>
                                        <option value="PROCESO">Auditoría de Proceso Específico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Fecha Programada *</label>
                                    <input
                                        type="date"
                                        value={auditFecha}
                                        onChange={(e) => setAuditFecha(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Título de la Auditoría *</label>
                                <input
                                    type="text"
                                    value={auditTitulo}
                                    onChange={(e) => setAuditTitulo(e.target.value)}
                                    placeholder="Ej. Auditoría de Producción y Control Operacional Q3"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Área o Proceso *</label>
                                    <input
                                        type="text"
                                        value={auditProceso}
                                        onChange={(e) => setAuditProceso(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Auditor Líder *</label>
                                    <input
                                        type="text"
                                        value={auditLider}
                                        onChange={(e) => setAuditLider(e.target.value)}
                                        placeholder="Nombre del Auditor..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button type="button" onClick={() => setShowAuditModal(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">Programar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD FINDING MODAL */}
            {showFindingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-black/10">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" /> Registrar Hallazgo de Auditoría
                            </h3>
                            <button onClick={() => setShowFindingModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddFinding} className="space-y-4 mt-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Clasificación *</label>
                                    <select
                                        value={findingTipo}
                                        onChange={(e) => setFindingTipo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="NO_CONFORMIDAD_MAYOR">No Conformidad Mayor</option>
                                        <option value="NO_CONFORMIDAD_MENOR">No Conformidad Menor</option>
                                        <option value="OPORTUNIDAD_MEJORA">Oportunidad de Mejora</option>
                                        <option value="FORTALEZA">Fortaleza Identificada</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Cláusula ISO *</label>
                                    <input
                                        type="text"
                                        value={findingClausula}
                                        onChange={(e) => setFindingClausula(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Descripción del Hallazgo *</label>
                                <textarea
                                    value={findingDescripcion}
                                    onChange={(e) => setFindingDescripcion(e.target.value)}
                                    rows={3}
                                    placeholder="Redacción del hecho con evidencia objetiva..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button type="button" onClick={() => setShowFindingModal(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">Guardar Hallazgo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
