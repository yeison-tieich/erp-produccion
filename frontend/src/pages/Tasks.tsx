
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../api';

interface Task {
    id: number;
    estado_tarea: 'Pendiente' | 'En Progreso' | 'Completada';
    personal_id: number | null;
    maquina_id: number | null;
    ordenTrabajo: {
        numero_ot: string;
        producto: {
            nombre_producto: string;
        };
        cantidad_fabricar: number;
    };
    rutaFabricacion: {
        nombre_operacion: string;
        centro_trabajo: string;
    };
    personal?: {
        nombre: string;
    } | null;
    maquina?: {
        codigo: string;
        area_produccion: string;
    } | null;
}

import { taskRepository, TaskLocal } from '../repositories/taskRepository';

export const Tasks = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [areaFilter, setAreaFilter] = useState('ALL');
    const [machineFilter, setMachineFilter] = useState('ALL');

    // Modal State for Finishing Task
    const [finishingTask, setFinishingTask] = useState<any | null>(null);
    const [goodQty, setGoodQty] = useState('');
    const [badQty, setBadQty] = useState('');
    const [stopTime, setStopTime] = useState('');
    const [durationReal, setDurationReal] = useState('');

    const fetchTasks = async () => {
        try {
            const data = await taskRepository.getAll();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleStartTask = async (task: any) => {
        try {
            await taskRepository.startTask(task.id_local, task.id || task.id_server);
            fetchTasks();
        } catch (error) {
            alert('Error al iniciar tarea');
        }
    };

    const handleFinishTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!finishingTask) return;

        try {
            await taskRepository.finishTask(finishingTask.id_local, finishingTask.id || finishingTask.id_server, {
                cantidad_buena: Number(goodQty),
                cantidad_mala: Number(badQty),
                tiempo_parada_min: Number(stopTime),
                duracion_real_min: durationReal ? Number(durationReal) : undefined
            });

            setFinishingTask(null);
            setGoodQty('');
            setBadQty('');
            setStopTime('');
            setDurationReal('');
            fetchTasks();
        } catch (error) {
            alert('Error al finalizar tarea');
        }
    };

    // Derived Data for Filters
    const areas = Array.from(new Set(tasks.map(t => t.maquina?.area_produccion).filter(Boolean))) as string[];
    const machines = Array.from(new Set(tasks.map(t => t.maquina?.codigo).filter(Boolean))) as string[];

    const filteredTasks = tasks.filter(task => {
        if (task.estado_tarea === 'Completada') return false;
        const matchesArea = areaFilter === 'ALL' || task.maquina?.area_produccion === areaFilter;
        const matchesMachine = machineFilter === 'ALL' || task.maquina?.codigo === machineFilter;
        return matchesArea && matchesMachine;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Mis Tareas Asignadas</h1>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select 
                        className="bg-white border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={areaFilter}
                        onChange={e => setAreaFilter(e.target.value)}
                    >
                        <option value="ALL">Todas las Áreas</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    
                    <select 
                        className="bg-white border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={machineFilter}
                        onChange={e => setMachineFilter(e.target.value)}
                    >
                        <option value="ALL">Todas las Máquinas</option>
                        {machines.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <span className={clsx(
                                    "px-2 py-1 text-xs font-semibold rounded-full",
                                    task.estado_tarea === 'Pendiente' ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                                )}>
                                    {task.estado_tarea}
                                </span>
                                <span className="text-sm text-gray-400 font-mono">{task.ordenTrabajo.numero_ot}</span>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-1">{task.rutaFabricacion.nombre_operacion}</h3>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-500">{task.maquina?.codigo || task.rutaFabricacion.centro_trabajo}</p>
                                {task.personal && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                        Operario: {task.personal.nombre}
                                    </span>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Producto:</span>
                                    <span className="font-medium text-gray-900">{task.ordenTrabajo.producto.nombre_producto}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Cantidad OT:</span>
                                    <span className="font-medium text-gray-900">{task.ordenTrabajo.cantidad_fabricar}</span>
                                </div>
                                {task.maquina?.area_produccion && (
                                    <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                        <span className="text-gray-500">Área:</span>
                                        <span className="font-medium text-gray-900">{task.maquina.area_produccion}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {task.estado_tarea === 'Pendiente' ? (
                                    <button
                                        onClick={() => handleStartTask(task)}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                    >
                                        <Play className="w-4 h-4" /> Iniciar
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setFinishingTask(task)}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Finalizar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredTasks.length === 0 && !loading && (
                    <div className="col-span-full text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="text-gray-400 font-medium">No se encontraron tareas con los filtros seleccionados.</div>
                    </div>
                )}
            </div>

            {/* Finish Task Modal */}
            {finishingTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Finalizar Tarea</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {finishingTask.rutaFabricacion.nombre_operacion} - {finishingTask.ordenTrabajo.numero_ot}
                        </p>

                        <form onSubmit={handleFinishTaskSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-green-700">Cant. Buena</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-green-200 bg-green-50 rounded-lg focus:ring-green-500"
                                        value={goodQty}
                                        onChange={e => setGoodQty(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-red-700">Cant. Mala</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-red-200 bg-red-50 rounded-lg focus:ring-red-500"
                                        value={badQty}
                                        onChange={e => setBadQty(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Tiempo de Parada (min)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                        value={stopTime}
                                        onChange={e => setStopTime(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-blue-700">Tiempo Trabajo Real (min)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                    <input
                                        type="number"
                                        className="w-full pl-10 pr-3 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-blue-500"
                                        value={durationReal}
                                        onChange={e => setDurationReal(e.target.value)}
                                        placeholder="Opcional: override reloj"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Si se deja vacío, se usará el tiempo del cronómetro.</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setFinishingTask(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Confirmar Finalización
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
