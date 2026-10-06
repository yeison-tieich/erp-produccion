import React, { useEffect, useState } from 'react';
import {
    Search, GitBranch, ArrowDown, CheckCircle2, XCircle,
    AlertTriangle, ShieldCheck, Factory, User, Wrench,
    FileText, Package, Truck, Clock, RefreshCw, Lock, Unlock
} from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';
import { API_URL, getAssetUrl } from '../../api';
import { qualityService } from '../../services/qualityService';

export const TraceabilityPage = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOTId, setSelectedOTId] = useState<string>('');
    const [traceability, setTraceability] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/orders`).then(res => {
            const list = res.data || [];
            setOrders(list);
            if (list.length > 0) {
                setSelectedOTId(list[0].id.toString());
                loadTraceability(list[0].id);
            }
        }).catch(err => console.error(err));
    }, []);

    const loadTraceability = async (otId: number) => {
        try {
            setLoading(true);
            const data = await qualityService.getTraceability(otId);
            setTraceability(data);
        } catch (error) {
            console.error('Error loading traceability:', error);
            setTraceability(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOT = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedOTId(id);
        if (id) {
            loadTraceability(Number(id));
        } else {
            setTraceability(null);
        }
    };

    const t = traceability;

    return (
        <div className="space-y-6 pt-2 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <GitBranch className="w-6 h-6 text-brand-600" />
                    Trazabilidad 360° Integral
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                    Cadena genealógica completa desde el Pedido y Materia Prima hasta Mediciones, Retrabajos y Despacho.
                </p>
            </div>

            {/* Selection Bar */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Seleccionar Orden de Trabajo (OT):</label>
                    <select
                        value={selectedOTId}
                        onChange={handleSelectOT}
                        className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold text-slate-800 flex-1 max-w-md shadow-xs"
                    >
                        {orders.map(o => (
                            <option key={o.id} value={o.id}>
                                {o.numero_ot} - {o.producto?.nombre_producto || o.cliente} ({o.estado_calidad || 'Pendiente'})
                            </option>
                        ))}
                    </select>
                </div>

                {t && (
                    <div className="flex items-center gap-2">
                        {t.despacho?.bloqueado ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> DESPACHO BLOQUEADO (OT RETENIDA)
                            </span>
                        ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Unlock className="w-3.5 h-3.5" /> OT LIBERADA PARA DESPACHO
                            </span>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : !t ? (
                <div className="glass-panel p-10 rounded-2xl text-center text-xs text-slate-400">
                    Selecciona una Orden de Trabajo para generar el árbol de trazabilidad.
                </div>
            ) : (
                /* Interactive Step-by-Step Tree Pipeline */
                <div className="space-y-4">
                    {/* Node 1: CLIENTE & PEDIDO */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 font-bold text-xs text-blue-900 mb-2">
                            <User className="w-4 h-4 text-blue-600" />
                            1. CLIENTE & PEDIDO COMERCIAL
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div><span className="text-slate-500">Cliente:</span> <strong className="text-slate-800 block">{t.cliente?.nombre}</strong></div>
                            <div><span className="text-slate-500">Orden Compra:</span> <strong className="text-slate-800 block">{t.cliente?.orden_compra_cliente || 'N/A'}</strong></div>
                            <div><span className="text-slate-500">Estado Pedido:</span> <strong className="text-slate-800 block">{t.cliente?.pedido?.estado || 'Directo OT'}</strong></div>
                            <div><span className="text-slate-500">Cant. Despachada:</span> <strong className="text-slate-800 block">{t.cliente?.pedido?.cantidad_despachada || 0}</strong></div>
                        </div>
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 2: PRODUCTO & PLANO TÉCNICO */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
                                <FileText className="w-4 h-4 text-purple-600" />
                                2. ESPECIFICACIÓN DE PRODUCTO & PLANO TÉCNICO
                            </div>
                            {t.producto?.plano_pdf_url && (
                                <a
                                    href={getAssetUrl(t.producto.plano_pdf_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-purple-700 hover:underline bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200"
                                >
                                    Ver Plano PDF
                                </a>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div><span className="text-slate-500">Producto:</span> <strong className="text-slate-800 block">{t.producto?.nombre}</strong></div>
                            <div><span className="text-slate-500">SKU:</span> <strong className="text-slate-800 block">{t.producto?.sku}</strong></div>
                            <div><span className="text-slate-500">Acabado:</span> <strong className="text-slate-800 block">{t.producto?.acabado || 'Estándar'}</strong></div>
                            <div><span className="text-slate-500">Planes Control:</span> <strong className="text-slate-800 block">{t.producto?.planes_control?.length || 0} configurados</strong></div>
                        </div>
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 3: MATERIA PRIMA & LOTES */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-amber-500">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-900 mb-2">
                            <Package className="w-4 h-4 text-amber-600" />
                            3. MATERIA PRIMA CONSUMIDA / RESERVADA
                        </div>
                        {t.materiasPrimas?.length === 0 ? (
                            <div className="text-xs text-slate-400">Sin movimientos de materia prima registrados</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {t.materiasPrimas.map((mp: any, i: number) => (
                                    <div key={i} className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                                        <div>
                                            <div className="font-bold text-slate-800">{mp.nombre}</div>
                                            <div className="text-[10px] text-slate-400">SKU: {mp.sku} ({mp.tipo_movimiento})</div>
                                        </div>
                                        <div className="font-bold text-slate-700">{mp.cantidad} und</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 4: PROCESO, MÁQUINA & OPERARIO */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-indigo-500">
                        <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 mb-2">
                            <Factory className="w-4 h-4 text-indigo-600" />
                            4. PROCESO DE FABRICACIÓN EN PLANTA
                        </div>
                        <div className="space-y-2 text-xs">
                            {t.procesoFabricacion?.map((proc: any, i: number) => (
                                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-slate-800 mr-2">{proc.secuencia}. {proc.operacion}</span>
                                        <span className="text-[10px] text-slate-500">({proc.centro_trabajo})</span>
                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                            Operario: <strong>{proc.operario}</strong> | Máquina: <strong>{proc.maquina}</strong>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-500">
                                            Buenos: <strong className="text-emerald-700">{proc.cantidad_buena || 0}</strong> / Malos: <strong className="text-rose-700">{proc.cantidad_mala || 0}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200">
                                            {proc.estado}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 5: INSPECCIONES & RESULTADOS DE CALIDAD */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-emerald-500">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                5. INSPECCIONES DE CALIDAD & MEDICIONES REALES
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                                Estado Calidad: <strong className={t.ot.estado_calidad === 'Liberada' ? 'text-emerald-700' : 'text-rose-700'}>{t.ot.estado_calidad}</strong>
                            </span>
                        </div>
                        {t.inspeccionesCalidad?.length === 0 ? (
                            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
                                ⚠️ OT pendiente de inspección de calidad antes de su liberación.
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                {t.inspeccionesCalidad.map((insp: any, i: number) => (
                                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between font-bold">
                                            <span className="text-slate-800">{insp.codigo} ({insp.tipo})</span>
                                            <span className={insp.resultado === 'APROBADO' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                                {insp.resultado}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Inspector: {insp.inspector} | Piezas inspeccionadas: {insp.cantidad_inspeccionada} | Cotas verificadas: {insp.mediciones?.length || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 6: NO CONFORMIDADES & RETRABAJOS */}
                    <div className="glass-panel p-4 rounded-2xl border-l-4 border-rose-500">
                        <div className="flex items-center gap-2 font-bold text-xs text-rose-900 mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            6. NO CONFORMIDADES & ACCIONES CORRECTIVAS ASOCIADAS
                        </div>
                        {t.noConformidades?.length === 0 ? (
                            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200">
                                ✓ Cero No Conformidades registradas para esta Orden de Trabajo.
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                {t.noConformidades.map((nc: any, i: number) => (
                                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between font-bold">
                                            <span className="text-slate-800">{nc.codigo} - {nc.tipo_defecto}</span>
                                            <span className="text-rose-700 font-bold">Disposición: {nc.disposicion || 'Pendiente'}</span>
                                        </div>
                                        <p className="text-slate-600 text-[11px] mt-1">{nc.descripcion}</p>
                                        {nc.causa_raiz && (
                                            <p className="text-blue-700 text-[10px] mt-0.5 font-medium">
                                                Causa Raíz: {nc.causa_raiz}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center text-slate-400"><ArrowDown className="w-4 h-4" /></div>

                    {/* Node 7: LIBERACIÓN & DESPACHO FINAL */}
                    <div className={clsx(
                        "glass-panel p-4 rounded-2xl border-l-4",
                        t.despacho?.bloqueado ? "border-rose-600 bg-rose-50/30" : "border-emerald-600 bg-emerald-50/30"
                    )}>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                                <Truck className="w-4 h-4 text-slate-700" />
                                7. ESTADO FINAL DE LIBERACIÓN Y DESPACHO
                            </div>
                            <div>
                                {t.despacho?.bloqueado ? (
                                    <span className="font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                                        BLOQUEADO: {t.despacho.motivo_bloqueo}
                                    </span>
                                ) : (
                                    <span className="font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                        LIBERADO: Apto para Entrega / Remisión
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
