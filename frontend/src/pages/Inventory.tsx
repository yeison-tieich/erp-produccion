import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
    Package, Plus, Search, AlertCircle, ArrowUpCircle,
    Edit3, X, Eye, History, Filter, RotateCcw,
    BarChart2, Lock, ShieldCheck, ArrowDownCircle,
    RefreshCw, ChevronDown, CheckSquare, Layers
} from 'lucide-react';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { StockStackedBarChart } from '../components/inventory/StockStackedBarChart';
import { InventoryConsistencyWidget } from '../components/inventory/InventoryConsistencyWidget';
import { MaterialForm } from '../components/inventory/MaterialForm';
import { AddStockModal } from '../components/inventory/AddStockModal';
import { formatNumber, formatUnit, formatCurrency } from '../utils/formatting';
import { materiaPrimaRepository } from '../repositories/materiaPrimaRepository';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Material {
    id: number;
    sku_mp: string;
    nombre_mp: string;
    categoria_mp: string;
    stock_actual: number;
    stock_reservado: number;
    devoluciones?: number;
    punto_reorden: number;
    unidad_medida_stock: string;
    espesor?: number;
    ancho?: number;
    largo?: number;
    densidad?: number;
    peso_unitario?: number;
    costo_unitario?: number;
}

interface DashboardData {
    kpis: {
        stockTotal: number;
        stockReservado: number;
        stockDisponible: number;
        totalReferencias: number;
        bajoMinimo: number;
        agotadas: number;
    };
    chartData: any[];
    ultimosMovimientos: any[];
}

type Tab = 'dashboard' | 'catalogo' | 'historial' | 'reservas' | 'auditoria';

const emptyMaterial = {
    sku_mp: '',
    nombre_mp: '',
    categoria_mp: '',
    unidad_medida_stock: '',
    stock_actual: 0,
    stock_reservado: 0,
    devoluciones: 0,
    punto_reorden: 0,
    espesor: 0,
    ancho: 0,
    largo: 0,
    densidad: 7.85,
    peso_unitario: 0,
    costo_unitario: 0,
};

// ─── Utility ─────────────────────────────────────────────────────────────────

const statusInfo = (m: Material) => {
    const disp = Number(m.stock_actual) - Number(m.stock_reservado);
    if (disp <= 0) return { label: 'AGOTADO', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
    if (disp <= Number(m.punto_reorden)) return { label: 'BAJO MÍNIMO', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'NORMAL', color: '#09553c', bg: 'rgba(16,185,129,0.12)' };
};

const movTypeColor = (tipo: string) => {
    if (tipo?.includes('CONSUMO') || tipo?.includes('Consumo')) return '#ef4444';
    if (tipo?.includes('RESERVA') || tipo?.includes('proceso')) return '#f59e0b';
    if (tipo?.includes('LIBERACION') || tipo?.includes('Devolución') || tipo?.includes('sobrante')) return '#8b5cf6';
    if (tipo?.includes('Ingreso') || tipo?.includes('SALDO') || tipo?.includes('Ajuste')) return '#0a724f';
    return '#1b1d20';
};

const fmtDate = (d: string) => new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
const fmtNum = (n: any) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });

// ─── Main Component ──────────────────────────────────────────────────────────

export const Inventory = () => {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [allMovements, setAllMovements] = useState<any[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(false);
    const [auditData, setAuditData] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('TODOS');
    const [filterCategoria, setFilterCategoria] = useState('TODAS');
    const [movSearch, setMovSearch] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [materialFormData, setMaterialFormData] = useState<any>(emptyMaterial);
    const [detailMovements, setDetailMovements] = useState<any[]>([]);
    const [loadingDetailMov, setLoadingDetailMov] = useState(false);

    const [reconcilingId, setReconcilingId] = useState<number | null>(null);

    const token = () => localStorage.getItem('token');
    const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    // ── Fetchers ────────────────────────────────────────────────────────────

    const fetchMaterials = useCallback(async () => {
        try {
            const data = await materiaPrimaRepository.getAll();
            setMaterials(data.map(material => ({
                ...material,
                id: material.id ?? material.id_server ?? 0
            })) as Material[]);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    const fetchDashboard = useCallback(async () => {
        setDashboardLoading(true);
        try {
            const res = await axios.get(`${API_URL}/inventory/dashboard-stock`, authHeaders());
            setDashboardData(res.data);
        } catch (e) { console.error(e); }
        finally { setDashboardLoading(false); }
    }, []);

    const fetchAllMovements = useCallback(async () => {
        if (allMovements.length > 0) return;
        setMovementsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/inventory/all-movements?limit=200`, authHeaders());
            setAllMovements(res.data.movements || []);
        } catch (e) { console.error(e); }
        finally { setMovementsLoading(false); }
    }, [allMovements.length]);

    const fetchReservations = useCallback(async () => {
        setReservationsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/inventory/reservations`, authHeaders());
            setReservations(res.data);
        } catch (e) { console.error(e); }
        finally { setReservationsLoading(false); }
    }, []);

    const fetchAudit = useCallback(async () => {
        setAuditLoading(true);
        try {
            const res = await axios.get(`${API_URL}/inventory/audit-completed-ots`, authHeaders());
            setAuditData(res.data);
        } catch (e) { console.error(e); }
        finally { setAuditLoading(false); }
    }, []);

    useEffect(() => {
        fetchMaterials();
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (activeTab === 'historial') fetchAllMovements();
        if (activeTab === 'reservas') fetchReservations();
        if (activeTab === 'auditoria') fetchAudit();
    }, [activeTab]);

    const handleRefresh = () => {
        setAllMovements([]);
        fetchMaterials();
        fetchDashboard();
        if (activeTab === 'historial') { setAllMovements([]); setTimeout(fetchAllMovements, 100); }
        if (activeTab === 'reservas') fetchReservations();
        if (activeTab === 'auditoria') fetchAudit();
    };

    // ── Material detail ─────────────────────────────────────────────────────

    const openDetail = async (mat: Material) => {
        setSelectedMaterial(mat);
        setShowDetailModal(true);
        setLoadingDetailMov(true);
        try {
            const id = (mat as any).id || (mat as any).id_server;
            const res = await axios.get(`${API_URL}/inventory/${id}/movements`, authHeaders());
            setDetailMovements(res.data);
        } catch { setDetailMovements([]); }
        finally { setLoadingDetailMov(false); }
    };

    const handleReconcile = async (otId: number) => {
        if (!confirm('¿Confirmar reconciliación? Se consumirán los materiales pendientes de esta OT.')) return;
        setReconcilingId(otId);
        try {
            await axios.post(`${API_URL}/inventory/reconcile-ot/${otId}`, {}, authHeaders());
            await fetchAudit();
            await fetchDashboard();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Error al reconciliar');
        } finally { setReconcilingId(null); }
    };

    const openCreateMaterial = () => {
        setMaterialFormData({ ...emptyMaterial });
        setShowCreateModal(true);
    };

    const openEditMaterial = (material: Material) => {
        setSelectedMaterial(material);
        setMaterialFormData({ ...material });
        setShowEditModal(true);
    };

    const handleMaterialSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            if (showEditModal && selectedMaterial) {
                await materiaPrimaRepository.update('', selectedMaterial.id, materialFormData);
            } else {
                await materiaPrimaRepository.create(materialFormData);
            }
            setShowCreateModal(false);
            setShowEditModal(false);
            await Promise.all([fetchMaterials(), fetchDashboard()]);
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'No fue posible guardar el material');
        }
    };

    // ── Filtering ───────────────────────────────────────────────────────────

    const categorias = ['TODAS', ...Array.from(new Set(materials.map(m => m.categoria_mp))).sort()];

    const filteredMaterials = materials.filter(m => {
        const disp = Number(m.stock_actual) - Number(m.stock_reservado);
        const st = statusInfo(m);
        const matchSearch = !searchTerm || m.nombre_mp.toLowerCase().includes(searchTerm.toLowerCase()) || m.sku_mp.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEstado = filterEstado === 'TODOS' || st.label === filterEstado;
        const matchCat = filterCategoria === 'TODAS' || m.categoria_mp === filterCategoria;
        return matchSearch && matchEstado && matchCat;
    });

    const filteredMovements = allMovements.filter(mv =>
        !movSearch || mv.materiaPrima?.nombre_mp?.toLowerCase().includes(movSearch.toLowerCase()) ||
        mv.tipo_movimiento?.toLowerCase().includes(movSearch.toLowerCase()) ||
        mv.referencia_id?.toLowerCase().includes(movSearch.toLowerCase()) ||
        mv.ordenTrabajo?.numero_ot?.toLowerCase().includes(movSearch.toLowerCase())
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard de Stock', icon: <BarChart2 size={16} /> },
        { id: 'catalogo', label: 'Inventario', icon: <Package size={16} /> },
        { id: 'historial', label: 'Historial', icon: <History size={16} /> },
        { id: 'reservas', label: 'Reservas Activas', icon: <Lock size={16} /> },
        { id: 'auditoria', label: 'Auditoría', icon: <ShieldCheck size={16} /> },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', color: '#1e293b' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1e293b' }}>
                        Materia Prima
                    </h1>
                    <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Control de inventario, reservas y trazabilidad completa</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleRefresh}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                        <RefreshCw size={15} /> Actualizar
                    </button>
                    <button
                        onClick={openCreateMaterial}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#2563eb', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
                    >
                        <Plus size={15} /> Nueva MP
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 14, padding: 5, flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
                            borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            transition: 'all 0.2s ease',
                            background: activeTab === tab.id ? '#2563eb' : 'transparent',
                            color: activeTab === tab.id ? 'white' : '#2d3035',
                            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(37,99,235,0.2)' : 'none'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── DASHBOARD TAB ─────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* KPI Cards */}
                    <InventoryStats
                        stockTotal={dashboardData?.kpis.stockTotal ?? 0}
                        stockDisponible={dashboardData?.kpis.stockDisponible ?? 0}
                        stockReservado={dashboardData?.kpis.stockReservado ?? 0}
                        totalReferencias={dashboardData?.kpis.totalReferencias ?? 0}
                        bajoMinimo={dashboardData?.kpis.bajoMinimo ?? 0}
                        agotadas={dashboardData?.kpis.agotadas ?? 0}
                        loading={dashboardLoading}
                    />

                    {/* Consistency Widget */}
                    <InventoryConsistencyWidget onCleanReservations={handleRefresh} />

                    {/* Chart + Recent Movements */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                        {/* Chart */}
                        <div style={{ background: 'rgba(250, 250, 250, 0.72)', borderRadius: 18, border: '1px solid rgba(15,23,42,0.07)', padding: '22px 24px', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                                <h2 style={{ color: '#1e293b', fontWeight: 700, fontSize: 16, margin: 0 }}>Stock por Referencia</h2>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        placeholder="Buscar referencia…"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid #3b4149', background: '#c5d3e0', color: '#1e293b', fontSize: 13, width: 170 }}
                                    />
                                    <select
                                        value={filterEstado}
                                        onChange={e => setFilterEstado(e.target.value)}
                                        style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid #bfdbfe', background: '#ffffff', color: '#1e293b', fontSize: 13 }}
                                    >
                                        <option value="TODOS">Todos</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="BAJO MÍNIMO">Bajo Mínimo</option>
                                        <option value="AGOTADO">Agotado</option>
                                    </select>
                                </div>
                            </div>
                            <StockStackedBarChart
                                data={dashboardData?.chartData ?? []}
                                loading={dashboardLoading}
                                searchTerm={searchTerm}
                                filterEstado={filterEstado === 'TODOS' ? undefined : filterEstado}
                            />
                        </div>

                        {/* Recent Movements */}
                        <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 18, border: '1px solid rgba(15,23,42,0.07)', padding: '22px 20px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
                            <h2 style={{ color: '#1e293b', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>Últimos Movimientos</h2>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(dashboardData?.ultimosMovimientos ?? []).map((mv: any) => (
                                    <div key={mv.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${movTypeColor(mv.tipo_movimiento)}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                            <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mv.materiaPrima?.nombre_mp}</span>
                                            <span style={{ color: Number(mv.cantidad) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                                {Number(mv.cantidad) >= 0 ? '+' : ''}{fmtNum(mv.cantidad)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 4 }}>
                                            <span style={{ color: movTypeColor(mv.tipo_movimiento), fontSize: 11, fontWeight: 600 }}>{mv.tipo_movimiento}</span>
                                            <span style={{ color: '#475569', fontSize: 11 }}>{fmtDate(mv.fecha_hora)}</span>
                                        </div>
                                    </div>
                                ))}
                                {!dashboardLoading && !dashboardData?.ultimosMovimientos?.length && (
                                    <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>Sin movimientos recientes</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CATÁLOGO TAB ──────────────────────────────────────────────── */}
            {activeTab === 'catalogo' && (
                <div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <Search size={15} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                placeholder="Buscar por nombre o SKU…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#ffffff', color: '#1e293b', fontSize: 14, boxSizing: 'border-box' }}
                            />
                        </div>
                        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#ffffff', color: '#1e293b', fontSize: 14 }}>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#ffffff', color: '#1e293b', fontSize: 14 }}>
                            <option value="TODOS">Todos los estados</option>
                            <option value="NORMAL">Normal</option>
                            <option value="BAJO MÍNIMO">Bajo Mínimo</option>
                            <option value="AGOTADO">Agotado</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 16, border: '1px solid rgba(15,23,42,0.07)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                        {['SKU / Código', 'Material', 'Categoría', 'Stock Total', 'Reservado', 'Disponible', 'Mín.', 'Estado', 'Acciones'].map(h => (
                                            <th key={h} style={{ padding: '13px 14px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i}><td colSpan={9} style={{ padding: '12px 14px' }}><div style={{ height: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} /></td></tr>
                                        ))
                                    ) : filteredMaterials.length === 0 ? (
                                        <tr><td colSpan={9} style={{ padding: '48px 14px', textAlign: 'center', color: '#475569' }}>Sin materiales que coincidan con la búsqueda</td></tr>
                                    ) : filteredMaterials.map(mat => {
                                        const disp = Number(mat.stock_actual) - Number(mat.stock_reservado);
                                        const st = statusInfo(mat);
                                        return (
                                            <tr key={mat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <td style={{ padding: '12px 14px', color: '#6366f1', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{mat.sku_mp}</td>
                                                <td style={{ padding: '12px 14px', color: '#222427', fontSize: 14, fontWeight: 600 }}>{mat.nombre_mp}</td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: 12, fontWeight: 600 }}>{mat.categoria_mp}</span>
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#2e3033', fontSize: 14, fontWeight: 600 }}>{fmtNum(mat.stock_actual)} <span style={{ color: '#475569', fontSize: 12 }}>{mat.unidad_medida_stock}</span></td>
                                                <td style={{ padding: '12px 14px', color: '#35332f', fontSize: 14, fontWeight: 600 }}>{fmtNum(mat.stock_reservado)}</td>
                                                <td style={{ padding: '12px 14px', color: disp <= 0 ? '#ef4444' : '#10b981', fontSize: 14, fontWeight: 700 }}>{fmtNum(disp)}</td>
                                                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 13 }}>{fmtNum(mat.punto_reorden)}</td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: 8, background: st.bg, color: st.color, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => openDetail(mat)} title="Ver detalle" style={{ padding: '6px', borderRadius: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', color: '#818cf8', display: 'flex' }}>
                                                            <Eye size={14} />
                                                        </button>
                                                        <button onClick={() => { setSelectedMaterial(mat); setShowAddModal(true); }} title="Agregar stock" style={{ padding: '6px', borderRadius: 7, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', color: '#10b981', display: 'flex' }}>
                                                            <ArrowUpCircle size={14} />
                                                        </button>
                                                        <button onClick={() => openEditMaterial(mat)} title="Editar" style={{ padding: '6px', borderRadius: 7, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', color: '#f59e0b', display: 'flex' }}>
                                                            <Edit3 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 13 }}>
                            {filteredMaterials.length} de {materials.length} referencias
                        </div>
                    </div>
                </div>
            )}

            {/* ── HISTORIAL TAB ──────────────────────────────────────────────── */}
            {activeTab === 'historial' && (
                <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <Search size={15} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                placeholder="Buscar por material, tipo, OT…"
                                value={movSearch}
                                onChange={e => setMovSearch(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.07)', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                            />
                        </div>
                        <button onClick={() => { setAllMovements([]); fetchAllMovements(); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, color: '#818cf8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <RefreshCw size={14} /> Recargar
                        </button>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                        {['Fecha / Hora', 'Material', 'Tipo Movimiento', 'Cantidad', 'Stock Ant.', 'Stock Post.', 'OT / Referencia', 'Usuario', 'Observación'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {movementsLoading ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <tr key={i}><td colSpan={9} style={{ padding: '10px 14px' }}><div style={{ height: 22, background: 'rgba(255,255,255,0.04)', borderRadius: 5, animation: 'pulse 1.5s infinite' }} /></td></tr>
                                        ))
                                    ) : filteredMovements.length === 0 ? (
                                        <tr><td colSpan={9} style={{ padding: '40px 14px', textAlign: 'center', color: '#475569' }}>Sin movimientos</td></tr>
                                    ) : filteredMovements.map(mv => (
                                        <tr key={mv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(mv.fecha_hora)}</td>
                                            <td style={{ padding: '11px 14px', color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{mv.materiaPrima?.nombre_mp}</td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ padding: '3px 9px', borderRadius: 7, background: `${movTypeColor(mv.tipo_movimiento)}18`, color: movTypeColor(mv.tipo_movimiento), fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{mv.tipo_movimiento}</span>
                                            </td>
                                            <td style={{ padding: '11px 14px', color: Number(mv.cantidad) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                                                {Number(mv.cantidad) >= 0 ? '+' : ''}{fmtNum(mv.cantidad)}
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 13 }}>{mv.stock_anterior != null ? fmtNum(mv.stock_anterior) : '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 13 }}>{mv.stock_posterior != null ? fmtNum(mv.stock_posterior) : '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#6366f1', fontSize: 13, fontFamily: 'monospace' }}>{mv.ordenTrabajo?.numero_ot || mv.referencia_id || '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{mv.usuario_nombre || '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#475569', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mv.observacion || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 13 }}>
                            {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            )}

            {/* ── RESERVAS TAB ───────────────────────────────────────────────── */}
            {activeTab === 'reservas' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                            Material actualmente retenido en órdenes de producción activas
                        </p>
                        <button onClick={fetchReservations} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, color: '#818cf8', cursor: 'pointer', fontSize: 13 }}>
                            <RefreshCw size={14} /> Actualizar
                        </button>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                        {['OT', 'Estado OT', 'Cliente', 'Producto', 'Material Reservado', 'Cantidad', 'Unidad', 'Fecha Reserva'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservationsLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div style={{ height: 22, background: 'rgba(255,255,255,0.04)', margin: '8px 14px', borderRadius: 5, animation: 'pulse 1.5s infinite' }} /></td></tr>)
                                    ) : reservations.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '48px 14px', textAlign: 'center', color: '#475569' }}>
                                            <Lock size={36} color="#334155" style={{ display: 'block', margin: '0 auto 10px' }} />
                                            Sin reservas activas — todo el material está disponible
                                        </td></tr>
                                    ) : reservations.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.04)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '11px 14px', color: '#6366f1', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{r.ordenTrabajo?.numero_ot || '—'}</td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ padding: '3px 9px', borderRadius: 7, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{r.ordenTrabajo?.estado_ot}</span>
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 13 }}>{r.ordenTrabajo?.cliente || '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#cbd5e1', fontSize: 13 }}>{r.ordenTrabajo?.producto?.nombre_producto || '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{r.materiaPrima?.nombre_mp}</td>
                                            <td style={{ padding: '11px 14px', color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>{fmtNum(r.cantidad)}</td>
                                            <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 13 }}>{r.materiaPrima?.unidad_medida_stock}</td>
                                            <td style={{ padding: '11px 14px', color: '#475569', fontSize: 12 }}>{fmtDate(r.fecha_hora)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {reservations.length > 0 && (
                            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 13 }}>
                                {reservations.length} reserva{reservations.length !== 1 ? 's' : ''} activa{reservations.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── AUDITORÍA TAB ──────────────────────────────────────────────── */}
            {activeTab === 'auditoria' && (
                <div>
                    <div style={{ background: 'rgba(245,158,11,0.07)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <p style={{ color: '#fcd34d', fontWeight: 700, fontSize: 14, margin: 0, marginBottom: 4 }}>Auditoría de Inconsistencias</p>
                            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                                OTs completadas que no registraron consumo de materiales. Puedes reconciliar individualmente cada orden para corregir el inventario histórico.
                                <strong style={{ color: '#fcd34d' }}> Esta acción es irreversible — verifique antes de proceder.</strong>
                            </p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                        {['OT', 'Estado', 'Tipo', 'Cliente', 'Fecha Cierre', 'Materiales Consumidos', 'Materiales Requeridos', 'Acción'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div style={{ height: 22, background: 'rgba(255,255,255,0.04)', margin: '8px 14px', borderRadius: 5, animation: 'pulse 1.5s infinite' }} /></td></tr>)
                                    ) : auditData.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '48px 14px', textAlign: 'center', color: '#475569' }}>
                                            <CheckSquare size={36} color="#334155" style={{ display: 'block', margin: '0 auto 10px' }} />
                                            Sin OTs inconsistentes — el inventario histórico está correcto
                                        </td></tr>
                                    ) : auditData.map((ot: any) => (
                                        <tr key={ot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '11px 14px', color: '#6366f1', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{ot.numero_ot}</td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ padding: '3px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 12, fontWeight: 700 }}>{ot.estado_ot}</span>
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 13 }}>{ot.tipo_orden}</td>
                                            <td style={{ padding: '11px 14px', color: '#cbd5e1', fontSize: 13 }}>{ot.cliente || '—'}</td>
                                            <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{ot.fecha_fin_real ? fmtDate(ot.fecha_fin_real) : '—'}</td>
                                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                                                {ot.materiales_consumidos
                                                    ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Sí</span>
                                                    : <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ No</span>
                                                }
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12 }}>
                                                {ot.materialesRequeridos?.length ?? '—'} material(es)
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                {!ot.materiales_consumidos ? (
                                                    <button
                                                        onClick={() => handleReconcile(ot.id)}
                                                        disabled={reconcilingId === ot.id}
                                                        style={{
                                                            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: reconcilingId === ot.id ? 'not-allowed' : 'pointer',
                                                            background: reconcilingId === ot.id ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                                            color: 'white', fontSize: 12, fontWeight: 700, opacity: reconcilingId === ot.id ? 0.7 : 1,
                                                            display: 'flex', alignItems: 'center', gap: 6
                                                        }}
                                                    >
                                                        <RotateCcw size={12} />
                                                        {reconcilingId === ot.id ? 'Reconciliando…' : 'Reconciliar'}
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#334155', fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODALS ─────────────────────────────────────────────────────── */}

            {/* Detail Modal */}
            {showDetailModal && selectedMaterial && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(15,23,42,0.18)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ color: '#1e293b', fontWeight: 800, fontSize: 18, margin: 0 }}>{selectedMaterial.nombre_mp}</h3>
                                <p style={{ color: '#6366f1', fontSize: 13, margin: '4px 0 0', fontFamily: 'monospace' }}>{selectedMaterial.sku_mp} · {selectedMaterial.categoria_mp}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} title="Cerrar detalle" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px', cursor: 'pointer', color: '#64748b' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Stock summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {[
                                { label: 'Stock Total', value: fmtNum(selectedMaterial.stock_actual), unit: selectedMaterial.unidad_medida_stock, color: '#6366f1' },
                                { label: 'Reservado', value: fmtNum(selectedMaterial.stock_reservado), unit: selectedMaterial.unidad_medida_stock, color: '#f59e0b' },
                                { label: 'Disponible', value: fmtNum(Number(selectedMaterial.stock_actual) - Number(selectedMaterial.stock_reservado)), unit: selectedMaterial.unidad_medida_stock, color: '#10b981' },
                            ].map(s => (
                                <div key={s.label} style={{ background: `${s.color}10`, borderRadius: 12, padding: '12px 14px', border: `1px solid ${s.color}25` }}>
                                    <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</p>
                                    <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: 0 }}>{s.value} <span style={{ fontSize: 13, fontWeight: 500 }}>{s.unit}</span></p>
                                </div>
                            ))}
                        </div>

                        {/* Movement history */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                            <h4 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Historial de Movimientos</h4>
                            {loadingDetailMov ? (
                                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Cargando movimientos…</div>
                            ) : detailMovements.length === 0 ? (
                                <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Sin movimientos registrados</p>
                            ) : detailMovements.map(mv => (
                                <div key={mv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: movTypeColor(mv.tipo_movimiento), flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: movTypeColor(mv.tipo_movimiento), fontSize: 13, fontWeight: 700 }}>{mv.tipo_movimiento}</span>
                                            <span style={{ color: Number(mv.cantidad) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                                                {Number(mv.cantidad) >= 0 ? '+' : ''}{fmtNum(mv.cantidad)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                            <span style={{ color: '#475569', fontSize: 12 }}>{mv.referencia_id || mv.observacion || '—'}</span>
                                            <span style={{ color: '#334155', fontSize: 12 }}>{fmtDate(mv.fecha_hora)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Stock Modal */}
            {showAddModal && selectedMaterial && (
                <AddStockModal
                    material={selectedMaterial}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchMaterials();
                        fetchDashboard();
                    }}
                />
            )}

            {/* Create / Edit Material Modal */}
            {(showCreateModal || showEditModal) && (
                <MaterialForm
                    title={showEditModal ? 'Editar Material' : 'Nuevo Material'}
                    data={materialFormData}
                    setData={setMaterialFormData}
                    onSubmit={handleMaterialSubmit}
                    onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
                    isEdit={showEditModal}
                />
            )}
        </div>
    );
};
