
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/auth.store';

interface Task {
    id: number;
    estado_tarea: 'Pendiente' | 'En Progreso' | 'Completada';
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
}

export const Tasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);

    // Modal State for Finishing Task
    const [finishingTask, setFinishingTask] = useState<Task | null>(null);
    const [goodQty, setGoodQty] = useState('');
    const [badQty, setBadQty] = useState('');
    const [stopTime, setStopTime] = useState('');

    const fetchTasks = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/tasks');
            setTasks(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleStartTask = async (id: number) => {
        try {
            await axios.post(`http://localhost:3000/api/tasks/${id}/start`);
            fetchTasks();
        } catch (error) {
            alert('Error al iniciar tarea');
        }
    };

    const handleFinishTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!finishingTask) return;

        try {
            await axios.post(`http://localhost:3000/api/tasks/${finishingTask.id}/finish`, {
                cantidad_buena: Number(goodQty),
                cantidad_mala: Number(badQty),
                tiempo_parada_min: Number(stopTime)
            });
            setFinishingTask(null);
            setGoodQty('');
            setBadQty('');
            setStopTime('');
            fetchTasks();
        } catch (error) {
            alert('Error al finalizar tarea');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Mis Tareas Asignadas</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.filter(t => t.estado_tarea !== 'Completada').map((task) => (
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
                            <p className="text-sm text-gray-500 mb-4">{task.rutaFabricacion.centro_trabajo}</p>

                            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Producto:</span>
                                    <span className="font-medium text-gray-900">{task.ordenTrabajo.producto.nombre_producto}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Cantidad OT:</span>
                                    <span className="font-medium text-gray-900">{task.ordenTrabajo.cantidad_fabricar}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {task.estado_tarea === 'Pendiente' ? (
                                    <button
                                        onClick={() => handleStartTask(task.id)}
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
                {tasks.length === 0 && !loading && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        No tienes tareas pendientes. ¡Buen trabajo!
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
