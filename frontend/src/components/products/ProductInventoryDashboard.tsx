import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    AlertTriangle, BarChart3, CheckCircle2, FileWarning, ImageOff, Loader2,
    Package, RefreshCw, ShieldAlert, SlidersHorizontal, TrendingUp
} from 'lucide-react';
import {
    Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from 'recharts';
import { API_URL } from '../../api';
import { GlassCard } from '../ui/GlassCard';

type DashboardData = {
    kpis: {
        totalProductos: number;
        piezasCriticas: number;
        integridadDatos: number;
        valorInventario: number;
    };
    dataHealth: Record<string, { id: number; sku: string; nombre: string }[]>;
    stockDistribution: { estado: string; cantidad: number }[];
    completenessDistribution: { estado: string; cantidad: number }[];
    rotationTop10: { producto: string; sku: string; entradas: number; salidas: number; movimiento: number }[];
    movements: {
        id: number;
        fecha: string;
        tipo_movimiento: string;
        cantidad: number;
        referencia?: string | null;
        producto: { sku_producto: string; nombre_producto: string };
    }[];
    filters: {
        products: { id: number; sku: string; nombre: string }[];
        types: string[];
    };
};

const PIE_COLORS = ['#166534', '#d97706', '#dc2626', '#475569'];
const COMPLETENESS_COLORS = ['#0f766e', '#f97316'];

const formatNumber = (value: number) => value.toLocaleString('es-MX', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => value.toLocaleString('es-MX', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatDate = (value: string) => new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

const dateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const healthLabels: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
    sinBOM: { label: 'Sin lista de materiales (BOM)', icon: FileWarning, color: 'text-amber-700' },
    sinCalidad: { label: 'Sin plan o tolerancias de calidad', icon: ShieldAlert, color: 'text-red-700' },
    sinPlanoImagen: { label: 'Sin plano PDF o imagen', icon: ImageOff, color: 'text-slate-700' },
    sinMinMax: { label: 'Sin mínimo/máximo parametrizado', icon: SlidersHorizontal, color: 'text-orange-700' }
};

export const ProductInventoryDashboard = ({ onProductSelect }: { onProductSelect: (productId: number) => void }) => {
    const today = new Date();
    const initialFrom = new Date(today);
    initialFrom.setDate(initialFrom.getDate() - 30);
    const [from, setFrom] = useState(dateInput(initialFrom));
    const [to, setTo] = useState(dateInput(today));
    const [movementType, setMovementType] = useState('');
    const [productId, setProductId] = useState('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get<DashboardData>(`${API_URL}/products/dashboard`, {
                params: {
                    from: `${from}T00:00:00`,
                    to: `${to}T23:59:59`,
                    movementType: movementType || undefined,
                    productId: productId || undefined
                },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setData(response.data);
        } catch (requestError: any) {
            console.error('Error loading product inventory dashboard:', requestError);
            setError(requestError.response?.data?.error || 'No fue posible cargar el dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [from, to, movementType, productId]);

    if (loading && !data) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-white/60 border border-white/60">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    <span className="text-sm font-semibold">Cargando indicadores de inventario...</span>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-10 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <p className="font-bold text-red-800">{error}</p>
                <button onClick={fetchDashboard} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                    <RefreshCw className="h-4 w-4" /> Reintentar
                </button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/60 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">Inventario de productos</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">Control de catálogo y existencias</h2>
                    <p className="mt-1 text-sm text-slate-500">Clientes objetivo: CHEA ING, SERIES, Siemens, TNK y ARNESES Y GOMAS.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    <label className="text-xs font-bold text-slate-500">Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" /></label>
                    <label className="text-xs font-bold text-slate-500">Hasta<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" /></label>
                    <label className="text-xs font-bold text-slate-500">Movimiento<select value={movementType} onChange={event => setMovementType(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><option value="">Todos</option>{data.filters.types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
                    <label className="text-xs font-bold text-slate-500">Producto<select value={productId} onChange={event => setProductId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><option value="">Todos</option>{data.filters.products.map(product => <option key={product.id} value={product.id}>{product.sku} - {product.nombre}</option>)}</select></label>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Productos en catálogo', value: formatNumber(data.kpis.totalProductos), detail: 'Clientes objetivo', icon: Package, color: 'text-blue-700', bg: 'bg-blue-50' },
                    { label: 'Piezas críticas o agotadas', value: formatNumber(data.kpis.piezasCriticas), detail: 'Stock bajo mínimos', icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
                    { label: 'Integridad de datos', value: `${data.kpis.integridadDatos}%`, detail: 'Ficha técnica completa', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Valor inventario físico', value: formatCurrency(data.kpis.valorInventario), detail: 'Stock x precio de venta', icon: TrendingUp, color: 'text-violet-700', bg: 'bg-violet-50' }
                ].map(kpi => (
                    <GlassCard key={kpi.label} className="!p-5 flex items-center gap-4">
                        <div className={`rounded-2xl p-3 ${kpi.bg}`}><kpi.icon className={`h-6 w-6 ${kpi.color}`} /></div>
                        <div className="min-w-0"><p className="truncate text-[11px] font-black uppercase tracking-wider text-slate-500">{kpi.label}</p><p className="mt-1 truncate text-2xl font-black text-slate-900">{kpi.value}</p><p className="text-xs text-slate-400">{kpi.detail}</p></div>
                    </GlassCard>
                ))}
            </div>

            <section>
                <div className="mb-3 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /><h3 className="text-lg font-black text-slate-900">Data Health Check</h3></div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Object.entries(healthLabels).map(([key, config]) => {
                        const items = data.dataHealth[key] || [];
                        return <button key={key} onClick={() => items[0] && onProductSelect(items[0].id)} className="text-left rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><config.icon className={`h-5 w-5 ${config.color}`} /><span className="text-sm font-bold text-slate-700">{config.label}</span></div><span className="text-2xl font-black text-slate-900">{items.length}</span></div><p className="mt-3 text-xs text-slate-400">{items.length ? `${items[0].sku} - ${items[0].nombre}` : 'Sin alertas en el alcance seleccionado'}</p></button>;
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <GlassCard>
                    <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-600" /><h3 className="font-black text-slate-900">Top 10 por movimiento</h3></div>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.rotationTop10} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="sku" width={80} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="entradas" stackId="mov" fill="#0f766e" name="Entradas" /><Bar dataKey="salidas" stackId="mov" fill="#f97316" name="Salidas" /></BarChart></ResponsiveContainer></div>
                </GlassCard>
                <GlassCard>
                    <div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-brand-600" /><h3 className="font-black text-slate-900">Distribución del inventario</h3></div>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.stockDistribution} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4}>{data.stockDistribution.map((entry, index) => <Cell key={entry.estado} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip /><text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-700 text-sm font-black">{data.kpis.totalProductos}</text></PieChart></ResponsiveContainer></div>
                    <div className="flex flex-wrap justify-center gap-3 text-xs font-bold text-slate-500">{data.stockDistribution.map((entry, index) => <span key={entry.estado} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />{entry.estado}: {entry.cantidad}</span>)}</div>
                </GlassCard>
                <GlassCard>
                    <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand-600" /><h3 className="font-black text-slate-900">Completitud técnica</h3></div>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.completenessDistribution} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={5}>{data.completenessDistribution.map((entry, index) => <Cell key={entry.estado} fill={COMPLETENESS_COLORS[index % COMPLETENESS_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                    <div className="flex justify-center gap-4 text-xs font-bold text-slate-500">{data.completenessDistribution.map((entry, index) => <span key={entry.estado} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COMPLETENESS_COLORS[index] }} />{entry.estado}: {entry.cantidad}</span>)}</div>
                </GlassCard>
            </div>

            <GlassCard className="!p-0 overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-brand-600" /><h3 className="font-black text-slate-900">Movimientos recientes</h3></div><p className="mt-1 text-xs text-slate-400">Entradas, salidas y ajustes registrados en el kardex de productos.</p></div><span className="text-xs font-bold text-slate-400">Máximo 200 registros</span></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Cantidad</th><th className="px-5 py-3">Referencia</th></tr></thead><tbody className="divide-y divide-slate-100">{data.movements.map(movement => <tr key={movement.id} className="hover:bg-slate-50"><td className="px-5 py-3 text-slate-500">{formatDate(movement.fecha)}</td><td className="px-5 py-3"><p className="font-bold text-slate-800">{movement.producto.nombre_producto}</p><p className="font-mono text-xs text-slate-400">{movement.producto.sku_producto}</p></td><td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{movement.tipo_movimiento}</span></td><td className={`px-5 py-3 font-black ${movement.tipo_movimiento.toLowerCase().includes('salida') ? 'text-red-600' : 'text-emerald-600'}`}>{movement.tipo_movimiento.toLowerCase().includes('salida') ? '-' : '+'}{formatNumber(Math.abs(movement.cantidad))}</td><td className="max-w-[220px] truncate px-5 py-3 text-slate-500">{movement.referencia || '-'}</td></tr>)}</tbody></table>{!data.movements.length && <div className="p-10 text-center text-sm font-semibold text-slate-400">No hay movimientos para los filtros seleccionados.</div>}</div>
            </GlassCard>
        </div>
    );
};
