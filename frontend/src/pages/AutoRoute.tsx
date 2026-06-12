
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Loader2, Save, Play, Plus, Trash2, ListChecks, Info } from 'lucide-react';
import { API_URL } from '../api';
import clsx from 'clsx';

interface Order {
    id: number;
    numero_ot: string;
    producto?: {
        nombre_producto: string;
        acabado?: string;
    };
    descripcion_proyecto?: string;
}

interface RouteStep {
    nombre_operacion: string;
    centro_trabajo: string;
    tiempo_estimado_min: number;
}

export const AutoRoute = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await axios.get(`${API_URL}/orders`);
                setOrders(res.data.filter((o: any) => o.estado_ot === 'Pendiente'));
            } catch (err) {
                console.error(err);
            }
        };
        fetchOrders();
    }, []);

    const handleGenerateRoute = async () => {
        if (!selectedOrder) return;

        setGenerating(true);
        setError(null);
        setSteps([]);

        try {
            const res = await axios.post(`${API_URL}/ai/generate-route`, {
                productType: selectedOrder.producto?.nombre_producto || selectedOrder.descripcion_proyecto || 'Pieza genérica',
                material: 'Acero / Metal (Detectado automáticamente)',
                availableProcesses: ['Corte Laser', 'Doblez', 'Soldadura', 'Mecanizado', 'Pintura', 'Ensamble'],
                availableMachines: ['Corte Laser 1', 'Doblador CNC', 'Soldador Mig', 'CNC Torno']
            });
            setSteps(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al generar la ruta');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveRoute = async () => {
        if (!selectedOrder || steps.length === 0) return;
        setLoading(true);
        try {
            await axios.post(`${API_URL}/ai/save-route`, {
                orderId: selectedOrder.id,
                steps: steps
            });
            setSuccess(true);
            setSteps([]);
            setSelectedOrder(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al guardar la ruta de fabricación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center lg:text-left">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 shadow-2xl">
                            <Cpu className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Generador de Rutas IA</h1>
                            <p className="text-gray-500 font-bold mt-1">Asistente avanzado para la planificación de procesos de fabricación.</p>
                        </div>
                    </div>
                    
                    <div className="w-full max-w-md space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Seleccionar Orden de Trabajo</label>
                        <select 
                            className="w-full p-5 bg-gray-50 rounded-2xl font-black border-2 border-transparent focus:border-slate-900 outline-none transition-all appearance-none text-slate-800"
                            onChange={(e) => setSelectedOrder(orders.find(o => o.id === parseInt(e.target.value)) || null)}
                        >
                            <option value="">-- Elige una orden pendiente --</option>
                            {orders.map(order => (
                                <option key={order.id} value={order.id}>{order.numero_ot} - {order.producto?.nombre_producto || order.descripcion_proyecto}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedOrder && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1 bg-slate-900 rounded-[3rem] p-10 text-white space-y-8 shadow-2xl">
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <Info className="w-6 h-6 text-brand-400" /> Detalles
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Producto / Proyecto</span>
                                <p className="text-xl font-black">{selectedOrder.producto?.nombre_producto || selectedOrder.descripcion_proyecto}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Referencia OT</span>
                                <p className="text-lg font-bold text-slate-300 font-mono">{selectedOrder.numero_ot}</p>
                            </div>
                            <div className="pt-6">
                                <button 
                                    onClick={handleGenerateRoute}
                                    disabled={generating}
                                    className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-brand-500/20 hover:bg-brand-500 transition flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                                    GENERAR RUTA IA
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
                        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 min-h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <ListChecks className="w-8 h-8 text-brand-600" /> Secuencia de Operaciones
                                </h2>
                                {steps.length > 0 && (
                                    <button onClick={() => setSteps([...steps, { nombre_operacion: 'Nueva Op', centro_trabajo: 'Por asignar', tiempo_estimado_min: 0 }])} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-slate-600">
                                        <Plus className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            {generating && (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                    <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                                    <p className="text-lg font-black text-slate-400 animate-pulse">Analizando procesos y optimizando secuencia...</p>
                                </div>
                            )}

                            {!generating && steps.length > 0 && (
                                <div className="space-y-4 flex-1">
                                    {steps.map((step, idx) => (
                                        <div key={idx} className="group flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-brand-100 hover:bg-white transition-all shadow-sm hover:shadow-xl">
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-3 gap-4">
                                                <input 
                                                    type="text" 
                                                    className="bg-transparent font-black text-slate-800 outline-none"
                                                    value={step.nombre_operacion}
                                                    onChange={e => {
                                                        const newSteps = [...steps];
                                                        newSteps[idx].nombre_operacion = e.target.value;
                                                        setSteps(newSteps);
                                                    }}
                                                />
                                                <input 
                                                    type="text" 
                                                    className="bg-transparent font-bold text-slate-400 outline-none"
                                                    value={step.centro_trabajo}
                                                    onChange={e => {
                                                        const newSteps = [...steps];
                                                        newSteps[idx].centro_trabajo = e.target.value;
                                                        setSteps(newSteps);
                                                    }}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        className="w-16 bg-transparent font-black text-brand-600 outline-none text-right"
                                                        value={step.tiempo_estimado_min}
                                                        onChange={e => {
                                                            const newSteps = [...steps];
                                                            newSteps[idx].tiempo_estimado_min = parseInt(e.target.value);
                                                            setSteps(newSteps);
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-black text-gray-300 uppercase">min</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <div className="pt-10">
                                        <button 
                                            onClick={handleSaveRoute}
                                            disabled={loading}
                                            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-brand-600 transition shadow-2xl shadow-slate-200"
                                        >
                                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                            GUARDAR RUTA EN LA ORDEN
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!generating && steps.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                    <Cpu className="w-20 h-20" />
                                    <p className="font-black text-xl uppercase tracking-widest">Sin operaciones generadas</p>
                                    <p className="max-w-xs font-bold">Selecciona una OT y haz clic en "Generar Ruta IA" para comenzar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center max-w-lg space-y-6 border border-gray-100 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Save className="w-12 h-12 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">¡Ruta Guardada!</h2>
                            <p className="text-slate-500 font-bold mt-2">La secuencia de fabricación ha sido vinculada exitosamente a la orden de trabajo.</p>
                        </div>
                        <button onClick={() => setSuccess(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition">Entendido</button>
                    </div>
                </div>
            )}
        </div>
    );
};
