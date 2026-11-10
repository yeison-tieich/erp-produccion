import React, { useEffect, useState } from 'react';
import {
    ShieldAlert, Plus, Search, CheckCircle2, AlertTriangle,
    FileText, User, Calendar, RefreshCw, Award, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { qualityService, QualityRisk, Audit } from '../../services/qualityService';

export const RisksAndAuditsPage = () => {
    const [activeTab, setActiveTab] = useState<'RISKS' | 'OPPORTUNITIES' | 'AUDITS'>('RISKS');
    const [risks, setRisks] = useState<QualityRisk[]>([]);
    const [audits, setAudits] = useState<Audit[]>([]);
    const [contextAssessments, setContextAssessments] = useState<Awaited<ReturnType<typeof qualityService.getContextAssessments>>>([]);
    const [loading, setLoading] = useState(true);
    const [showContextForm, setShowContextForm] = useState(false);
    const [contextForm, setContextForm] = useState({
        factor: '',
        origen: 'EXTERNO' as 'INTERNO' | 'EXTERNO',
        cambio_climatico_relevante: true,
        impacto_cadena_suministro: '',
        impacto_sostenibilidad: '',
        respuesta_planificada: '',
        responsable: '',
        fecha_revision: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    });

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
    const [formViabilidad, setFormViabilidad] = useState(3);
    const [formBeneficio, setFormBeneficio] = useState(3);
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
            const [rData, aData, contextData] = await Promise.all([
                qualityService.getRisks(),
                qualityService.getAudits(),
                qualityService.getContextAssessments()
            ]);
            setRisks(rData || []);
            setAudits(aData || []);
            setContextAssessments(contextData || []);
        } catch (e) {
            console.error('Error fetching risks/audits:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContextAssessment = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await qualityService.createContextAssessment(contextForm);
            setShowContextForm(false);
            setContextForm({
                factor: '',
                origen: 'EXTERNO',
                cambio_climatico_relevante: true,
                impacto_cadena_suministro: '',
                impacto_sostenibilidad: '',
                respuesta_planificada: '',
                responsable: '',
                fecha_revision: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
            });
            await fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al registrar evaluación del contexto.');
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
                categoria_matriz: formTipo,
                proceso: formProceso,
                descripcion: formDescripcion,
                causa: formCausa,
                consecuencia: formConsecuencia,
                probabilidad: Number(formProbabilidad),
                impacto: Number(formImpacto),
                viabilidad: Number(formViabilidad),
                beneficio: Number(formBeneficio),
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
                    {activeTab !== 'AUDITS' ? (
                        <button
                            onClick={() => {
                                const category = activeTab === 'OPPORTUNITIES' ? 'OPORTUNIDAD' : 'RIESGO';
                                setFormTipo(category);
                                setShowRiskModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> {activeTab === 'OPPORTUNITIES' ? 'Nueva Oportunidad' : 'Nuevo Riesgo'}
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

            <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-bold text-slate-900">Contexto, cambio climático y sostenibilidad</h2>
                        <p className="mt-1 text-xs text-slate-600">Evaluaciones de factores internos/externos, disponibilidad de suministro e impactos ambientales.</p>
                    </div>
                    <button onClick={() => setShowContextForm(value => !value)} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800">
                        {showContextForm ? 'Cerrar evaluación' : 'Registrar evaluación'}
                    </button>
                </div>
                {contextAssessments.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {contextAssessments.slice(0, 4).map(assessment => (
                            <div key={assessment.id} className="rounded-xl border border-sky-100 bg-white/80 p-3 text-xs">
                                <div className="flex justify-between gap-2">
                                    <strong className="text-slate-800">{assessment.factor}</strong>
                                    <span className="font-bold text-sky-800">{assessment.origen}</span>
                                </div>
                                <p className="mt-1 text-slate-600">Suministro: {assessment.impacto_cadena_suministro}</p>
                                <p className="text-slate-600">Revisión: {new Date(assessment.fecha_revision).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
                {showContextForm && (
                    <form onSubmit={handleCreateContextAssessment} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-sky-100 bg-white p-4 text-xs sm:grid-cols-2">
                        <label className="font-semibold text-slate-700">Factor / cambio
                            <input required value={contextForm.factor} onChange={event => setContextForm({ ...contextForm, factor: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Ej. Sequía afecta proveedor de acero" />
                        </label>
                        <label className="font-semibold text-slate-700">Origen
                            <select value={contextForm.origen} onChange={event => setContextForm({ ...contextForm, origen: event.target.value as typeof contextForm.origen })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <option value="EXTERNO">Externo</option><option value="INTERNO">Interno</option>
                            </select>
                        </label>
                        <label className="flex items-center gap-2 font-semibold text-slate-700">
                            <input type="checkbox" checked={contextForm.cambio_climatico_relevante} onChange={event => setContextForm({ ...contextForm, cambio_climatico_relevante: event.target.checked })} />
                            Cambio climático relevante
                        </label>
                        <label className="font-semibold text-slate-700">Fecha de revisión
                            <input required type="date" value={contextForm.fecha_revision} onChange={event => setContextForm({ ...contextForm, fecha_revision: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                        </label>
                        <label className="font-semibold text-slate-700">Impacto en cadena de suministro
                            <textarea required value={contextForm.impacto_cadena_suministro} onChange={event => setContextForm({ ...contextForm, impacto_cadena_suministro: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" rows={2} />
                        </label>
                        <label className="font-semibold text-slate-700">Impacto en sostenibilidad
                            <textarea required value={contextForm.impacto_sostenibilidad} onChange={event => setContextForm({ ...contextForm, impacto_sostenibilidad: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" rows={2} />
                        </label>
                        <label className="font-semibold text-slate-700">Respuesta planificada
                            <textarea required value={contextForm.respuesta_planificada} onChange={event => setContextForm({ ...contextForm, respuesta_planificada: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" rows={2} />
                        </label>
                        <label className="font-semibold text-slate-700">Responsable
                            <input required value={contextForm.responsable} onChange={event => setContextForm({ ...contextForm, responsable: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
                        </label>
                        <div className="sm:col-span-2 flex justify-end">
                            <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 font-bold text-white hover:bg-sky-800">Guardar evaluación</button>
                        </div>
                    </form>
                )}
            </section>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-black/5 pb-2 text-xs">
                <button
                    onClick={() => setActiveTab('RISKS')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold transition-all",
                        activeTab === 'RISKS' ? "bg-amber-100 text-amber-900 shadow-xs" : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    Matriz de Mitigación de Riesgos ({risks.filter(r => r.categoria_matriz === 'RIESGO').length})
                </button>
                <button
                    onClick={() => setActiveTab('OPPORTUNITIES')}
                    className={clsx(
                        "px-4 py-2 rounded-xl font-bold transition-all",
                        activeTab === 'OPPORTUNITIES' ? "bg-emerald-100 text-emerald-900 shadow-xs" : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    Oportunidades de Mejora ({risks.filter(r => r.categoria_matriz === 'OPORTUNIDAD').length})
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
            {(activeTab === 'RISKS' || activeTab === 'OPPORTUNITIES') && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className={clsx(
                        'border-b px-4 py-3 text-xs font-semibold',
                        activeTab === 'RISKS' ? 'border-rose-100 bg-rose-50/60 text-rose-800' : 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
                    )}>
                        {activeTab === 'RISKS'
                            ? 'Evaluación de amenazas: probabilidad × impacto negativo y acciones de mitigación.'
                            : 'Evaluación de valor: viabilidad × beneficio esperado y acciones para capturar la oportunidad.'}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/5 text-slate-600 font-bold border-b border-black/5">
                                <tr>
                                    <th className="p-3.5">Código</th>
                                    <th className="p-3.5">Tipo</th>
                                    <th className="p-3.5">Proceso</th>
                                    <th className="p-3.5">Descripción del Riesgo</th>
                                    <th className="p-3.5 text-center">{activeTab === 'RISKS' ? 'Prob (P)' : 'Viabilidad'}</th>
                                    <th className="p-3.5 text-center">{activeTab === 'RISKS' ? 'Impacto (I)' : 'Beneficio'}</th>
                                    <th className="p-3.5 text-center">{activeTab === 'RISKS' ? 'Nivel (P×I)' : 'Valor (V×B)'}</th>
                                    <th className="p-3.5">{activeTab === 'RISKS' ? 'Estrategia / Plan' : 'Captura / Plan'}</th>
                                    <th className="p-3.5">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {risks.filter(r => r.categoria_matriz === (activeTab === 'RISKS' ? 'RIESGO' : 'OPORTUNIDAD')).length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">{activeTab === 'RISKS' ? 'Sin riesgos registrados' : 'Sin oportunidades registradas'}</td></tr>
                                ) : (
                                    risks.filter(r => r.categoria_matriz === (activeTab === 'RISKS' ? 'RIESGO' : 'OPORTUNIDAD')).map(r => (
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
                                            <td className="p-3.5 text-center font-bold text-slate-700">{activeTab === 'RISKS' ? r.probabilidad : r.viabilidad}</td>
                                            <td className="p-3.5 text-center font-bold text-slate-700">{activeTab === 'RISKS' ? r.impacto : r.beneficio}</td>
                                            <td className="p-3.5 text-center">
                                                <span className={clsx("px-2.5 py-1 rounded-full text-[10px] border", getRiskColor(activeTab === 'RISKS' ? r.nivel_riesgo : r.nivel_oportunidad))}>
                                                    {activeTab === 'RISKS' ? getRiskLabel(r.nivel_riesgo) : 'Valor de oportunidad'} · {activeTab === 'RISKS' ? r.nivel_riesgo : r.nivel_oportunidad}
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
                                    <label className="block font-bold text-slate-700 mb-1">Matriz *</label>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold">
                                        {formTipo === 'RIESGO' ? 'Mitigación de Riesgos' : 'Captura de Oportunidades'}
                                    </div>
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
                                    <label className="block font-bold text-slate-700 mb-1">{formTipo === 'RIESGO' ? `Probabilidad (1 a 5): ${formProbabilidad}` : `Viabilidad (1 a 5): ${formViabilidad}`}</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formTipo === 'RIESGO' ? formProbabilidad : formViabilidad}
                                        onChange={(e) => formTipo === 'RIESGO'
                                            ? setFormProbabilidad(Number(e.target.value))
                                            : setFormViabilidad(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">{formTipo === 'RIESGO' ? `Impacto negativo (1 a 5): ${formImpacto}` : `Beneficio esperado (1 a 5): ${formBeneficio}`}</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formTipo === 'RIESGO' ? formImpacto : formBeneficio}
                                        onChange={(e) => formTipo === 'RIESGO'
                                            ? setFormImpacto(Number(e.target.value))
                                            : setFormBeneficio(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-slate-500">{formTipo === 'RIESGO' ? 'Exposición inherente:' : 'Valor potencial:'}</span>{' '}
                                <strong className="text-slate-900 text-sm">
                                    {formTipo === 'RIESGO'
                                        ? `${formProbabilidad * formImpacto} - ${getRiskLabel(formProbabilidad * formImpacto)}`
                                        : `${formViabilidad * formBeneficio} / 25`}
                                </strong>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">{formTipo === 'RIESGO' ? 'Tratamiento del riesgo *' : 'Estrategia de captura *'}</label>
                                    <select
                                        value={formEstrategia}
                                        onChange={(e) => setFormEstrategia(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                                    >
                                        {formTipo === 'RIESGO' ? <>
                                            <option value="Mitigar">Mitigar / Reducir</option>
                                            <option value="Evitar">Evitar</option>
                                            <option value="Aceptar">Aceptar con control</option>
                                            <option value="Transferir">Transferir</option>
                                        </> : <>
                                            <option value="Explotar">Explotar</option>
                                            <option value="Mejorar">Mejorar</option>
                                            <option value="Compartir">Compartir</option>
                                            <option value="Aceptar">Aceptar</option>
                                        </>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Plan de Acción / Control</label>
                                    <input
                                        type="text"
                                        value={formPlanAccion}
                                        onChange={(e) => setFormPlanAccion(e.target.value)}
                                        placeholder={formTipo === 'RIESGO' ? 'Acción concreta de mitigación...' : 'Acción para capturar el beneficio...'}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
                                <button type="button" onClick={() => setShowRiskModal(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="px-5 py-2 font-bold text-brand-950 bg-brand-400 hover:bg-brand-500 rounded-xl shadow-sm">{formTipo === 'RIESGO' ? 'Guardar Riesgo' : 'Guardar Oportunidad'}</button>
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
