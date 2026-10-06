
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Clock, AlertTriangle, Plus, Filter, User, Edit3, Trash2, CheckSquare, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../api';

export const Tasks = () => {
    const { user } = useAuthStore();
    const isWorker = user?.rol === 'Operario';

    const [tasks, setTasks] = useState<any[]>([]);
    const [personalList, setPersonalList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters for Admin
    const [workerFilter, setWorkerFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');

    // Modal / Action States
    const [observationTask, setObservationTask] = useState<any | null>(null);
    const [workerComment, setWorkerComment] = useState('');
    const [editTaskModal, setEditTaskModal] = useState<any | null>(null);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (isWorker && user?.id) {
                params.personal_id = user.id; // Or mapped personal_id
            } else {
                if (workerFilter !== 'ALL') params.personal_id = workerFilter;
                if (statusFilter !== 'ALL') params.estado = statusFilter;
                if (priorityFilter !== 'ALL') params.prioridad = priorityFilter;
                if (dateFilter) params.fecha = dateFilter;
            }

            const res = await axios.get(`${API_URL}/tasks`, { params });
            setTasks(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonal = async () => {
        try {
            const res = await axios.get(`${API_URL}/personal`);
            setPersonalList(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchTasks();
        if (!isWorker) {
            fetchPersonal();
        }
    }, [workerFilter, statusFilter, priorityFilter, dateFilter, isWorker]);

    // Worker / Admin Actions
    const handleStartTask = async (taskId: number) => {
        try {
            await axios.post(`${API_URL}/tasks/${taskId}/start`);
            fetchTasks();
        } catch (error) {
            try {
                await axios.put(`${API_URL}/tasks/${taskId}/worker-status`, {
                    estado_tarea: 'Iniciada'
                });
                fetchTasks();
            } catch (e) {
                alert('Error al iniciar tarea');
            }
        }
    };

    const handleFinishTask = async (taskId: number) => {
        const buena = prompt("Cantidad BUENA:", "0");
        const mala = prompt("Cantidad MALA (Scrap):", "0");
        if (buena === null || mala === null) return;

        try {
            await axios.post(`${API_URL}/tasks/${taskId}/finish`, {
                cantidad_buena: Number(buena),
                cantidad_mala: Number(mala),
                tiempo_parada_min: 0
            });
            fetchTasks();
        } catch (error) {
            try {
                await axios.put(`${API_URL}/tasks/${taskId}/worker-status`, {
                    estado_tarea: 'Finalizada'
                });
                fetchTasks();
            } catch (e) {
                alert('Error al finalizar tarea');
            }
        }
    };

    const handleSaveObservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!observationTask) return;
        try {
            await axios.put(`${API_URL}/tasks/${observationTask.id}/worker-status`, {
                comentarios: workerComment
            });
            setObservationTask(null);
            setWorkerComment('');
            fetchTasks();
            alert('Observación guardada correctamente');
        } catch (error) {
            alert('Error al guardar observación');
        }
    };

    // Admin Actions
    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm('¿Desea eliminar esta tarea?')) return;
        try {
            await axios.delete(`${API_URL}/tasks/${taskId}`);
            fetchTasks();
        } catch (error) {
            alert('Error al eliminar tarea');
        }
    };

    const handleReassignWorker = async (taskId: number, newPersonalId: string) => {
        try {
            await axios.put(`${API_URL}/tasks/${taskId}/assign`, {
                personal_id: newPersonalId ? Number(newPersonalId) : null
            });
            fetchTasks();
        } catch (error) {
            alert('Error al reasignar trabajador');
        }
    };

    // KPI Calculations
    const totalPending = tasks.filter(t => t.estado_tarea === 'Pendiente').length;
    const totalInProcess = tasks.filter(t => t.estado_tarea === 'Iniciada' || t.estado_tarea === 'En Progreso').length;
    const totalFinished = tasks.filter(t => t.estado_tarea === 'Finalizada' || t.estado_tarea === 'Completada').length;
    const totalDelayed = tasks.filter(t => {
        if (t.fecha && t.estado_tarea !== 'Finalizada' && t.estado_tarea !== 'Completada') {
            return new Date(t.fecha) < new Date();
        }
        return false;
    }).length;

    const complianceRate = tasks.length > 0 ? Math.round((totalFinished / tasks.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">
                        {isWorker ? 'Mis Tareas Asignadas' : 'Gestión Global de Tareas'}
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {isWorker ? 'Seguimiento de labores y tiempos asignados' : 'Panel de control de operarios y cumplimiento de tareas'}
                    </p>
                </div>
            </div>

            {/* KPI Cards for Administrator */}
            {!isWorker && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendientes</p>
                        <p className="text-2xl font-black text-yellow-600 mt-1">{totalPending}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">En Proceso</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{totalInProcess}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Finalizadas</p>
                        <p className="text-2xl font-black text-green-600 mt-1">{totalFinished}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Retrasadas</p>
                        <p className="text-2xl font-black text-red-600 mt-1">{totalDelayed}</p>
                    </div>
                    <div className="bg-brand-600 text-white rounded-2xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-brand-200 uppercase tracking-wider">% Cumplimiento</p>
                        <p className="text-2xl font-black mt-1">{complianceRate}%</p>
                    </div>
                </div>
            )}

            {/* Filters Bar for Administrator */}
            {!isWorker && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                        <Filter className="w-4 h-4" />
                        Filtros:
                    </div>

                    <select
                        className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        value={workerFilter}
                        onChange={e => setWorkerFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Trabajadores</option>
                        {personalList.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>

                    <select
                        className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Iniciada">Iniciada / En Progreso</option>
                        <option value="Finalizada">Finalizada / Completada</option>
                    </select>

                    <select
                        className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                    >
                        <option value="ALL">Todas las Prioridades</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                    </select>

                    <input
                        type="date"
                        className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    />
                </div>
            )}

            {/* Task List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => {
                    const isTaskFinished = task.estado_tarea === 'Finalizada' || task.estado_tarea === 'Completada';
                    const isTaskStarted = task.estado_tarea === 'Iniciada' || task.estado_tarea === 'En Progreso';

                    return (
                        <div key={task.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={clsx(
                                        "px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider",
                                        task.estado_tarea === 'Pendiente' && "bg-yellow-100 text-yellow-800",
                                        isTaskStarted && "bg-blue-100 text-blue-800",
                                        isTaskFinished && "bg-green-100 text-green-800"
                                    )}>
                                        {task.estado_tarea}
                                    </span>
                                    <span className={clsx(
                                        "px-2.5 py-0.5 text-[10px] font-black rounded-lg uppercase",
                                        task.prioridad === 'ALTA' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                                    )}>
                                        Prioridad: {task.prioridad || 'MEDIA'}
                                    </span>
                                </div>

                                <h3 className="font-black text-xl text-gray-900 mb-1">
                                    {task.rutaFabricacion?.nombre_operacion || 'Operación de Producción'}
                                </h3>
                                <p className="text-xs text-gray-400 font-mono mb-4">
                                    OT: {task.ordenTrabajo?.numero_ot} | {task.ordenTrabajo?.producto?.nombre_producto}
                                </p>

                                <div className="space-y-2 bg-gray-50 p-4 rounded-2xl mb-4 text-xs font-medium text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Empleado Asignado:</span>
                                        <span className="font-bold text-gray-900">{task.personal?.nombre || 'Sin Asignar'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Fecha Límite:</span>
                                        <span className="font-bold text-gray-900">
                                            {task.fecha ? new Date(task.fecha).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tiempo Estimado:</span>
                                        <span className="font-bold text-gray-900">{task.tiempo_estimado_min || 0} min</span>
                                    </div>
                                    {task.comentarios && (
                                        <div className="mt-2 pt-2 border-t text-gray-500 italic">
                                            "{task.comentarios}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions according to Role */}
                            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                                {!isTaskFinished && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStartTask(task.id)}
                                            disabled={isTaskStarted}
                                            className={clsx(
                                                "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition",
                                                isTaskStarted
                                                    ? "bg-blue-50 text-blue-500 border border-blue-200 cursor-not-allowed opacity-80"
                                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                            )}
                                            title={isTaskStarted ? "Tarea ya está iniciada" : "Iniciar Tarea"}
                                        >
                                            <Play className="w-4 h-4" /> {isTaskStarted ? 'Iniciada' : 'Iniciar Tarea'}
                                        </button>

                                        <button
                                            onClick={() => handleFinishTask(task.id)}
                                            className="flex-1 bg-green-600 text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-700 transition shadow-sm"
                                            title="Finalizar Tarea"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Finalizar Tarea
                                        </button>

                                        <button
                                            onClick={() => {
                                                setObservationTask(task);
                                                setWorkerComment(task.comentarios || '');
                                            }}
                                            className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
                                            title="Observaciones"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {!isWorker && (
                                    <div className="flex gap-2 items-center pt-1">
                                        <select
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-500"
                                            value={task.personal_id || ''}
                                            onChange={(e) => handleReassignWorker(task.id, e.target.value)}
                                        >
                                            <option value="">-- Reasignar Operario --</option>
                                            {personalList.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                                            title="Eliminar Tarea"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal for Worker Observations */}
            {observationTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Agregar Observación</h3>
                        <p className="text-xs text-gray-500 font-bold mb-4">
                            {observationTask.rutaFabricacion?.nombre_operacion}
                        </p>

                        <form onSubmit={handleSaveObservation} className="space-y-4">
                            <textarea
                                className="w-full p-4 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium min-h-[120px]"
                                placeholder="Escriba sus observaciones sobre la tarea..."
                                value={workerComment}
                                onChange={e => setWorkerComment(e.target.value)}
                                required
                            ></textarea>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setObservationTask(null)}
                                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold text-sm shadow-md"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

