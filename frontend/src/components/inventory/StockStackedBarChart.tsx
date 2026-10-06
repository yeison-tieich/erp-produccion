import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface ChartItem {
    nombre: string;
    sku: string;
    disponible: number;
    reservado: number;
    total: number;
    puntoReorden: number;
    unidad: string;
    estado: 'NORMAL' | 'BAJO_MINIMO' | 'AGOTADO';
}

interface Props {
    data: ChartItem[];
    loading?: boolean;
    searchTerm?: string;
    filterEstado?: string;
}

const STATUS_COLORS = {
    NORMAL: { disponible: '#10b981', reservado: '#6366f1' },
    BAJO_MINIMO: { disponible: '#f59e0b', reservado: '#6366f1' },
    AGOTADO: { disponible: '#ef4444', reservado: '#6366f1' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload as ChartItem;
    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
            minWidth: '200px'
        }}>
            <p style={{ color: '#1e293b', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item?.nombre}</p>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>SKU: {item?.sku}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#10b981', fontSize: 13 }}>Disponible:</span>
                    <span style={{ color: '#1e293b', fontWeight: 600, fontSize: 13 }}>{item?.disponible?.toFixed(2)} {item?.unidad}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#6366f1', fontSize: 13 }}>Reservado:</span>
                    <span style={{ color: '#1e293b', fontWeight: 600, fontSize: 13 }}>{item?.reservado?.toFixed(2)} {item?.unidad}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Total Físico:</span>
                    <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 13 }}>{item?.total?.toFixed(2)} {item?.unidad}</span>
                </div>
                {item?.puntoReorden > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>Pto. Reorden:</span>
                        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>{item?.puntoReorden?.toFixed(2)} {item?.unidad}</span>
                    </div>
                )}
            </div>
            <div style={{
                marginTop: 8,
                padding: '4px 10px',
                borderRadius: 8,
                background: item?.estado === 'AGOTADO' ? 'rgba(239,68,68,0.2)' : item?.estado === 'BAJO_MINIMO' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                color: item?.estado === 'AGOTADO' ? '#fca5a5' : item?.estado === 'BAJO_MINIMO' ? '#fcd34d' : '#6ee7b7',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center' as const
            }}>
                {item?.estado === 'AGOTADO' ? '🔴 AGOTADO' : item?.estado === 'BAJO_MINIMO' ? '🟡 BAJO MÍNIMO' : '🟢 NORMAL'}
            </div>
        </div>
    );
};

export const StockStackedBarChart: React.FC<Props> = ({ data, loading, searchTerm, filterEstado }) => {
    const filtered = useMemo(() => {
        let d = data || [];
        if (searchTerm) d = d.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filterEstado && filterEstado !== 'TODOS') d = d.filter(i => i.estado === filterEstado);
        return d;
    }, [data, searchTerm, filterEstado]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340, color: '#6366f1' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Cargando datos de stock…</p>
                </div>
            </div>
        );
    }

    if (!filtered.length) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340, color: '#94a3b8', gap: 12 }}>
                <TrendingDown size={48} color="#475569" />
                <p style={{ fontSize: 15, fontWeight: 500 }}>Sin materiales que mostrar</p>
                <p style={{ fontSize: 13 }}>Ajusta los filtros o agrega materia prima al catálogo</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: '#10b981' }} />
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Stock Disponible</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: '#6366f1' }} />
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Reservado en producción</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={340}>
                <BarChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: filtered.length > 12 ? 60 : 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                        dataKey="nombre"
                        tick={{ fill: '#94a3b8', fontSize: filtered.length > 12 ? 10 : 12 }}
                        angle={filtered.length > 8 ? -35 : 0}
                        textAnchor={filtered.length > 8 ? 'end' : 'middle'}
                        interval={0}
                        height={filtered.length > 8 ? 60 : 30}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                    <Bar dataKey="disponible" stackId="stock" radius={[0, 0, 0, 0]} maxBarSize={52}>
                        {filtered.map((entry, index) => (
                            <Cell key={`cell-disp-${index}`} fill={STATUS_COLORS[entry.estado].disponible} />
                        ))}
                    </Bar>
                    <Bar dataKey="reservado" stackId="stock" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={52} />
                </BarChart>
            </ResponsiveContainer>

            {/* Status summary */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                {filtered.filter(i => i.estado === 'AGOTADO').length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)', padding: '5px 12px', borderRadius: 8 }}>
                        <AlertTriangle size={14} color="#ef4444" />
                        <span style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>
                            {filtered.filter(i => i.estado === 'AGOTADO').length} agotado(s)
                        </span>
                    </div>
                )}
                {filtered.filter(i => i.estado === 'BAJO_MINIMO').length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.12)', padding: '5px 12px', borderRadius: 8 }}>
                        <TrendingDown size={14} color="#f59e0b" />
                        <span style={{ color: '#fcd34d', fontSize: 13, fontWeight: 600 }}>
                            {filtered.filter(i => i.estado === 'BAJO_MINIMO').length} bajo mínimo
                        </span>
                    </div>
                )}
                {filtered.filter(i => i.estado === 'NORMAL').length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', padding: '5px 12px', borderRadius: 8 }}>
                        <CheckCircle size={14} color="#10b981" />
                        <span style={{ color: '#6ee7b7', fontSize: 13, fontWeight: 600 }}>
                            {filtered.filter(i => i.estado === 'NORMAL').length} en nivel normal
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
