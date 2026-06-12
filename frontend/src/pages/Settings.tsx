import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, API_BASE_URL, updateServerUrl } from '../api';
import {
    Settings as SettingsIcon, Factory, Building2, Beaker,
    Plus, Save, Trash2, DollarSign, Palette, Ruler,
    Hash, Bell, Moon, Sun, Monitor, CheckCircle2,
    XCircle, Clock, Check, AlertCircle, Server, Wifi
} from 'lucide-react';
import clsx from 'clsx';
import { useConfigStore } from '../store/config.store';

interface Operation {
    id: number;
    nombre_operacion: string;
    centro_trabajo: string | null;
    orden: number;
    costo_hora: number;
    categoria_material_sugerido: string | null;
}

export const Settings = () => {
    const {
        userSettings, globalSettings, fetchUserSettings, fetchGlobalSettings,
        updateUserSettings, updateGlobalSettings, applyTheme, loading: storeLoading
    } = useConfigStore();

    const [localSettings, setLocalSettings] = useState(userSettings);

    const [activeTab, setActiveTab] = useState<'interface' | 'units' | 'decimals' | 'alarms' | 'operations' | 'company' | 'technical' | 'server'>('interface');
    const [operations, setOperations] = useState<Operation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New Operation Form
    const [showOpForm, setShowOpForm] = useState(false);
    const [newOp, setNewOp] = useState({
        nombre_operacion: '',
        centro_trabajo: '',
        costo_hora: 0,
        categoria_material_sugerido: ''
    });

    // Server Config
    const [serverUrl, setServerUrl] = useState(API_BASE_URL);

    const categories = ['Lámina', 'Perfil', 'Placa', 'Varilla', 'Consumible'];

    const PRESETS = [
        { name: 'Original', primary: '#0ea5e9', secondary: '#64748b', label: 'Original Cyan' },
        { name: 'Industrial', primary: '#2563eb', secondary: '#475569', label: 'Azul Industrial' },
        { name: 'Elegante', primary: '#334155', secondary: '#94a3b8', label: 'Pizarra' },
        { name: 'Bosque', primary: '#059669', secondary: '#334155', label: 'Esmeralda' },
    ];

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([
                fetchUserSettings(),
                fetchGlobalSettings(),
                fetchOperations()
            ]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (userSettings) {
            setLocalSettings(userSettings);
        }
    }, [userSettings]);

    const fetchOperations = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings/operations`);
            setOperations(res.data);
        } catch (error) {
            console.error('Error fetching operations:', error);
        }
    };

    const handleSaveGlobal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!globalSettings) return;
        setSaving(true);
        try {
            await updateGlobalSettings(globalSettings);
            alert('Configuración global guardada con éxito');
        } catch (error) {
            alert('Error al guardar configuración global');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveUserLocal = async () => {
        if (!localSettings) return;
        setSaving(true);
        try {
            await updateUserSettings(localSettings);
            alert('Preferencias de usuario actualizadas');
        } catch (error) {
            alert('Error al guardar preferencias');
        } finally {
            setSaving(false);
        }
    };

    const handleResetColors = () => {
        if (!localSettings) return;
        const isDark = localSettings.tema === 'Oscuro' ||
            (localSettings.tema === 'Automático' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const defaults = {
            ...localSettings,
            color_primario: '#2563eb',
            color_secundario: '#475569',
            color_superficie: isDark ? '#0f172a' : '#ffffff',
            color_borde: isDark ? '#1e293b' : '#e2e8f0',
            color_texto: isDark ? '#f8fafc' : '#0f172a',
        };
        setLocalSettings(defaults);
        applyTheme(defaults);
    };

    const handleCreateOperation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/settings/operations`, newOp);
            setShowOpForm(false);
            setNewOp({ nombre_operacion: '', centro_trabajo: '', costo_hora: 0, categoria_material_sugerido: '' });
            fetchOperations();
        } catch (error) {
            alert('Error al crear operación');
        }
    };

    const handleDeleteOperation = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta operación?')) return;
        try {
            await axios.delete(`${API_URL}/settings/operations/${id}`);
            fetchOperations();
        } catch (error) {
            alert('Error al eliminar operación');
        }
    };

    if (loading || storeLoading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <SettingsIcon className="w-10 h-10 text-brand-600" /> Configuración
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Personaliza el sistema y define reglas operativas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="space-y-1 bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 h-fit">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">Personalización</p>
                    <button
                        onClick={() => setActiveTab('interface')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'interface' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Palette className="w-4 h-4" /> Interfaz y Tema
                    </button>

                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-6 mb-2">Sistema Global</p>
                    <button
                        onClick={() => setActiveTab('units')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'units' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Ruler className="w-4 h-4" /> Unidades de Medida
                    </button>
                    <button
                        onClick={() => setActiveTab('decimals')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'decimals' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Hash className="w-4 h-4" /> Decimales y Precisión
                    </button>
                    <button
                        onClick={() => setActiveTab('alarms')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'alarms' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Bell className="w-4 h-4" /> Alertas y Notificaciones
                    </button>

                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-6 mb-2">Administración</p>
                    <button
                        onClick={() => setActiveTab('operations')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'operations' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Factory className="w-4 h-4" /> Operaciones y Costos
                    </button>
                    <button
                        onClick={() => setActiveTab('company')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'company' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Building2 className="w-4 h-4" /> Datos de Empresa
                    </button>
                    <button
                        onClick={() => setActiveTab('technical')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'technical' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Beaker className="w-4 h-4" /> Variables Técnicas
                    </button>
                    <button
                        onClick={() => setActiveTab('server')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all",
                            activeTab === 'server' ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <Server className="w-4 h-4" /> Conexión / Servidor
                    </button>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden min-h-[600px]">

                        {/* 1. INTERFAZ */}
                        {activeTab === 'interface' && localSettings && (
                            <div className="p-10 space-y-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Interfaz y Tema</h2>
                                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Personaliza cómo ves el sistema</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {(['Claro', 'Oscuro', 'Automático'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => {
                                                const newS = { ...localSettings, tema: mode };
                                                setLocalSettings(newS);
                                                applyTheme(newS);
                                            }}
                                            className={clsx(
                                                "p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4",
                                                localSettings.tema === mode
                                                    ? "border-brand-600 bg-brand-50/50 dark:bg-brand-900/20"
                                                    : "border-gray-50 dark:border-gray-800 hover:border-brand-200"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-full flex items-center justify-center",
                                                localSettings.tema === mode ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                            )}>
                                                {mode === 'Claro' && <Sun className="w-6 h-6" />}
                                                {mode === 'Oscuro' && <Moon className="w-6 h-6" />}
                                                {mode === 'Automático' && <Monitor className="w-6 h-6" />}
                                            </div>
                                            <span className={clsx("font-black uppercase text-xs tracking-widest", localSettings.tema === mode ? "text-brand-600" : "text-gray-500")}>
                                                {mode}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Temas Predefinidos</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {PRESETS.map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    const newS = {
                                                        ...localSettings,
                                                        color_primario: preset.primary,
                                                        color_secundario: preset.secondary
                                                    };
                                                    setLocalSettings(newS);
                                                    applyTheme(newS);
                                                }}
                                                className={clsx(
                                                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group relative",
                                                    localSettings.color_primario === preset.primary
                                                        ? "border-brand-600 bg-brand-50/30 dark:bg-brand-900/10"
                                                        : "border-gray-50 dark:border-gray-800 hover:border-brand-200 bg-white dark:bg-gray-900"
                                                )}
                                            >
                                                <div className="flex gap-1">
                                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                                                    <div className="w-8 h-8 rounded-full shadow-sm -ml-3" style={{ backgroundColor: preset.secondary }} />
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] font-black uppercase tracking-tight",
                                                    localSettings.color_primario === preset.primary ? "text-brand-600" : "text-gray-500"
                                                )}>
                                                    {preset.name}
                                                </span>
                                                {localSettings.color_primario === preset.primary && (
                                                    <div className="absolute top-2 right-2 w-4 h-4 bg-brand-600 rounded-full flex items-center justify-center text-white">
                                                        <Check className="w-2 h-2" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Colores de Marca</h3>
                                        <button
                                            onClick={handleResetColors}
                                            className="text-[10px] font-bold text-brand-600 hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            REESTABLECER VALORES
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {['color_primario', 'color_secundario', 'color_superficie', 'color_borde', 'color_texto'].map((key) => (
                                            <div key={key} className="space-y-4">
                                                <label className="text-xs font-bold text-gray-500 px-1 capitalize">{key.split('_')[1]}</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="color"
                                                        value={(localSettings as any)[key]}
                                                        onChange={e => {
                                                            const newS = { ...localSettings, [key]: e.target.value };
                                                            setLocalSettings(newS);
                                                            applyTheme(newS);
                                                        }}
                                                        className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white dark:border-gray-800 shadow-xl"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={(localSettings as any)[key]}
                                                        onChange={e => {
                                                            const newS = { ...localSettings, [key]: e.target.value };
                                                            setLocalSettings(newS);
                                                            applyTheme(newS);
                                                        }}
                                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none font-black text-gray-900 dark:text-white uppercase text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-gray-800">
                                    <button
                                        onClick={handleSaveUserLocal}
                                        disabled={saving}
                                        className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95"
                                    >
                                        <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'GUARDAR PREFERENCIAS'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. UNIDADES */}
                        {activeTab === 'units' && globalSettings && (
                            <form onSubmit={handleSaveGlobal} className="p-10 space-y-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Unidades de Medida</h2>
                                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Define los estándares globales del sistema</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] space-y-6">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                                            <Ruler className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Longitud</label>
                                            {['mm', 'cm', 'm', 'pulgadas'].map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => updateGlobalSettings({ unidad_longitud: u })}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex justify-between items-center",
                                                        globalSettings.unidad_longitud === u ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500"
                                                    )}
                                                >
                                                    {u} {globalSettings.unidad_longitud === u && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] space-y-6">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600">
                                            <Factory className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Peso</label>
                                            {['g', 'kg', 'lb'].map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => updateGlobalSettings({ unidad_peso: u })}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex justify-between items-center",
                                                        globalSettings.unidad_peso === u ? "bg-green-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500"
                                                    )}
                                                >
                                                    {u} {globalSettings.unidad_peso === u && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] space-y-6">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600">
                                            <Beaker className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Volumen</label>
                                            {['litros', 'cm3'].map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => updateGlobalSettings({ unidad_volumen: u })}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex justify-between items-center",
                                                        globalSettings.unidad_volumen === u ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500"
                                                    )}
                                                >
                                                    {u} {globalSettings.unidad_volumen === u && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-gray-800">
                                    <button type="submit" className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95">
                                        <Save className="w-5 h-5" /> GUARDAR UNIDADES
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 3. DECIMALES */}
                        {activeTab === 'decimals' && globalSettings && (
                            <form onSubmit={handleSaveGlobal} className="p-10 space-y-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Decimales y Precisión</h2>
                                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Configura el redondeo en cálculos y reportes</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { key: 'decimales_produccion', label: 'Producción', desc: 'Afecta cantidades fabricadas y saldos.', icon: Factory },
                                        { key: 'decimales_costos', label: 'Costos y Precios', desc: 'Afecta valores monetarios y cálculos de rentabilidad.', icon: DollarSign },
                                        { key: 'decimales_medidas', label: 'Medidas Técnicas', desc: 'Afecta planos, dimensiones y tolerancias.', icon: Ruler }
                                    ].map(item => (
                                        <div key={item.key} className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] flex items-center gap-6">
                                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm">
                                                <item.icon className="w-6 h-6 text-brand-600" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-sm font-black text-gray-900 dark:text-white uppercase block mb-1">{item.label}</label>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{item.desc}</p>
                                                <div className="flex gap-2">
                                                    {[0, 1, 2, 3, 4].map(d => (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => updateGlobalSettings({ [item.key]: d })}
                                                            className={clsx(
                                                                "w-10 h-10 rounded-xl font-black text-sm transition-all",
                                                                (globalSettings as any)[item.key] === d
                                                                    ? "bg-brand-600 text-white shadow-lg"
                                                                    : "bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700"
                                                            )}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                                    {/* @ts-ignore */}
                                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-700 dark:text-amber-500 font-bold">
                                        <span className="font-black uppercase">Nota:</span> Cambiar los decimales puede generar discrepancias visuales en registros históricos, aunque los valores en base de datos mantienen su precisión original.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-gray-800">
                                    <button type="submit" className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95">
                                        <Save className="w-5 h-5" /> GUARDAR PRECISIÓN
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 4. ALARMAS */}
                        {activeTab === 'alarms' && globalSettings && (
                            <form onSubmit={handleSaveGlobal} className="p-10 space-y-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Alertas y Notificaciones</h2>
                                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Configura el sistema de monitoreo preventivo</p>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { key: 'alarma_retraso_ot', label: 'Retraso en Órdenes de Trabajo', desc: 'Notifica cuando una OT excede su fecha estimada.' },
                                        { key: 'alarma_bajo_stock', label: 'Bajo Stock de Inventario', desc: 'Alerta cuando un material llega a su punto de reorden.' },
                                        { key: 'alarma_mantenimiento', label: 'Mantenimiento Pendiente', desc: 'Notifica preventivos vencidos o próximos a vencer.' },
                                        { key: 'alarma_fases_proyecto', label: 'Fases de Proyectos Atrasadas', desc: 'Monitorea el cumplimiento de hitos en proyectos especiales.' }
                                    ].map(alarm => (
                                        <div key={alarm.key} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                                            <div>
                                                <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight">{alarm.label}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{alarm.desc}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateGlobalSettings({ [alarm.key]: !(globalSettings as any)[alarm.key] })}
                                                className={clsx(
                                                    "w-14 h-8 rounded-full relative transition-all duration-300",
                                                    (globalSettings as any)[alarm.key] ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300",
                                                    (globalSettings as any)[alarm.key] ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Umbral Stock Mínimo (%)</label>
                                        <input
                                            type="number"
                                            value={Number(globalSettings.umbral_stock_minimo)}
                                            onChange={e => updateGlobalSettings({ umbral_stock_minimo: Number(e.target.value) })}
                                            className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-none font-black text-2xl text-brand-600"
                                        />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Días de Retraso Crítico</label>
                                        <input
                                            type="number"
                                            value={globalSettings.dias_retraso_alerta}
                                            onChange={e => updateGlobalSettings({ dias_retraso_alerta: Number(e.target.value) })}
                                            className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-none font-black text-2xl text-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-brand-600" />
                                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Frecuencia de Notificaciones</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {['Inmediata', 'Diaria', 'Semanal'].map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => updateGlobalSettings({ frecuencia_alertas: f })}
                                                className={clsx(
                                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    globalSettings.frecuencia_alertas === f ? "bg-brand-600 text-white shadow-lg" : "bg-gray-50 dark:bg-gray-800 text-gray-500"
                                                )}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-gray-800">
                                    <button type="submit" className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95">
                                        <Save className="w-5 h-5" /> GUARDAR ALARMAS
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 5. OPERACIONES (Mantenido y Mejorado) */}
                        {activeTab === 'operations' && (
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Catálogo de Operaciones</h2>
                                    <button
                                        onClick={() => setShowOpForm(!showOpForm)}
                                        className="bg-brand-50 dark:bg-brand-900/30 text-brand-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 hover:text-white transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Nueva Operación
                                    </button>
                                </div>

                                {showOpForm && (
                                    <form onSubmit={handleCreateOperation} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre Operación</label>
                                                <input
                                                    required
                                                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold"
                                                    value={newOp.nombre_operacion}
                                                    onChange={e => setNewOp({ ...newOp, nombre_operacion: e.target.value })}
                                                    placeholder="Ej: CORTE SIERRA"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Centro Trabajo</label>
                                                <input
                                                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold"
                                                    value={newOp.centro_trabajo}
                                                    onChange={e => setNewOp({ ...newOp, centro_trabajo: e.target.value })}
                                                    placeholder="Ej: SIERRA 01"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Costo Hora ($)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold"
                                                    value={newOp.costo_hora}
                                                    onChange={e => setNewOp({ ...newOp, costo_hora: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Materia Prima Sugerida</label>
                                                <select
                                                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold"
                                                    value={newOp.categoria_material_sugerido}
                                                    onChange={e => setNewOp({ ...newOp, categoria_material_sugerido: e.target.value })}
                                                >
                                                    <option value="">Ninguna</option>
                                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setShowOpForm(false)} className="px-4 py-2 font-bold text-gray-400">Cancelar</button>
                                            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-xl font-bold">Guardar</button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4">
                                    {operations.map(op => (
                                        <div key={op.id} className="group bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-700 rounded-3xl p-6 hover:shadow-xl hover:shadow-brand-50/20 transition-all duration-300">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center">
                                                        <Factory className="w-6 h-6 text-brand-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{op.nombre_operacion}</h3>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">{op.centro_trabajo || 'SIN CENTRO'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Costo Hora</p>
                                                        <div className="flex items-center gap-1 text-brand-600 font-black">
                                                            <DollarSign className="w-4 h-4" />
                                                            <input
                                                                type="number"
                                                                className="w-20 bg-transparent border-none p-0 focus:ring-0 text-right"
                                                                value={op.costo_hora}
                                                                onChange={e => axios.put(`${API_URL}/settings/operations/${op.id}`, { costo_hora: e.target.value }).then(fetchOperations)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleDeleteOperation(op.id)}
                                                        className="p-3 text-red-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6. EMPRESA */}
                        {activeTab === 'company' && globalSettings && (
                            <form onSubmit={handleSaveGlobal} className="p-10 space-y-10">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Datos de la Empresa</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Razón Social</label>
                                        <input
                                            className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            value={globalSettings.nombre_empresa}
                                            onChange={e => updateGlobalSettings({ nombre_empresa: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">NIT / Identificación</label>
                                        <input
                                            className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            value={globalSettings.nit_empresa}
                                            onChange={e => updateGlobalSettings({ nit_empresa: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Dirección</label>
                                        <input
                                            className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            value={globalSettings.direccion_empresa}
                                            onChange={e => updateGlobalSettings({ direccion_empresa: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        disabled={saving}
                                        type="submit"
                                        className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95"
                                    >
                                        <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 7. TÉCNICO */}
                        {activeTab === 'technical' && globalSettings && (
                            <form onSubmit={handleSaveGlobal} className="p-10 space-y-10">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Variables Técnicas</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                                        <Beaker className="w-8 h-8 text-blue-600 mb-4" />
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Densidad Predeterminada (Aceros)</label>
                                        <p className="text-[10px] text-gray-400 mb-4 font-medium uppercase tracking-tight">Valor usado para el cálculo de peso teórico (g/cm³).</p>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 font-black text-2xl text-blue-600"
                                            // @ts-ignore
                                            value={Number(globalSettings.densidad_acero_default)}
                                            // @ts-ignore
                                            onChange={e => updateGlobalSettings({ densidad_acero_default: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        disabled={saving}
                                        type="submit"
                                        className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95"
                                    >
                                        <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 8. SERVIDOR / OFFLINE */}
                        {activeTab === 'server' && (
                            <form onSubmit={(e) => { e.preventDefault(); updateServerUrl(serverUrl); }} className="p-10 space-y-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Conexión / Servidor</h2>
                                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Configura la dirección del servidor backend al que se conecta el APK</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 md:col-span-2">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                                                <Wifi className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">URL Base del Servidor</label>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Debe incluir http:// o https:// y el puerto (ej: http://192.168.2.26:3000)</p>
                                            </div>
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 font-black text-xl text-gray-900 dark:text-white"
                                            value={serverUrl}
                                            onChange={e => setServerUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-700 dark:text-amber-500 font-bold">
                                        <span className="font-black uppercase">Importante:</span> Al guardar los cambios, la aplicación se recargará automáticamente para aplicar la nueva configuración en todos los módulos. Asegúrate de tener conexión a la nueva red antes de aplicar el cambio.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95"
                                    >
                                        <Save className="w-5 h-5" /> GUARDAR URL Y REINICIAR
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
