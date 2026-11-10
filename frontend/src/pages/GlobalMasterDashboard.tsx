import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Activity, AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2,
    ExternalLink, Factory, Layers, Loader2, Package, RefreshCw,
    ShieldAlert, ShieldCheck
} from 'lucide-react';
import {
    Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from 'recharts';
import { API_URL } from '../api';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuthStore } from '../store/auth.store';

interface GlobalSummary {
    asOf: string;
    production: {
        activeOrders: number;
        pendingOrders: number;
        ordersByStatus: { status: string; count: number }[];
        delayedOrders: {
            id: number;
            numero_ot: string;
            cliente: string | null;
            estado_ot: string;
            fecha_entrega_req: string | null;
            producto: { nombre_producto: string } | null;
        }[];
    };
    inventory: {
        criticalCount: number;
        criticalItems: {
            id: number;
            sku_mp: string;
            nombre_mp: string;
            stock_actual: number;
            punto_reorden: number;
            unidad_medida_stock: string;
        }[];
    };
    products: { incompleteCount: number };
    quality: { openNonConformances: number; heldOrders: number; ppm: number };
    machines: { id: number; codigo: string; nombre: string | null; estado: string; area_produccion: string | null }[];
}

const chartColors = ['#0f766e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b'];

const formatUpdatedAt = (date: string) =>
    new Date(date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export const GlobalMasterDashboard = () => {
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token);
    const [summary, setSummary] = useState<GlobalSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refreshSummary = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError('');
        try {
            const authToken = token || localStorage.getItem('token');
            const response = await axios.get<GlobalSummary>(`${API_URL}/dashboard/global-summary`, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                signal
            });
            setSummary(response.data);
        } catch (requestError) {
            if (axios.isCancel(requestError) || (requestError instanceof Error && requestError.name === 'CanceledError')) return;
            console.error('Error loading global dashboard summary:', requestError);
            setError('No fue posible cargar el resumen gerencial.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            await refreshSummary(controller.signal);
            if (!controller.signal.aborted) timer = setTimeout(poll, 60_000);
        };
        void poll();
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [refreshSummary]);

    const navigateTo = (path: string) => () => navigate(path);

    if (loading && !summary) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
                    <p className="text-sm font-semibold">Consolidando producción, inventario, catálogo y calidad...</p>
                </div>
            </div>
        );
    }

    if (error && !summary) {
        return (
            <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
                <AlertTriangle className="mb-3 h-10 w-10 text-red-500" />
                <h1 className="text-xl font-bold text-slate-900">Dashboard no disponible</h1>
                <p className="mt-2 text-sm text-slate-500">{error}</p>
                <button onClick={() => void refreshSummary()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-bold text-brand-950 hover:bg-brand-500">
                    <RefreshCw className="h-4 w-4" /> Reintentar
                </button>
            </div>
        );
    }

    if (!summary) return null;

    const kpis = [
        { title: 'OTs activas', value: summary.production.activeOrders, note: `${summary.production.pendingOrders} pendientes`, icon: Activity, color: 'text-blue-700', bg: 'bg-blue-50', href: '/orders?status=En%20Progreso' },
        { title: 'Stock crítico', value: summary.inventory.criticalCount, note: 'Referencias bajo mínimo', icon: Package, color: 'text-amber-700', bg: 'bg-amber-50', href: '/inventory?tab=catalogo&filter=low' },
        { title: 'Productos incompletos', value: summary.products.incompleteCount, note: 'Plano, BOM o ruta pendiente', icon: Layers, color: 'text-orange-700', bg: 'bg-orange-50', href: '/products/dashboard' },
        { title: 'Calidad pendiente', value: summary.quality.openNonConformances + summary.quality.heldOrders, note: `${summary.quality.openNonConformances} NC · ${summary.quality.heldOrders} OTs retenidas`, icon: ShieldCheck, color: 'text-red-700', bg: 'bg-red-50', href: '/quality/non-conformances' }
    ];

    return (
        <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-8">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">MECAYTRO · Torre de control</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Dashboard Gerencial</h1>
                    <p className="mt-1 text-sm text-slate-500">Vista ejecutiva de producción, materiales, catálogo y calidad.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{summary.asOf ? `Actualizado ${formatUpdatedAt(summary.asOf)}` : ''}</span>
                    <button
                        type="button"
                        onClick={() => void refreshSummary()}
                        disabled={loading}
                        aria-label="Actualizar resumen"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-3.5 py-2.5 text-sm font-bold text-brand-950 shadow-sm transition hover:bg-brand-500 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </header>

            {error && (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    {error} Se conserva la última información cargada.
                </div>
            )}

            <section aria-label="Indicadores clave" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map(({ title, value, note, icon: Icon, color, bg, href }) => (
                    <button key={title} type="button" onClick={navigateTo(href)} className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl">
                        <GlassCard className="!p-4 transition group-hover:-translate-y-0.5 group-hover:border-brand-300/70">
                            <div className="flex items-start justify-between gap-3">
                                <div className={`rounded-xl p-2.5 ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                                <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-brand-700" />
                            </div>
                            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
                            <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value.toLocaleString('es-CO')}</p>
                            <p className="mt-1 text-xs text-slate-500">{note}</p>
                        </GlassCard>
                    </button>
                ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                <GlassCard className="xl:col-span-3">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Factory className="h-5 w-5 text-brand-700" /> Producción y taller</h2>
                            <p className="mt-1 text-xs text-slate-500">Órdenes por estado y estado de máquinas.</p>
                        </div>
                        <button onClick={navigateTo('/orders/live-plant')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white">
                            Ver Taller en Vivo <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div
                        role="link"
                        tabIndex={0}
                        aria-label="Ver todas las órdenes"
                        onClick={navigateTo('/orders')}
                        onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate('/orders');
                            }
                        }}
                        className="h-52 w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.production.ordersByStatus} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" name="Órdenes" radius={[6, 6, 0, 0]}>
                                    {summary.production.ordersByStatus.map((entry, index) => <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {summary.machines.slice(0, 4).map(machine => (
                            <button key={machine.id} onClick={navigateTo('/maintenance')} className="rounded-xl border border-slate-100 bg-white/50 p-3 text-left hover:border-brand-200">
                                <p className="truncate text-xs font-bold text-slate-800">{machine.nombre || machine.codigo}</p>
                                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <span className={`h-2 w-2 rounded-full ${/operativa|disponible|activa/i.test(machine.estado) ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {machine.estado}
                                </p>
                            </button>
                        ))}
                        {summary.machines.length === 0 && <p className="col-span-full text-xs text-slate-500">No hay máquinas registradas.</p>}
                    </div>
                </GlassCard>

                <GlassCard className="xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><CalendarClock className="h-5 w-5 text-red-600" /> OTs retrasadas</h2>
                            <p className="mt-1 text-xs text-slate-500">Órdenes abiertas con entrega vencida.</p>
                        </div>
                        <button onClick={navigateTo('/orders')} aria-label="Ver órdenes retrasadas" className="rounded-lg p-2 text-slate-500 hover:bg-white"><ArrowUpRight className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-2">
                        {summary.production.delayedOrders.map(order => (
                            <button key={order.id} onClick={navigateTo(`/orders?orderId=${order.id}`)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2.5 text-left hover:bg-red-50">
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-slate-800">{order.numero_ot}</span>
                                    <span className="block truncate text-xs text-slate-500">{order.producto?.nombre_producto || order.cliente || 'Orden de trabajo'}</span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-[11px] font-semibold text-red-700">{order.estado_ot}</span>
                                    <span className="text-[10px] text-slate-500">{order.fecha_entrega_req ? new Date(order.fecha_entrega_req).toLocaleDateString('es-CO') : ''}</span>
                                </span>
                            </button>
                        ))}
                        {summary.production.delayedOrders.length === 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-5 w-5" /> No hay OTs retrasadas.</div>
                        )}
                    </div>
                </GlassCard>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <GlassCard>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 font-bold text-slate-900"><AlertTriangle className="h-5 w-5 text-amber-600" /> Materia prima crítica</h2>
                        <button onClick={navigateTo('/inventory?tab=catalogo&filter=low')} className="text-xs font-bold text-brand-700 hover:underline">Gestionar almacén</button>
                    </div>
                    <div className="space-y-2">
                        {summary.inventory.criticalItems.map(material => (
                            <button key={material.id} onClick={navigateTo(`/inventory?tab=catalogo&material=${encodeURIComponent(material.sku_mp)}`)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-amber-50">
                                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{material.nombre_mp}</span><span className="text-[11px] text-slate-500">{material.sku_mp}</span></span>
                                <span className="shrink-0 text-right text-xs font-bold text-amber-800">{material.stock_actual} / {material.punto_reorden} {material.unidad_medida_stock}</span>
                            </button>
                        ))}
                        {summary.inventory.criticalItems.length === 0 && <p className="text-sm text-slate-500">Sin alertas de stock bajo mínimo.</p>}
                    </div>
                </GlassCard>

                <button onClick={navigateTo('/products/dashboard')} className="rounded-3xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                    <GlassCard className="h-full transition hover:border-brand-300/70">
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Layers className="h-5 w-5 text-orange-600" /> Salud del catálogo</h2>
                            <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="mt-6 text-4xl font-black text-slate-900">{summary.products.incompleteCount.toLocaleString('es-CO')}</p>
                        <p className="mt-1 text-sm font-semibold text-orange-800">Productos con datos incompletos</p>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">Revisa referencias sin plano PDF, lista de materiales (BOM) o ruta de fabricación.</p>
                    </GlassCard>
                </button>

                <GlassCard>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 font-bold text-slate-900"><ShieldAlert className="h-5 w-5 text-red-600" /> Calidad · ISO 9001</h2>
                        <button onClick={navigateTo('/quality')} className="text-xs font-bold text-brand-700 hover:underline">Panel de calidad</button>
                    </div>
                    <button onClick={navigateTo('/quality/non-conformances')} className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3 py-3 text-left hover:bg-red-100">
                        <span><span className="block text-sm font-bold text-slate-800">No conformidades abiertas</span><span className="text-xs text-slate-500">Requieren análisis o acción</span></span>
                        <span className="text-xl font-black text-red-700">{summary.quality.openNonConformances}</span>
                    </button>
                    <button onClick={navigateTo('/quality')} className="mt-2 flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-3 text-left hover:bg-amber-100">
                        <span><span className="block text-sm font-bold text-slate-800">OTs retenidas</span><span className="text-xs text-slate-500">Pendientes de liberación</span></span>
                        <span className="text-xl font-black text-amber-700">{summary.quality.heldOrders}</span>
                    </button>
                    <button onClick={navigateTo('/quality')} className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white/70">
                        <span className="text-sm font-semibold text-slate-700">PPM (últimos 30 días)</span>
                        <span className="font-black text-slate-900">{summary.quality.ppm.toLocaleString('es-CO')}</span>
                    </button>
                </GlassCard>
            </section>
        </main>
    );
};
