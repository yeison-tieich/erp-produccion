import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, ShieldCheck, Wrench, X } from 'lucide-react';
import { API_URL } from '../../api';

interface ConsistencyIssue {
    tipo: string;
    mensaje: string;
    severidad: 'CRITICA' | 'ALTA' | 'MEDIA';
}

interface ConsistencyReport {
    consistent: boolean;
    totalInconsistencias: number;
    issues: ConsistencyIssue[];
}

interface Props {
    onCleanReservations?: () => void;
}

export const InventoryConsistencyWidget: React.FC<Props> = ({ onCleanReservations }) => {
    const [report, setReport] = useState<ConsistencyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [cleaning, setCleaning] = useState(false);

    const fetchConsistency = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/inventory/consistency`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReport(response.data);
        } catch (error) {
            console.error('Error fetching consistency:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsistency();
    }, []);

    const handleClean = async () => {
        if (!confirm('¿Confirmar limpieza de reservas huérfanas? Esta acción liberará el stock retenido por OTs ya finalizadas.')) return;
        setCleaning(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/inventory/clean-stranded-reservations`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Las reservas huérfanas fueron saneadas. La salud del inventario se actualizará.');
            await fetchConsistency();
            onCleanReservations?.();
        } catch (error: any) {
            alert(`Error: ${error.response?.data?.error || 'Error al limpiar reservas'}`);
        } finally {
            setCleaning(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', borderRadius: 12, padding: '12px 18px', border: '1px solid #bfdbfe' }}>
                <RefreshCw size={16} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#475569', fontSize: 14 }}>Verificando consistencia del inventario...</span>
            </div>
        );
    }

    if (!report) return null;

    const isConsistent = report.consistent;
    const highSeverity = report.issues.filter(issue => issue.severidad === 'CRITICA' || issue.severidad === 'ALTA');
    const totalIssues = report.totalInconsistencias;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                    background: isConsistent ? '#f0fdf4' : highSeverity.length > 0 ? '#fef2f2' : '#fffbeb',
                    borderRadius: 12, padding: '12px 18px',
                    border: `1px solid ${isConsistent ? '#bbf7d0' : highSeverity.length > 0 ? '#fecaca' : '#fde68a'}`
                }}
            >
                {isConsistent ? <ShieldCheck size={20} color="#16a34a" /> : <AlertTriangle size={20} color={highSeverity.length > 0 ? '#dc2626' : '#d97706'} />}
                <div style={{ flex: 1 }}>
                    <p style={{ color: isConsistent ? '#15803d' : highSeverity.length > 0 ? '#b91c1c' : '#b45309', fontWeight: 700, fontSize: 14, margin: 0 }}>
                        {isConsistent ? 'Inventario consistente' : `${totalIssues} inconsistencia${totalIssues !== 1 ? 's' : ''} detectada${totalIssues !== 1 ? 's' : ''}`}
                    </p>
                    <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                        {isConsistent ? 'Sin anomalías. Haz clic para ver el reporte.' : `${highSeverity.length} crítica${highSeverity.length !== 1 ? 's' : ''}. Haz clic para revisar y corregir.`}
                    </p>
                </div>
                <ChevronRight size={16} color="#64748b" />
            </button>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(15,23,42,0.18)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {isConsistent ? <CheckCircle2 size={22} color="#16a34a" /> : <AlertTriangle size={22} color="#d97706" />}
                                <div>
                                    <h3 style={{ color: '#1e293b', fontWeight: 700, fontSize: 17, margin: 0 }}>Salud del Inventario</h3>
                                    <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{totalIssues} inconsistencia{totalIssues !== 1 ? 's' : ''} detectada{totalIssues !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={fetchConsistency} title="Actualizar alertas" style={{ padding: 7, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', color: '#2563eb', display: 'flex' }}>
                                    <RefreshCw size={15} />
                                </button>
                                <button onClick={() => setShowModal(false)} title="Cerrar" style={{ padding: 7, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {isConsistent ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <ShieldCheck size={56} color="#16a34a" style={{ marginBottom: 16 }} />
                                    <h4 style={{ color: '#15803d', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Todo en orden</h4>
                                    <p style={{ color: '#64748b', fontSize: 14 }}>No se detectaron inconsistencias en el inventario de materia prima.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {report.issues.map((issue, index) => {
                                        const critical = issue.severidad === 'CRITICA' || issue.severidad === 'ALTA';
                                        return (
                                            <div key={`${issue.tipo}-${index}`} style={{ background: critical ? '#fef2f2' : '#fffbeb', border: `1px solid ${critical ? '#fecaca' : '#fde68a'}`, borderRadius: 12, padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                                                    <p style={{ color: '#1e293b', fontWeight: 600, fontSize: 14, margin: 0 }}>{issue.tipo}</p>
                                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: critical ? '#fee2e2' : '#fef3c7', color: critical ? '#b91c1c' : '#b45309' }}>{issue.severidad}</span>
                                                </div>
                                                <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>{issue.mensaje}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {!isConsistent && (
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={handleClean} disabled={cleaning} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: cleaning ? 'not-allowed' : 'pointer', background: '#2563eb', color: 'white', fontWeight: 600, fontSize: 14, opacity: cleaning ? 0.7 : 1 }}>
                                    <Wrench size={16} />
                                    {cleaning ? 'Limpiando...' : 'Limpiar reservas huerfanas'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
