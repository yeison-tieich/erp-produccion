
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users, Plus, Search, User, CreditCard,
    Briefcase, DollarSign, Award, Activity,
    Clock, Trash2, Edit2, X, Check, Calendar,
    ShieldCheck, Filter, FileText, ChevronRight, Wrench, Eye, Download
} from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../api';

// Helper to handle dates without timezone shifting
const formatDateLocal = (dateString: string | undefined | null) => {
    if (!dateString) return '--';
    // Extracts YYYY-MM-DD and formats it as local
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString();
};

const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const sumUnpaidPermissionsThisMonth = (records: any[] = []) => {
    const currentMonth = formatToISODate(new Date()).slice(0, 7);
    return records
        .filter(record => record.tipo === 'Permiso' && !record.pagado && String(record.fecha).slice(0, 7) === currentMonth)
        .reduce((total, record) => total + (Number(record.horas) || 0), 0);
};

const parseISODateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    return dateString.substring(0, 10);
};

interface Personal {
    id: number;
    nombre: string;
    cedula: string;
    cargo: string;
    kpi_puntualidad: number | null;
    salario: number | null;
    calificacion: string | null;
    eficiencia: number | null;
    productividad: number | null;
    area: string;
    activo: boolean;
    registrosTiempo?: any[];
    dotaciones?: any[];
    tareas?: any[];
    prestamosHerramientas?: any[];
}

export const PersonalPage = () => {
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'nombre' | 'cargo' | 'horas_extras'>('nombre');

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showTimeLogModal, setShowTimeLogModal] = useState(false);
    const [showDotacionModal, setShowDotacionModal] = useState(false);
    const [showBulkOvertimeModal, setShowBulkOvertimeModal] = useState(false);
    const [isMarkingAllPaid, setIsMarkingAllPaid] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Personal | null>(null);
    const [detailedPerson, setDetailedPerson] = useState<Personal | null>(null);

    // Filter
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    const [showOvertimeSummary, setShowOvertimeSummary] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '',
        cedula: '',
        cargo: '',
        salario: '',
        calificacion: '',
        kpi_puntualidad: '',
        eficiencia: '',
        area: '',
        activo: true
    });

    const [timeLogForm, setTimeLogForm] = useState({
        id: null as number | null,
        tipo: 'Hora Extra',
        fecha: formatToISODate(new Date()),
        horas: '',
        motivo: ''
    });

    const [dotacionForm, setDotacionForm] = useState({
        item: 'Guantes de Vaqueta',
        cantidad: '1',
        comentarios: ''
    });

    const fetchPersonal = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/personal`);
            setPersonal(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (id: number) => {
        try {
            const res = await axios.get(`${API_URL}/personal/${id}`);
            setDetailedPerson(res.data);
            setShowDetailsModal(true);
        } catch (error) {
            alert('Error cargando detalles');
        }
    };

    useEffect(() => {
        fetchPersonal();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode && selectedPerson) {
                await axios.put(`${API_URL}/personal/${selectedPerson.id}`, formData);
            } else {
                await axios.post(`${API_URL}/personal`, formData);
            }
            setShowModal(false);
            fetchPersonal();
        } catch (error) {
            alert('Error guardando personal');
        }
    };

    const handleAddTimeLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPerson && !timeLogForm.id) return;
        try {
            if (timeLogForm.id) {
                await axios.put(`${API_URL}/personal/time-log/${timeLogForm.id}`, timeLogForm);
            } else if (selectedPerson) {
                await axios.post(`${API_URL}/personal/${selectedPerson.id}/time-log`, timeLogForm);
            }
            setShowTimeLogModal(false);
            if (showDetailsModal && detailedPerson?.id === selectedPerson?.id) fetchDetails(detailedPerson.id);
            fetchPersonal();
        } catch (error) {
            alert('Error registrando tiempo');
        }
    };

    const handleLlegadaTarde = async (person: Personal) => {
        try {
            await axios.post(`${API_URL}/personal/${person.id}/time-log`, {
                tipo: 'Llegada Tarde',
                fecha: formatToISODate(new Date()),
                horas: 0,
                motivo: `Hora de llegada: ${new Date().toLocaleTimeString()}`
            });
            fetchPersonal();
            if (showDetailsModal && detailedPerson?.id === person.id) fetchDetails(person.id);
        } catch (error) {
            alert('Error registrando llegada tarde');
        }
    };

    const handleAddDotacion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPerson) return;
        try {
            await axios.post(`${API_URL}/personal/${selectedPerson.id}/dotacion`, dotacionForm);
            setShowDotacionModal(false);
            if (showDetailsModal) fetchDetails(selectedPerson.id);
        } catch (error) {
            alert('Error registrando dotación');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
        try {
            await axios.delete(`${API_URL}/personal/${id}`);
            fetchPersonal();
        } catch (error) {
            alert('Error eliminando personal');
        }
    };

    const handleTogglePayment = async (logId: number, currentStatus: boolean) => {
        try {
            await axios.patch(`${API_URL}/personal/time-log/${logId}/toggle-payment`, { pagado: !currentStatus });
            if (detailedPerson) fetchDetails(detailedPerson.id);
            fetchPersonal();
        } catch (error) {
            alert('Error actualizando estado de pago');
        }
    };

    const handleMarkAllOvertimePaid = async () => {
        if (!confirm('¿Marcar como pagadas todas las horas extras pendientes?')) return;
        setIsMarkingAllPaid(true);
        try {
            const res = await axios.patch(`${API_URL}/personal/time-log/pay-all`);
            await fetchPersonal();
            if (showDetailsModal && detailedPerson) await fetchDetails(detailedPerson.id);
            alert(res.data.count > 0
                ? `Se marcaron ${res.data.count} registros como pagados.`
                : 'No hay horas extras pendientes por pagar.');
        } catch (error) {
            alert('Error marcando las horas extras como pagadas.');
        } finally {
            setIsMarkingAllPaid(false);
        }
    };

    const openEditModal = (person: Personal) => {
        setSelectedPerson(person);
        setFormData({
            nombre: person.nombre,
            cedula: person.cedula,
            cargo: person.cargo,
            salario: person.salario?.toString() || '',
            calificacion: person.calificacion || '',
            kpi_puntualidad: person.kpi_puntualidad?.toString() || '',
            eficiencia: person.eficiencia?.toString() || '',
            area: person.area || '',
            activo: person.activo
        });
        setEditMode(true);
        setShowModal(true);
    };

    const sortedPersonal = [...personal].sort((a, b) => {
        if (sortBy === 'nombre') {
            return a.nombre.localeCompare(b.nombre);
        } else if (sortBy === 'cargo') {
            return a.cargo.localeCompare(b.cargo);
        } else if (sortBy === 'horas_extras') {
            const aExtras = a.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc: number, curr: any) => acc + (Number(curr.horas) || 0), 0) || 0;
            const bExtras = b.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc: number, curr: any) => acc + (Number(curr.horas) || 0), 0) || 0;
            return bExtras - aExtras;
        }
        return 0;
    });

    const filteredPersonal = sortedPersonal.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTimeLogs = detailedPerson?.registrosTiempo?.filter(log => {
        if (!dateFilter.start && !dateFilter.end) return true;
        const logDateStr = log.fecha.substring(0, 10);
        const start = dateFilter.start || '0000-00-00';
        const end = dateFilter.end || '9999-99-99';
        return logDateStr >= start && logDateStr <= end;
    });

    const exportToCSV = () => {
        const rows = [
            ['Colaborador', 'Cargo', 'Horas Pendientes', 'Valor Est. Salario']
        ];
        let totalHoras = 0;
        let totalValor = 0;

        personal.forEach(person => {
            const pendingHours = person.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc: number, curr: any) => acc + (Number(curr.horas) || 0), 0) || 0;
            if (pendingHours === 0) return;

            const estimatedValue = person.salario ? (Number(person.salario) / 240) * pendingHours * 1.25 : 0;
            totalHoras += pendingHours;
            totalValor += estimatedValue;

            rows.push([
                `"${person.nombre}"`,
                `"${person.cargo}"`,
                pendingHours.toString(),
                estimatedValue.toFixed(2)
            ]);
        });

        rows.push(['Total General', '', totalHoras.toString(), totalValor.toFixed(2)]);

        const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `reporte_horas_extras_${formatToISODate(new Date())}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-gray-900">
                        <Users className="h-8 w-8 text-brand-600" /> Control de Personal
                    </h1>
                    <p className="mt-1 text-gray-500">Gestión administrativa, EPP y registro de tiempos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowOvertimeSummary(true)}
                        className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
                    >
                        <Clock className="h-4 w-4" /> Resumen horas extras
                    </button>
                    <button
                        onClick={() => setShowBulkOvertimeModal(true)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <Activity className="h-4 w-4" /> Registro masivo
                    </button>
                    <button
                        onClick={() => { setEditMode(false); setFormData({ nombre: '', cedula: '', cargo: '', salario: '', calificacion: '', kpi_puntualidad: '', eficiencia: '', area: '', activo: true }); setShowModal(true); }}
                        className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                    >
                        <Plus className="h-4 w-4" /> Vincular personal
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o cargo..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 font-medium transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                >
                    <option value="nombre">Ordenar por Alfabético</option>
                    <option value="cargo">Ordenar por Cargos</option>
                    <option value="horas_extras">Ordenar por Horas Extras</option>
                </select>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPersonal.map(person => (
                        <div key={person.id} className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg">
                            {/* Hover Actions */}
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => openEditModal(person)} className="p-3 bg-white shadow-lg text-gray-600 rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition">
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(person.id)} className="p-3 bg-white shadow-lg text-gray-600 rounded-2xl hover:bg-red-50 hover:text-red-600 transition">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 leading-tight text-xl truncate">{person.nombre}</h3>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{person.cargo}</span>
                                            {person.area && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• {person.area}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4" /> ID Cédula</span>
                                        <span className="font-mono font-black text-gray-700">{person.cedula}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center sm:grid-cols-3 xl:grid-cols-5">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Eficiencia</span>
                                            <span className="text-xl font-black text-gray-800">{person.eficiencia || '0'}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Puntual</span>
                                            <span className="text-xl font-black text-gray-800">{person.kpi_puntualidad || '0'}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-orange-500 uppercase block mb-1">H. Extras</span>
                                            <span className="text-xl font-black text-orange-600">
                                                {person.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc: number, curr: any) => acc + (Number(curr.horas) || 0), 0) || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-purple-500 uppercase block mb-1">Permisos mes</span>
                                            <span className="text-xl font-black text-purple-600">
                                                {sumUnpaidPermissionsThisMonth(person.registrosTiempo)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-red-500 uppercase block mb-1">Tardes Mes</span>
                                            <span className="text-xl font-black text-red-600">
                                                {person.registrosTiempo?.filter(r => r.tipo === 'Llegada Tarde' && r.fecha.substring(0, 7) === formatToISODate(new Date()).substring(0, 7)).length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={() => fetchDetails(person.id)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                                >
                                    <Eye className="w-4 h-4" /> Ver Detalles
                                </button>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                        onClick={() => {
                                            setSelectedPerson(person);
                                            setTimeLogForm({ id: null, tipo: 'Hora Extra', fecha: formatToISODate(new Date()), horas: '', motivo: '' });
                                            setShowTimeLogModal(true);
                                        }}
                                        className="rounded-xl border border-orange-200 bg-white py-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                                    >
                                        Extras/Permisos
                                    </button>
                                    <button
                                        onClick={() => { setSelectedPerson(person); setShowDotacionModal(true); }}
                                        className="rounded-xl border border-blue-200 bg-white py-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                    >
                                        Registrar EPP
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleLlegadaTarde(person)}
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                    <Clock className="w-4 h-4" /> Llegada Tarde
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: DETAILS */}
            {showDetailsModal && detailedPerson && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-5 lg:p-8">
                    <div className="flex h-full max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Header Details */}
                        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white p-4 text-slate-900 sm:p-6">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-14 sm:w-14">
                                    <User className="h-6 w-6 sm:h-7 sm:w-7" />
                                </div>
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <h2 className="truncate text-xl font-bold sm:text-2xl">{detailedPerson.nombre}</h2>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{detailedPerson.cargo}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                                        <p className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> {detailedPerson.cedula}</p>
                                        <p className="flex items-center gap-2 font-semibold text-green-700"><DollarSign className="h-4 w-4" /> Salario: ${detailedPerson.salario?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setShowDetailsModal(false); setDetailedPerson(null); }} aria-label="Cerrar detalles" className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                                {/* Left: Overtime & Permissions */}
                                <div className="space-y-5 lg:col-span-2">
                                    <div className="min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5">
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">Horas extras y permisos</h3>
                                                    <p className="mt-1 text-sm text-slate-500">Historial acumulado del trabajador.</p>
                                                </div>
                                                <div className="flex flex-wrap items-end gap-2">
                                                    <label className="text-xs font-medium text-slate-500">Desde<input type="date" className="mt-1 block rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-800" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} /></label>
                                                    <label className="text-xs font-medium text-slate-500">Hasta<input type="date" className="mt-1 block rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-800" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} /></label>
                                                    <button onClick={() => setDateFilter({ start: '', end: '' })} aria-label="Limpiar filtro de fechas" className="rounded-lg border border-slate-300 p-2.5 text-slate-600 transition hover:bg-slate-50"><Filter className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                                                    <span className="text-xs font-semibold text-orange-700">Extras pendientes</span>
                                                    <p className="mt-1 text-xl font-bold text-orange-800">{filteredTimeLogs?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc: number, curr: any) => acc + (Number(curr.horas) || 0), 0) || 0} hrs</p>
                                                </div>
                                                <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                                                    <span className="text-xs font-semibold text-purple-700">Permisos pendientes este mes</span>
                                                    <p className="mt-1 text-xl font-bold text-purple-800">{sumUnpaidPermissionsThisMonth(detailedPerson.registrosTiempo)} hrs</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto p-2 sm:p-4">
                                            <table className="w-full min-w-[720px] text-left">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        <th className="p-4">Fecha</th>
                                                        <th className="p-4">Tipo</th>
                                                        <th className="p-4 text-center">Horas</th>
                                                        <th className="p-4">Motivo / Descripción</th>
                                                        <th className="p-4 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                    {filteredTimeLogs?.map(log => (
                                                        <tr key={log.id} className={clsx("hover:bg-gray-50 transition-colors", log.pagado && "opacity-50 grayscale-[0.5]")}>
                                                            <td className="p-4">{formatDateLocal(log.fecha)}</td>
                                                            <td className="p-4">
                                                                <span className={clsx(
                                                                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase border",
                                                                    log.tipo === 'Hora Extra' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-purple-50 text-purple-600 border-purple-100"
                                                                )}>{log.tipo}</span>
                                                            </td>
                                                            <td className="p-4 text-center text-lg">{log.horas} <span className="text-[10px] text-gray-300">hrs</span></td>
                                                            <td className="p-4 text-gray-500 italic">{log.motivo || '--'}</td>
                                                            <td className="p-4 flex gap-2 justify-center">
                                                                <button
                                                                    onClick={() => handleTogglePayment(log.id, log.pagado)}
                                                                    className={clsx(
                                                                        "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all border uppercase",
                                                                        log.pagado
                                                                            ? "bg-green-50 text-green-600 border-green-200"
                                                                            : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-green-600 hover:text-white hover:border-green-600"
                                                                    )}
                                                                    title={log.pagado ? "Marcar Por Pagar" : "Marcar Pagado"}
                                                                >
                                                                    {log.pagado ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedPerson(detailedPerson);
                                                                        setTimeLogForm({
                                                                            id: log.id,
                                                                            tipo: log.tipo,
                                                                            fecha: parseISODateForInput(log.fecha),
                                                                            horas: log.horas?.toString() || '0',
                                                                            motivo: log.motivo || ''
                                                                        });
                                                                        setShowTimeLogModal(true);
                                                                    }}
                                                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
                                                                    title="Editar Registro"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredTimeLogs?.length === 0 && (
                                                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-black">-- NO HAY REGISTROS EN ESTE PERIODO --</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: PPE & Stats */}
                                <div className="space-y-8">
                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <ShieldCheck className="w-6 h-6 text-blue-600" /> Entrega de Dotación (EPP)
                                        </h3>
                                        <div className="space-y-4">
                                            {detailedPerson.dotaciones?.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="font-black text-slate-700">{item.item}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDateLocal(item.fecha_entrega)}</p>
                                                    </div>
                                                    <span className="bg-blue-600 text-white px-3 py-1 rounded-xl font-black text-xs">x{item.cantidad}</span>
                                                </div>
                                            ))}
                                            {detailedPerson.dotaciones?.length === 0 && (
                                                <p className="text-center py-10 text-gray-300 font-black uppercase text-xs">Sin dotaciones registradas</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <Wrench className="w-6 h-6 text-purple-600" /> Historial de Herramientas
                                        </h3>
                                        <div className="space-y-4">
                                            {detailedPerson.prestamosHerramientas?.map(loan => (
                                                <div key={loan.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx("p-2 rounded-lg", loan.estado === 'ACTIVO' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}>
                                                            <Wrench size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-700">{loan.herramienta?.nombre}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {formatDateLocal(loan.fecha_prestamo)} • {loan.cantidad} unidades
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={clsx(
                                                        "text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter",
                                                        loan.estado === 'ACTIVO' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                                                    )}>
                                                        {loan.estado}
                                                    </span>
                                                </div>
                                            ))}
                                            {detailedPerson.prestamosHerramientas?.length === 0 && (
                                                <p className="text-center py-10 text-gray-300 font-black uppercase text-xs">Sin préstamos de herramientas</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-brand-600 p-5 text-white shadow-sm">
                                        <h3 className="font-black text-sm uppercase tracking-widest mb-6 border-b border-brand-500 pb-4">Performance Resumen</h3>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-brand-200 uppercase">Productividad</span>
                                                <span className="text-3xl font-black">{detailedPerson.productividad || '0'}%</span>
                                            </div>
                                            <div className="w-full bg-brand-700 h-2.5 rounded-full overflow-hidden">
                                                <div className="bg-white h-full" style={{ width: `${detailedPerson.productividad || 0}%` }}></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mt-8">
                                                <div className="bg-brand-700/50 p-4 rounded-2xl border border-brand-500">
                                                    <span className="text-[10px] font-black uppercase block opacity-60">Tareas OK</span>
                                                    <span className="text-xl font-black">{detailedPerson.tareas?.length || 0}</span>
                                                </div>
                                                <div className="bg-brand-700/50 p-4 rounded-2xl border border-brand-500">
                                                    <span className="text-[10px] font-black uppercase block opacity-60">Incidencias</span>
                                                    <span className="text-xl font-black">0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: TIME LOG (Extras/Permisos) */}
            {showTimeLogModal && selectedPerson && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-slate-900">
                            <Clock className="h-6 w-6 text-orange-600" /> Registro de tiempo
                        </h2>
                        <form onSubmit={handleAddTimeLog} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Tipo de Registro</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none transition focus:border-brand-500 focus:bg-white"
                                    value={timeLogForm.tipo}
                                    onChange={e => setTimeLogForm({ ...timeLogForm, tipo: e.target.value })}
                                >
                                    <option value="Hora Extra">Hora Extra (+)</option>
                                    <option value="Permiso">Permiso / Ausencia (-)</option>
                                    <option value="Incapacidad">Incapacidad</option>
                                    <option value="Llegada Tarde">Llegada Tarde</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Fecha</label>
                                    <input type="date" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-medium" value={timeLogForm.fecha} onChange={e => setTimeLogForm({ ...timeLogForm, fecha: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Horas</label>
                                    <input type="number" step="0.5" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-semibold" value={timeLogForm.horas} onChange={e => setTimeLogForm({ ...timeLogForm, horas: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Observaciones</label>
                                <textarea className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium outline-none focus:border-brand-500" value={timeLogForm.motivo} onChange={e => setTimeLogForm({ ...timeLogForm, motivo: e.target.value })} placeholder="Ej: Trabajo en domingo OT-123"></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowTimeLogModal(false)} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700">{timeLogForm.id ? 'Actualizar' : 'Registrar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DOTACION (EPP) */}
            {showDotacionModal && selectedPerson && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-slate-900">
                            <ShieldCheck className="h-6 w-6 text-blue-600" /> Entrega de EPP / Dotación
                        </h2>
                        <form onSubmit={handleAddDotacion} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Elemento de Protección</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
                                    value={dotacionForm.item}
                                    onChange={e => setDotacionForm({ ...dotacionForm, item: e.target.value })}
                                >
                                    <option value="Guantes de Vaqueta">Guantes de Vaqueta</option>
                                    <option value="Guantes de Nitrilo">Guantes de Nitrilo</option>
                                    <option value="Botas de Seguridad">Botas de Seguridad</option>
                                    <option value="Overol / Dotación">Overol / Dotación</option>
                                    <option value="Protección Auditiva">Protección Auditiva</option>
                                    <option value="Gafas Claras">Gafas Claras</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Cantidad</label>
                                <input type="number" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-semibold" value={dotacionForm.cantidad} onChange={e => setDotacionForm({ ...dotacionForm, cantidad: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Comentarios</label>
                                <textarea className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium" value={dotacionForm.comentarios} onChange={e => setDotacionForm({ ...dotacionForm, comentarios: e.target.value })} placeholder="Ej: Entrega por inicio de labor"></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowDotacionModal(false)} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700">Confirmar entrega</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT PERSONAL MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{editMode ? 'Editar perfil operativo' : 'Vincular nuevo personal'}</h2>
                            <button onClick={() => setShowModal(false)} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Nombre Completo</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Número de Cédula</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.cedula}
                                        onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Cargo / Función</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.cargo}
                                        onChange={e => setFormData({ ...formData, cargo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Salario Mensual</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.salario}
                                        onChange={e => setFormData({ ...formData, salario: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Calificación Actual</label>
                                    <select
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.calificacion}
                                        onChange={e => setFormData({ ...formData, calificacion: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Colaborador Clave (Supera)">Colaborador Clave (Supera)</option>
                                        <option value="Cumple Sólidamente (Estándar)">Cumple Sólidamente (Estándar)</option>
                                        <option value="En Desarrollo (Bajo)">En Desarrollo (Bajo)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Puntualidad (%)</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.kpi_puntualidad}
                                        onChange={e => setFormData({ ...formData, kpi_puntualidad: e.target.value })}
                                        placeholder="0-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Eficiencia (%)</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.eficiencia}
                                        onChange={e => setFormData({ ...formData, eficiencia: e.target.value })}
                                        placeholder="0-100"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Área / Departamento</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                        value={formData.area}
                                        onChange={e => setFormData({ ...formData, area: e.target.value })}
                                        placeholder="Ej: Soldadura, Prensas, Administrativo..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700">Guardar perfil</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: GENERAL OVERTIME SUMMARY */}
            {showOvertimeSummary && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-5">
                    <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
                        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
                            <div>
                                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-900 sm:text-2xl">
                                    <Clock className="h-6 w-6 text-orange-600" /> Resumen general de horas extras
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">Consolidado de horas pendientes por pagar.</p>
                            </div>
                            <button onClick={() => setShowOvertimeSummary(false)} aria-label="Cerrar resumen" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                            <th className="p-6">Colaborador</th>
                                            <th className="p-6">Cargo</th>
                                            <th className="p-6 text-center">Horas Pendientes</th>
                                            <th className="p-6 text-right">Valor Est. Salario</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                        {personal.map(person => {
                                            const pendingHours = person.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((acc, curr) => acc + (Number(curr.horas) || 0), 0) || 0;
                                            if (pendingHours === 0) return null;

                                            const estimatedValue = person.salario ? (Number(person.salario) / 240) * pendingHours * 1.25 : 0;

                                            return (
                                                <tr key={person.id} className="hover:bg-orange-50/30 transition-colors">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-slate-900 font-black">{person.nombre}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-black uppercase">{person.cargo}</span>
                                                    </td>
                                                    <td className="p-6 text-center text-lg text-orange-600 font-black">{pendingHours} hrs</td>
                                                    <td className="p-6 text-right text-green-600 font-black">${estimatedValue.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                        {personal.every(p => (p.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).length || 0) === 0) && (
                                            <tr>
                                                <td colSpan={4} className="p-20 text-center text-gray-300 font-black uppercase text-xs italic tracking-widest">
                                                    No hay horas extras pendientes en el sistema
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-orange-50/50">
                                        <tr className="font-black text-slate-900">
                                            <td colSpan={2} className="p-6 text-right uppercase tracking-widest text-xs opacity-50">Total General Pendiente:</td>
                                            <td className="p-6 text-center text-2xl text-orange-600">
                                                {personal.reduce((acc, p) => acc + (p.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((a, c) => a + (Number(c.horas) || 0), 0) || 0), 0)} hrs
                                            </td>
                                            <td className="p-6 text-right text-2xl text-green-600">
                                                ${personal.reduce((acc, p) => {
                                                    const h = p.registrosTiempo?.filter(r => r.tipo === 'Hora Extra' && !r.pagado).reduce((a, c) => a + (Number(c.horas) || 0), 0) || 0;
                                                    return acc + (p.salario ? (Number(p.salario) / 240) * h * 1.25 : 0);
                                                }, 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-4 sm:p-5">
                            <button
                                onClick={handleMarkAllOvertimePaid}
                                disabled={isMarkingAllPaid}
                                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-100 disabled:cursor-wait disabled:opacity-60"
                            >
                                <ShieldCheck className="h-4 w-4" /> {isMarkingAllPaid ? 'Actualizando...' : 'Marcar todas pagadas'}
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                            >
                                <Download className="h-4 w-4" /> Exportar CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <FileText className="h-4 w-4" /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <BulkOvertimeModal
                isOpen={showBulkOvertimeModal}
                onClose={() => setShowBulkOvertimeModal(false)}
                personnel={personal}
                onSave={fetchPersonal}
            />
        </div>
    );
};

const BulkOvertimeModal = ({ isOpen, onClose, personnel, onSave }: { isOpen: boolean, onClose: () => void, personnel: Personal[], onSave: () => void }) => {
    const [selectedDate, setSelectedDate] = useState(formatToISODate(new Date()));
    const [search, setSearch] = useState('');
    const [entries, setEntries] = useState<Record<number, { horas_diurnas: string, horas_nocturnas: string, horas_festivas: string, motivo: string }>>({});

    const filteredPersonnel = personnel.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.cargo.toLowerCase().includes(search.toLowerCase()) ||
        (p.area && p.area.toLowerCase().includes(search.toLowerCase()))
    );

    const handleInputChange = (id: number, field: string, value: string) => {
        if (value && Number(value) < 0) return; // No permitir negativos
        setEntries(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSave = async () => {
        const items = Object.entries(entries)
            .filter(([_, data]) => data.horas_diurnas || data.horas_nocturnas || data.horas_festivas)
            .map(([id, data]) => {
                const person = personnel.find(p => p.id === Number(id));
                const baseVal = person?.salario ? Number(person.salario) / 240 : 0;

                // Cálculo automático: HED (1.25), HEN (1.75), FEST (1.75)
                const cost = (Number(data.horas_diurnas || 0) * baseVal * 1.25) +
                    (Number(data.horas_nocturnas || 0) * baseVal * 1.75) +
                    (Number(data.horas_festivas || 0) * baseVal * 1.75);

                return {
                    personal_id: Number(id),
                    horas_diurnas: data.horas_diurnas || 0,
                    horas_nocturnas: data.horas_nocturnas || 0,
                    horas_festivas: data.horas_festivas || 0,
                    motivo: data.motivo,
                    costo_total: cost
                };
            });

        if (items.length === 0) return alert('No hay horas ingresadas para guardar');
        if (!confirm(`¿Estás seguro de registrar horas extras para ${items.length} trabajadores?`)) return;

        try {
            await axios.post(`${API_URL}/personal/bulk-overtime`, { items, fecha: selectedDate });
            onSave();
            onClose();
        } catch (error) {
            alert('Error guardando registros');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-5">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 text-slate-900 sm:p-6">
                    <div>
                        <h2 className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
                            <Clock className="h-6 w-6 text-brand-600" /> Registro masivo de horas extras
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">Ingreso de tiempos para múltiples colaboradores.</p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar registro masivo" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Buscador de Personal</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Nombre, cargo o área..."
                                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-medium outline-none focus:ring-2 focus:ring-brand-500"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-48">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Fecha de Registro</label>
                        <input
                            type="date"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium outline-none focus:ring-2 focus:ring-brand-500"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setEntries({})}
                        className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                        Limpiar valores
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                <th className="p-6 w-1/3">Colaborador</th>
                                <th className="p-6 text-center">H. Diurnas</th>
                                <th className="p-6 text-center">H. Nocturnas</th>
                                <th className="p-6 text-center">H. Festivas</th>
                                <th className="p-6">Observaciones / Motivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredPersonnel.map(person => (
                                <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black">
                                                {person.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{person.nombre}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{person.cargo} {person.area ? `• ${person.area}` : ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <input
                                            type="number" min="0" step="0.5"
                                            className="w-20 mx-auto block p-3 text-center rounded-xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white font-black"
                                            value={entries[person.id]?.horas_diurnas || ''}
                                            onChange={e => handleInputChange(person.id, 'horas_diurnas', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-6">
                                        <input
                                            type="number" min="0" step="0.5"
                                            className="w-20 mx-auto block p-3 text-center rounded-xl bg-gray-50 border-2 border-transparent focus:border-purple-500 focus:bg-white font-black"
                                            value={entries[person.id]?.horas_nocturnas || ''}
                                            onChange={e => handleInputChange(person.id, 'horas_nocturnas', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-6">
                                        <input
                                            type="number" min="0" step="0.5"
                                            className="w-20 mx-auto block p-3 text-center rounded-xl bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white font-black"
                                            value={entries[person.id]?.horas_festivas || ''}
                                            onChange={e => handleInputChange(person.id, 'horas_festivas', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-6">
                                        <input
                                            type="text"
                                            placeholder="Ej: Apoyo carga OT-231"
                                            className="w-full p-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white font-bold text-sm"
                                            value={entries[person.id]?.motivo || ''}
                                            onChange={e => handleInputChange(person.id, 'motivo', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="text-sm text-slate-500">
                        Mostrando <span className="font-semibold text-slate-900">{filteredPersonnel.length}</span> trabajadores activos
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                        >
                            Guardar Horas Extras
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

