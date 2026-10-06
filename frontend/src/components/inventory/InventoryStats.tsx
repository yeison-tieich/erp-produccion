import React from 'react';
import { Package, AlertTriangle, Lock, Database, TrendingDown, XCircle } from 'lucide-react';

interface StatsProps {
    stockTotal: number;
    stockDisponible: number;
    stockReservado: number;
    totalReferencias: number;
    bajoMinimo: number;
    agotadas: number;
    loading?: boolean;
}

const KPICard: React.FC<{
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    pulse?: boolean;
}> = ({ label, value, sub, icon, color, bgColor, borderColor, pulse }) => (
    <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden'
    }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${borderColor}55`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
        {pulse && (
            <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 2s infinite', boxShadow: `0 0 8px ${color}` }} />
        )}
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <div>
            <p style={{ color: '#e4ebf5ff', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, marginBottom: 2 }}>{label}</p>
            <p style={{ color: color, fontSize: 24, fontWeight: 800, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            {sub && <p style={{ color: '#475569', fontSize: 12, margin: '3px 0 0', fontWeight: 500 }}>{sub}</p>}
        </div>
    </div>
);

export const InventoryStats: React.FC<StatsProps> = ({
    stockTotal,
    stockDisponible,
    stockReservado,
    totalReferencias,
    bajoMinimo,
    agotadas,
    loading
}) => {
    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ background: 'rgba(236, 231, 231, 0.04)', borderRadius: 16, height: 92, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
            </div>
        );
    }

    const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 1 });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <KPICard
                label="Stock Total"
                value={fmt(stockTotal)}
                sub="Unidades físicas"
                icon={<Database size={22} color="#6366f1" />}
                color="#6366f1"
                bgColor="rgba(255, 255, 255, 0.72)"
                borderColor="rgba(15,23,42,0.08)"
            />
            <KPICard
                label="Stock Disponible"
                value={fmt(stockDisponible)}
                sub="Total – Reservado"
                icon={<Package size={22} color="#10b981" />}
                color="#10b981"
                bgColor="rgba(255, 255, 255, 0.72)"
                borderColor="rgba(16,185,129,0.2)"
            />
            <KPICard
                label="Material Reservado"
                value={fmt(stockReservado)}
                sub="En producción activa"
                icon={<Lock size={22} color="#f59e0b" />}
                color="#f59e0b"
                bgColor="rgba(245,158,11,0.07)"
                borderColor="rgba(245,158,11,0.2)"
            />
            <KPICard
                label="Referencias MP"
                value={totalReferencias}
                sub="Total catálogo"
                icon={<Package size={22} color="#8b5cf6" />}
                color="#8b5cf6"
                bgColor="rgba(139,92,246,0.07)"
                borderColor="rgba(139,92,246,0.2)"
            />
            <KPICard
                label="Bajo Mínimo"
                value={bajoMinimo}
                sub="Requieren reposición"
                icon={<TrendingDown size={22} color="#f97316" />}
                color={bajoMinimo > 0 ? '#f97316' : '#64748b'}
                bgColor={bajoMinimo > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(100,116,139,0.06)'}
                borderColor={bajoMinimo > 0 ? 'rgba(249,115,22,0.25)' : 'rgba(100,116,139,0.15)'}
                pulse={bajoMinimo > 0}
            />
            <KPICard
                label="Agotadas"
                value={agotadas}
                sub="Stock disponible = 0"
                icon={<XCircle size={22} color={agotadas > 0 ? '#ef4444' : '#64748b'} />}
                color={agotadas > 0 ? '#ef4444' : '#64748b'}
                bgColor={agotadas > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.06)'}
                borderColor={agotadas > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.15)'}
                pulse={agotadas > 0}
            />
        </div>
    );
};
