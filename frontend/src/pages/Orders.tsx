
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { generateOrderPDF } from '../utils/pdfGenerator';
import {
    Plus, FileText, Calendar, CheckCircle, Clock,
    AlertTriangle, Edit2, Copy, Trash2, Eye,
    MoreVertical, ChevronRight, User, Settings,
    Thermometer, ShieldCheck, DollarSign, Timer, X,
    Activity, Factory, ClipboardList, ArrowUp, ArrowDown,
    EyeOff, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { API_URL, BASE_URL } from '../api';
import { MonthlyReportModal } from '../components/MonthlyReportModal';
import { SyncIndicator } from '../components/SyncIndicator';

interface Order {
    id: number;
    numero_ot: string;
    cliente: string;
    cantidad_fabricar: number;
    fecha_entrega_req: string;
    estado_ot: string;
    producto: {
        id: number;
        nombre_producto: string;
        sku_producto: string;
        cliente?: { nombre: string };
    };
    tareas: {
        id: number;
        estado_tarea: string;
        rutaFabricacion?: {
            no_operacion: number;
            nombre_operacion: string;
        };
    }[];
    costo_total_real: number;
    tipo_orden?: string;
    imagen_url?: string | null;
    acabado?: string | null;
    ancho_tira?: number | null;
    piezas_lamina?: string | null;
    precio_venta?: number;
}

import { useOrdersStore } from '../store/orders.store';

export const Orders = () => {
    const {
        orders,
        isLoading: loading,
        fetchOrders,
        createOrdenOffline,
        updateOrden,
        updateOrdenStatus,
        deleteOrden,
        duplicateOrder
    } = useOrdersStore();

    const [products, setProducts] = useState<any[]>([]);
    // ... rest of local component state ...
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [personalList, setPersonalList] = useState<any[]>([]);
    const [machinesList, setMachinesList] = useState<any[]>([]);
    const [operationsList, setOperationsList] = useState<any[]>([]);

    const [showCompleted, setShowCompleted] = useState(false);
    const [statusFilter, setStatusFilter] = useState('Todos');

    const [formData, setFormData] = useState({
        tipo_orden: 'PRODUCCION_SERIE',
        producto_id: '',
        cantidad_fabricar: '',
        cliente: '',
        fecha_entrega_req: '',
        estado_ot: '',
        acabado: '',
        ancho_tira: '',
        piezas_lamina: '',
        precio_venta: ''
    });

    const [formMaterials, setFormMaterials] = useState<any[]>([]);

    const generatePDF = async (order: any) => {
        try {
            const res = await axios.get(`${API_URL}/orders/${order.id || order.id_server}/details`);
            generateOrderPDF(res.data);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF de la orden');
        }
    };

    const fetchPersonalAndMachines = async () => {
        try {
            const [per, mac] = await Promise.all([
                axios.get(`${API_URL}/personal`),
                axios.get(`${API_URL}/machines`)
            ]);
            setPersonalList(per.data);
            setMachinesList(mac.data);
        } catch (error) {
            console.error('Error fetching helper data:', error);
        }
    };

    const handleStartTask = async (taskId: number) => {
        try {
            await axios.post(`${API_URL}/tasks/${taskId}/start`);
            if (selectedOrder) {
                const orderId = selectedOrder.id || selectedOrder.id_server;
                const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
                setSelectedOrder(res.data);
                fetchOrders();
            }
        } catch (error) {
            alert('Error al iniciar tarea');
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
            if (selectedOrder) {
                const orderId = selectedOrder.id || selectedOrder.id_server;
                const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
                setSelectedOrder(res.data);
                fetchOrders();
            }
        } catch (error) {
            alert('Error al finalizar tarea');
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('¿Seguro que deseas eliminar esta operación de la orden?')) return;
        try {
            await axios.delete(`${API_URL}/tasks/${taskId}`);
            if (selectedOrder) {
                const orderId = selectedOrder.id || selectedOrder.id_server;
                const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
                setSelectedOrder(res.data);
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message || 'Error al eliminar tarea';
            alert(`Error al eliminar tarea: ${errorMsg}`);
        }
    };

    const handleAddTask = async (rutaId: number) => {
        if (!selectedOrder) return;
        try {
            const orderId = selectedOrder.id || selectedOrder.id_server;
            await axios.post(`${API_URL}/tasks`, {
                orden_trabajo_id: orderId,
                ruta_fabricacion_id: rutaId
            });
            const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
            setSelectedOrder(res.data);
        } catch (error) {
            alert('Error al añadir tarea');
        }
    };

    const handleAddOperationSelection = async (value: string) => {
        if (!selectedOrder) return;
        try {
            const orderId = selectedOrder.id || selectedOrder.id_server;
            if (value.startsWith('ruta:')) {
                const id = Number(value.replace('ruta:', ''));
                await axios.post(`${API_URL}/tasks`, { orden_trabajo_id: orderId, ruta_fabricacion_id: id });
            } else if (value.startsWith('op:')) {
                const operId = Number(value.replace('op:', ''));
                await axios.post(`${API_URL}/orders/${orderId}/operations`, { operacionId: operId });
            }
            const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
            setSelectedOrder(res.data);
        } catch (error) {
            alert('Error al añadir operación');
        }
    }

    const handleAssign = async (taskId: number, personal_id: any, maquina_id: any) => {
        try {
            await axios.put(`${API_URL}/tasks/${taskId}/assign`, {
                personal_id: personal_id === "" ? null : personal_id,
                maquina_id: maquina_id === "" ? null : maquina_id
            });
            if (selectedOrder) {
                const orderId = selectedOrder.id || selectedOrder.id_server;
                const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
                setSelectedOrder(res.data);
            }
        } catch (error) {
            alert('Error asignando tarea');
        }
    };

    const handleReorderTasks = async (taskIds: number[]) => {
        if (!selectedOrder) return;
        try {
            const orderId = selectedOrder.id || selectedOrder.id_server;
            await axios.post(`${API_URL}/tasks/order/reorder-tasks`, {
                orden_trabajo_id: orderId,
                taskIds: taskIds
            });
            const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
            setSelectedOrder(res.data);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message || 'Error reordenando tareas';
            alert(`Error reordenando tareas: ${errorMsg}`);
        }
    };

    const moveTask = (index: number, direction: 'up' | 'down') => {
        if (!selectedOrder) return;
        const newTasks = [...selectedOrder.tareas];
        const task = newTasks[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newTasks.length) return;

        const swapTask = newTasks[swapIndex];
        newTasks[index] = swapTask;
        newTasks[swapIndex] = task;

        const newTaskIds = newTasks.map(t => t.id);
        handleReorderTasks(newTaskIds);
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        axios.get(`${API_URL}/operations`)
            .then(r => setOperationsList(r.data))
            .catch(() => setOperationsList([]));
    }, []);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data: any = { ...formData };
            if (formData.tipo_orden === 'PROYECTO_ESPECIAL') data.materiales_proyecto = formMaterials;

            await createOrdenOffline(data);

            setShowCreateModal(false);
            alert('Orden creada con éxito (Modo Híbrido)');
        } catch (err: any) {
            alert('Error al crear orden: ' + err.message);
        }
    };

    const handleDuplicate = async (id: number) => {
        try {
            await duplicateOrder(id);
        } catch (err) {
            alert('Error al duplicar orden');
        }
    };

    const handleStatusUpdate = async (id_server: number | undefined, status: string, id_local?: string) => {
        try {
            await updateOrdenStatus(id_local || '', id_server, status);
            setShowStatusModal(false);
        } catch (err) {
            alert('Error al actualizar estado');
        }
    };

    const initiateDeleteOrder = (order: any) => {
        setShowDetailModal(false);
        setOrderToDelete(order);
        setDeleteConfirmStep(0);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteStep1 = () => {
        setDeleteConfirmStep(1);
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await deleteOrden(orderToDelete.id_local, orderToDelete.id || orderToDelete.id_server);
            setShowDeleteConfirmModal(false);
            setOrderToDelete(null);
            setDeleteConfirmStep(0);
            alert('Orden eliminada correctamente');
        } catch (err) {
            alert('Error al eliminar orden');
        }
    };

    const handleUpdateOrderForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        try {
            const orderId = selectedOrder.id || selectedOrder.id_server;
            await updateOrden(selectedOrder.id_local, orderId, formData as any);

            setShowEditModal(false);
            alert('Orden actualizada con éxito');
        } catch (err: any) {
            alert(`Error al actualizar orden: ${err.message}`);
        }
    };

    const openEditModal = (order: any) => {
        setSelectedOrder(order);
        setFormData({
            tipo_orden: order.tipo_orden || 'PRODUCCION_SERIE',
            producto_id: order.producto?.id?.toString() || '',
            cantidad_fabricar: order.cantidad_fabricar?.toString() || '0',
            cliente: order.cliente || '',
            fecha_entrega_req: order.fecha_entrega_req ? order.fecha_entrega_req.split('T')[0] : '',
            estado_ot: order.estado_ot,
            acabado: order.acabado || '',
            ancho_tira: order.ancho_tira?.toString() || '',
            piezas_lamina: order.piezas_lamina || '',
            precio_venta: order.precio_venta?.toString() || ''
        });
        setShowEditModal(true);
    };

    const openDetailModal = async (order: any) => {
        try {
            const orderId = order.id || order.id_server;
            // NOTE: Full details currently still requires API connection
            const res = await axios.get(`${API_URL}/orders/${orderId}/details`);
            setSelectedOrder({ ...res.data, id_local: order.id_local });
            fetchPersonalAndMachines();
            setShowDetailModal(true);
        } catch (err: any) {
            console.error('Error loading details:', err);
            // If offline, we might want to show what we have in local DB
            setSelectedOrder(order);
            setShowDetailModal(true);
        }
    };

    const filteredOrders = (orders || []).filter(order => {
        const matchesStatus = statusFilter === 'Todos' || order.estado_ot === statusFilter;
        const matchesVisibility = statusFilter === 'Completada' || showCompleted || order.estado_ot !== 'Completada';
        return matchesStatus && matchesVisibility;
    });

    const getOrderRowColor = (status: string) => {
        switch (status) {
            case 'Completada': return 'bg-green-50/30 border-green-100';
            case 'En Progreso': return 'bg-blue-50/30 border-blue-100';
            case 'Cancelada': return 'bg-red-50/30 border-red-100';
            case 'Pendiente': return 'bg-yellow-50/30 border-yellow-100';
            default: return 'bg-white border-gray-100';
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white bg-gradient-to-r from-white to-gray-50/50 p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-brand-600" /> Órdenes de Producción
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Gestión y trazabilidad de órdenes de manufactura.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="bg-purple-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-purple-700 transition shadow-xl shadow-purple-100 font-black text-lg"
                    >
                        <Activity className="w-6 h-6" /> Generar Informe Mensual
                    </button>
                    <button
                        onClick={() => { setFormData({ tipo_orden: 'PRODUCCION_SERIE', producto_id: '', cantidad_fabricar: '', cliente: '', fecha_entrega_req: '', estado_ot: 'Pendiente', acabado: '', ancho_tira: '', piezas_lamina: '', precio_venta: '' }); setShowCreateModal(true); }}
                        className="bg-brand-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-brand-700 transition shadow-xl shadow-brand-100 font-black text-lg"
                    >
                        <Plus className="w-6 h-6" /> Nueva OT
                    </button>
                    <SyncIndicator />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 text-gray-400 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Filtrar por:</span>
                    </div>
                    {['Todos', 'Pendiente', 'En Progreso', 'Cancelada', 'Completada'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-xs font-black transition-all border-2",
                                statusFilter === status
                                    ? "bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-100"
                                    : "bg-white border-transparent text-gray-500 hover:border-gray-200"
                            )}
                        >
                            {status.toUpperCase()}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all border-2",
                        showCompleted
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"
                    )}
                >
                    {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {showCompleted ? 'MOSTRANDO COMPLETADAS' : 'COMLETADAS OCULTAS'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => (
                    <div key={order.id_local || order.id} className={clsx(
                        "rounded-[2rem] shadow-sm border p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                        getOrderRowColor(order.estado_ot)
                    )}>
                        <div className="flex-1 flex gap-6 items-center">
                            <div className={clsx(
                                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                                order.estado_ot === 'Completada' ? "bg-green-50 text-green-600" :
                                    order.estado_ot === 'En Progreso' ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"
                            )}>
                                {order.estado_ot === 'Completada' ? <CheckCircle className="w-8 h-8" /> :
                                    order.estado_ot === 'En Progreso' ? <Activity className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-xs font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-widest">
                                        {order.numero_ot}
                                    </span>
                                    <span className={clsx(
                                        "px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest border",
                                        order.estado_ot === 'Completada' ? "bg-green-100/50 text-green-700 border-green-200" :
                                            order.estado_ot === 'En Progreso' ? "bg-blue-100/50 text-blue-700 border-blue-200" :
                                                "bg-yellow-100/50 text-yellow-700 border-yellow-200"
                                    )}>
                                        {order.estado_ot}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 leading-tight">{order.producto?.nombre_producto || 'Sin Producto'}</h3>
                                <div className="text-sm text-gray-500 mt-1">SKU: <span className="font-mono text-xs text-gray-700">{order.producto?.sku_producto || '—'}</span></div>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span>Cantidad: <span className="text-brand-600">{order.cantidad_fabricar}</span> pcs</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>Cliente: <span className="text-gray-900">{order.cliente || order.producto?.cliente?.nombre || 'N/A'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>Entrega: <span className="text-gray-900">{order.fecha_entrega_req ? new Date(order.fecha_entrega_req).toLocaleDateString() : 'Pendiente'}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Operation Progress Section */}
                            <div className="flex flex-col gap-3 min-w-[240px] border-l border-gray-100 pl-6 ml-auto hidden 2xl:flex text-slate-900">
                                {(() => {
                                    const sorted = [...order.tareas].sort((a, b) => (a.rutaFabricacion?.no_operacion || 0) - (b.rutaFabricacion?.no_operacion || 0));
                                    const currentIndex = sorted.findIndex(t => t.estado_tarea !== 'Completada');
                                    const current = currentIndex !== -1 ? sorted[currentIndex] : null;
                                    const next = currentIndex !== -1 ? sorted[currentIndex + 1] : null;

                                    return (
                                        <>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">OPERACIÓN ACTUAL</span>
                                                {current ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-black text-[10px]">
                                                            {current.rutaFabricacion?.no_operacion}
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 truncate max-w-[150px] font-black">{current.rutaFabricacion?.nombre_operacion}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-green-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs font-black uppercase tracking-tight">Completado</span>
                                                    </div>
                                                )}
                                            </div>
                                            {next && (
                                                <div className="flex flex-col border-t border-gray-50 pt-2">
                                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">SIGUIENTE</span>
                                                    <div className="flex items-center gap-2 opacity-50">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center font-black text-[10px]">
                                                            {next.rutaFabricacion?.no_operacion}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-400 truncate max-w-[150px]">{next.rutaFabricacion?.nombre_operacion}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Action Buttons Container */}
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto border-t xl:border-t-0 pt-4 xl:pt-0">
                            <button
                                onClick={() => openDetailModal(order)}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-black text-xs hover:bg-gray-100 transition border border-gray-100"
                                title="Ver Detalles"
                            >
                                <Eye className="w-4 h-4" /> DETALLES
                            </button>
                            <button
                                onClick={() => openEditModal(order)}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl font-black text-xs hover:bg-blue-100 transition border border-blue-100"
                                title="Editar Orden"
                            >
                                <Edit2 className="w-4 h-4" /> EDITAR
                            </button>
                            <button
                                onClick={() => generatePDF(order)}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl font-black text-xs hover:bg-blue-100 transition border border-blue-100"
                                title="Imprimir Orden de Trabajo"
                            >
                                <FileText className="w-4 h-4" /> IMPRIMIR OT
                            </button>
                            <button
                                onClick={() => { setSelectedOrder(order); setShowStatusModal(true); }}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-xl font-black text-xs hover:bg-orange-100 transition border border-orange-100"
                                title="Cambiar Estado"
                            >
                                <Settings className="w-4 h-4" /> ESTADO
                            </button>
                            <button
                                onClick={() => initiateDeleteOrder(order)}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl font-black text-xs hover:bg-red-100 transition border border-red-100"
                                title="Eliminar Orden"
                            >
                                <Trash2 className="w-4 h-4" /> ELIMINAR
                            </button>
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No hay órdenes para mostrar</h3>
                        <p className="text-gray-300 font-medium">Prueba cambiando los filtros o crea una nueva orden.</p>
                    </div>
                )}
            </div>

            {/* STATUS UPDATE MODAL */}
            {showStatusModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-sm w-full p-8">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                            Actualizar Estado
                        </h3>
                        <div className="space-y-3">
                            {['Pendiente', 'En Progreso', 'Completada', 'Cancelada'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusUpdate(selectedOrder.id || selectedOrder.id_server, status, selectedOrder.id_local)}
                                    className={clsx(
                                        "w-full py-4 px-6 rounded-2xl font-black text-left transition-all border-2",
                                        selectedOrder.estado_ot === status ? "bg-brand-50 border-brand-500 text-brand-700 shadow-lg shadow-brand-50" : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowStatusModal(false)} className="w-full mt-6 py-3 text-gray-400 font-bold hover:text-gray-600">Cerrar</button>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirmModal && orderToDelete && (
                <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8">
                        {deleteConfirmStep === 0 ? (
                            <>
                                <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-6">
                                    <AlertTriangle className="w-7 h-7 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-center mb-2 text-gray-900">¿Seguro que deseas eliminar?</h3>
                                <p className="text-center text-gray-500 font-bold mb-6">Orden: <span className="text-gray-900 font-black">{orderToDelete.numero_ot}</span></p>
                                <p className="text-center text-sm text-gray-600 mb-8">Esta acción no se puede deshacer. Por favor confirma que deseas continuar.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirmModal(false);
                                            setOrderToDelete(null);
                                            setDeleteConfirmStep(0);
                                        }}
                                        className="flex-1 py-3 px-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={confirmDeleteStep1}
                                        className="flex-1 py-3 px-4 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 transition"
                                    >
                                        CONTINUAR
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-6">
                                    <AlertTriangle className="w-7 h-7 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-center mb-2 text-gray-900">Confirmar eliminación</h3>
                                <p className="text-center text-red-600 font-black text-lg mb-8">⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️</p>
                                <p className="text-center text-sm text-gray-600 mb-8">Orden a eliminar: <span className="text-gray-900 font-black text-base">{orderToDelete.numero_ot}</span></p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setDeleteConfirmStep(0);
                                        }}
                                        className="flex-1 py-3 px-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                    >
                                        ATRÁS
                                    </button>
                                    <button
                                        onClick={handleDeleteOrder}
                                        className="flex-1 py-3 px-4 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 transition"
                                    >
                                        ELIMINAR DEFINITIVAMENTE
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[110] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] shadow-2xl max-w-xl w-full flex flex-col max-h-[100vh] lg:max-h-[90vh] overflow-hidden transition-all duration-500">
                        {/* Premium Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-600 p-3 rounded-2xl">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">{showEditModal ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h2>
                            </div>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10">
                            <form onSubmit={showEditModal ? handleUpdateOrderForm : handleCreateOrder} className="space-y-6">
                                {!showEditModal && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Tipo de Orden</label>
                                            <select
                                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                                value={formData.tipo_orden}
                                                onChange={e => setFormData({ ...formData, tipo_orden: e.target.value })}
                                            >
                                                <option value="PRODUCCION_SERIE">PRODUCCIÓN SERIE</option>
                                                <option value="PROYECTO_ESPECIAL">PROYECTO ESPECIAL</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Producto a Fabricar</label>
                                            <select
                                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold transition-all"
                                                value={formData.producto_id}
                                                onChange={e => setFormData({ ...formData, producto_id: e.target.value })}
                                                required={formData.tipo_orden !== 'PROYECTO_ESPECIAL'}
                                            >
                                                <option value="">Selecciona un producto...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.nombre_producto} (SKU: {p.sku_producto})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Cantidad Piezas</label>
                                        <input
                                            type="number" required
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-black text-xl text-center"
                                            value={formData.cantidad_fabricar}
                                            onChange={e => setFormData({ ...formData, cantidad_fabricar: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Fecha Entrega</label>
                                        <input
                                            type="date" required
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.fecha_entrega_req}
                                            onChange={e => setFormData({ ...formData, fecha_entrega_req: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Cliente / Proyecto</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                        value={formData.cliente}
                                        onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                        placeholder="Nombre del cliente o proyecto..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Acabado (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.acabado}
                                            onChange={e => setFormData({ ...formData, acabado: e.target.value })}
                                            placeholder="Ej: Galvanizado"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Ancho Tira (mm)</label>
                                        <input
                                            type="number"
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.ancho_tira}
                                            onChange={e => setFormData({ ...formData, ancho_tira: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Piezas por Lámina</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                            value={formData.piezas_lamina}
                                            onChange={e => setFormData({ ...formData, piezas_lamina: e.target.value })}
                                            placeholder="Ej: 15"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Precio de Venta ($)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-black text-xl text-brand-600"
                                                value={formData.precio_venta}
                                                onChange={e => setFormData({ ...formData, precio_venta: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 font-bold italic">* Si se deja en 0, se usará el precio predeterminado del producto.</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Imagen de la Pieza (Opcional)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setFormData({ ...formData, imageFile: e.target.files ? e.target.files[0] : null } as any)}
                                            className="w-full px-5 py-3 rounded-2xl border-2 border-dashed border-gray-200"
                                        />
                                    </div>
                                </div>
                                {formData.tipo_orden === 'PROYECTO_ESPECIAL' && (
                                    <div className="bg-gray-50 p-4 rounded-xl border">
                                        <h4 className="font-black mb-2">Materiales del Proyecto</h4>
                                        {formMaterials.map((m, idx) => (
                                            <div key={idx} className="grid grid-cols-5 gap-2 items-center mb-2">
                                                <input type="number" className="p-2 rounded border" value={m.cantidad} onChange={e => { const v = [...formMaterials]; v[idx].cantidad = e.target.value; setFormMaterials(v); }} />
                                                <input className="p-2 rounded border" value={m.unidad} onChange={e => { const v = [...formMaterials]; v[idx].unidad = e.target.value; setFormMaterials(v); }} />
                                                <input className="col-span-3 p-2 rounded border" value={m.descripcion} onChange={e => { const v = [...formMaterials]; v[idx].descripcion = e.target.value; setFormMaterials(v); }} />
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setFormMaterials([...formMaterials, { cantidad: 1, unidad: 'UND', descripcion: '' }])} className="px-4 py-2 bg-brand-600 text-white rounded">Agregar Material</button>
                                            <button type="button" onClick={() => setFormMaterials([])} className="px-4 py-2 bg-gray-200 rounded">Limpiar</button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-1 bg-brand-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition transform hover:scale-[1.02] active:scale-95">
                                        {showEditModal ? 'GUARDAR CAMBIOS' : 'LANZAR PRODUCCIÓN'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED VIEW MODAL */}
            {showDetailModal && selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-4">
                    <div className="bg-white rounded-none lg:rounded-[3rem] w-full max-w-[95vw] h-full lg:h-[95vh] flex flex-col overflow-hidden transition-all duration-500">
                        {/* Detail Header */}
                        <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-8 text-white flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-6">
                                <div className="bg-brand-600 p-4 rounded-3xl">
                                    <ClipboardList className="w-10 h-10" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black">{selectedOrder.numero_ot}</h2>
                                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                            {selectedOrder.estado_ot}
                                        </span>
                                    </div>
                                    <p className="text-brand-400 font-bold">
                                        {selectedOrder.producto?.nombre_producto || 'N/A'} • SKU: {selectedOrder.producto?.sku_producto || 'N/A'}
                                        {selectedOrder.fecha_inicio_real && ` • Iniciada: ${new Date(selectedOrder.fecha_inicio_real).toLocaleString()}`}
                                        {selectedOrder.duracion_total_real_min > 0 && ` • Tiempo Total: ${(selectedOrder.duracion_total_real_min / 60).toFixed(2)} hrs`}
                                    </p>
                                    <div className="flex gap-4 mt-2">
                                        {selectedOrder.acabado && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20 uppercase">Acabado: {selectedOrder.acabado}</span>}
                                        {selectedOrder.ancho_tira && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20 uppercase">Ancho Tira: {selectedOrder.ancho_tira}mm</span>}
                                        {selectedOrder.piezas_lamina && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20 uppercase">Pzas/Lámina: {selectedOrder.piezas_lamina}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedOrder.imagen_url && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 border border-white/20">
                                        <img src={selectedOrder.imagen_url.startsWith('http') ? selectedOrder.imagen_url : `${BASE_URL}${selectedOrder.imagen_url}`} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <button onClick={() => setShowDetailModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-blue-600">
                                        <ShieldCheck className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Calidad (Ok)</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-800">
                                        {selectedOrder.tareas.reduce((acc, t) => acc + (t.cantidad_buena || 0), 0)}
                                        <span className="text-sm text-gray-400 font-bold"> / {selectedOrder.cantidad_fabricar}</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-red-600">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Mermas (Scrap)</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-800">
                                        {selectedOrder.tareas.reduce((acc, t) => acc + (t.cantidad_mala || 0), 0)}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-green-600">
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Costo Real</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-800">
                                        ${selectedOrder.costo_total_real?.toLocaleString() || '0'}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="flex items-center gap-3 mb-2 text-brand-600">
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Precio Venta (Unit)</span>
                                    </div>
                                    <div className="text-3xl font-black text-brand-600">
                                        ${selectedOrder.precio_venta?.toLocaleString() || '0'}
                                    </div>
                                    <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Total: <span className="text-gray-900">${((selectedOrder.precio_venta || 0) * selectedOrder.cantidad_fabricar).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-indigo-600">
                                        <Timer className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Duración Total</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-800">
                                        {(selectedOrder.tareas.reduce((acc: number, t: any) => acc + (t.duracion_real_min || 0), 0) / 60).toFixed(2)} hrs
                                    </div>
                                </div>
                            </div>

                            {/* Manufacturing Route (Tasks) */}
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-8 border-b bg-gray-50/50">
                                    <h3 className="text-xl font-black text-slate-800">Ruta de Fabricación y Registro de Tiempos</h3>
                                    <p className="text-sm text-gray-500 font-medium">Control por operación y operario asignado.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-400 border-b border-gray-100">
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Op</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Actividad / Centro</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Asignación Operario & Máquina</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Estado</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Tiempos</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Calidad</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Costo</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedOrder.tareas.map((tarea: any, index: number) => (
                                                <tr key={tarea.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-6 text-center font-black text-slate-400 text-xs">#{tarea.rutaFabricacion?.no_operacion || '--'}</td>
                                                    <td className="p-6">
                                                        <p className="font-black text-slate-700">{tarea.rutaFabricacion?.nombre_operacion || 'Op Sin Nombre'}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight">
                                                            <Factory className="w-3 h-3" /> {tarea.rutaFabricacion?.centro_trabajo || 'Planta'}
                                                        </p>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-2 min-w-[180px]">
                                                            <select
                                                                className="text-[10px] font-black border-2 border-gray-50 bg-gray-50 rounded-xl p-2 outline-none focus:border-brand-500 transition-all cursor-pointer"
                                                                value={tarea.personal_id || ""}
                                                                onChange={(e) => handleAssign(tarea.id, e.target.value, tarea.maquina_id)}
                                                            >
                                                                <option value="">👤 SELECCIONAR OPERARIO</option>
                                                                {personalList.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.nombre} ({p.cargo})</option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                className="text-[10px] font-black border-2 border-brand-50 bg-brand-50 text-brand-700 rounded-xl p-2 outline-none focus:border-brand-500 transition-all cursor-pointer"
                                                                value={tarea.maquina_id || ""}
                                                                onChange={(e) => handleAssign(tarea.id, tarea.personal_id, e.target.value)}
                                                            >
                                                                <option value="">⚙️ SELECCIONAR MÁQUINA</option>
                                                                {machinesList.map(m => (
                                                                    <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={clsx(
                                                            "px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tight border",
                                                            tarea.estado_tarea === 'Completada' ? "bg-green-100 text-green-700 border-green-200" :
                                                                tarea.estado_tarea === 'En Progreso' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                                    "bg-gray-100 text-gray-400 border-gray-200"
                                                        )}>
                                                            {tarea.estado_tarea}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col text-[10px] font-black text-gray-500 gap-1 group relative">
                                                            <div className="flex items-center justify-between">
                                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-brand-600" /> {tarea.fecha_hora_inicio ? new Date(tarea.fecha_hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const newStart = prompt("Nueva hora inicio (YYYY-MM-DD HH:MM):", tarea.fecha_hora_inicio ? new Date(tarea.fecha_hora_inicio).toISOString().slice(0, 16).replace('T', ' ') : '');
                                                                        const newEnd = prompt("Nueva hora fin (YYYY-MM-DD HH:MM):", tarea.fecha_hora_fin ? new Date(tarea.fecha_hora_fin).toISOString().slice(0, 16).replace('T', ' ') : '');
                                                                        if (newStart !== null || newEnd !== null) {
                                                                            axios.put(`${API_URL}/tasks/${tarea.id}/update-details`, {
                                                                                fecha_hora_inicio: newStart || undefined,
                                                                                fecha_hora_fin: newEnd || undefined
                                                                            }).then(() => openDetailModal(selectedOrder));
                                                                        }
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-brand-600 hover:bg-brand-50 rounded transition-all"
                                                                    title="Editar tiempos"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="flex items-center gap-1 text-gray-400 text-[8px]">{tarea.fecha_hora_fin ? new Date(tarea.fecha_hora_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                                                <span className="text-blue-600 font-black">{((tarea.duracion_real_min || 0) / 60).toFixed(2)} hrs</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-8 py-1 rounded-lg bg-green-50 text-green-700 text-center font-black text-xs border border-green-100" title="Buenas">{tarea.cantidad_buena || 0}</span>
                                                            <span className="w-8 py-1 rounded-lg bg-red-50 text-red-700 text-center font-black text-xs border border-red-100" title="Mermas">{tarea.cantidad_mala || 0}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-sm font-black text-slate-700 text-right">
                                                        ${tarea.costo_real?.toLocaleString() || '0'}
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => moveTask(index, 'up')} disabled={index === 0} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-200 disabled:opacity-50" title="Mover Arriba"><ArrowUp className="w-4 h-4" /></button>
                                                            <button onClick={() => moveTask(index, 'down')} disabled={index === selectedOrder.tareas.length - 1} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-200 disabled:opacity-50" title="Mover Abajo"><ArrowDown className="w-4 h-4" /></button>
                                                            {tarea.estado_tarea === 'Pendiente' && (
                                                                <button
                                                                    onClick={() => handleStartTask(tarea.id)}
                                                                    className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-600 hover:text-white transition"
                                                                    title="Iniciar Tarea"
                                                                >
                                                                    <Activity className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {tarea.estado_tarea === 'En Progreso' && (
                                                                <button
                                                                    onClick={() => handleFinishTask(tarea.id)}
                                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition"
                                                                    title="Finalizar Tarea"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteTask(tarea.id)}
                                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition"
                                                                title="Eliminar Operación"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Add Operation Section */}
                                <div className="p-8 bg-slate-50 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Añadir Operación Extra</h4>
                                        <p className="text-xs text-slate-400 font-bold">Selecciona una operación de la ruta del producto para añadir a esta orden.</p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <select
                                            id="add-op-select"
                                            className="flex-1 md:flex-none min-w-[200px] p-3 rounded-xl border-2 border-white bg-white font-bold text-xs shadow-sm outline-none focus:border-brand-500 transition"
                                        >
                                            <option value="">-- SELECCIONAR --</option>
                                            {selectedOrder.producto?.rutas?.map((r: any) => (
                                                <option key={`ruta-${r.id}`} value={`ruta:${r.id}`}>#{r.no_operacion} - {r.nombre_operacion}</option>
                                            ))}
                                            {operationsList.length > 0 && <option value="" disabled>-- OPERACIONES CATALOGO --</option>}
                                            {operationsList.map((op: any) => (
                                                <option key={`op-${op.id}`} value={`op:${op.id}`}>{op.nombre_operacion}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => {
                                                const select = document.getElementById('add-op-select') as HTMLSelectElement;
                                                if (select.value) handleAddOperationSelection(select.value);
                                            }}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-brand-600 transition shadow-lg shadow-slate-200"
                                        >
                                            AÑADIR TAREA
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Detail Footer */}
                        <div className="p-8 border-t flex justify-end gap-4 bg-white">
                            <button
                                onClick={() => generatePDF(selectedOrder)}
                                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-blue-100 text-blue-600 font-black text-xs hover:bg-blue-200 transition"
                            >
                                <FileText className="w-4 h-4" /> IMPRIMIR ORDEN DE TRABAJO
                            </button>
                            <button className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-brand-600 text-white font-black text-xs hover:bg-brand-700 transition shadow-lg shadow-brand-100">
                                <CheckCircle className="w-4 h-4" /> CERRAR Y VALIDAR ORDEN
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MONTHLY REPORT MODAL */}
            {showReportModal && (
                <MonthlyReportModal onClose={() => setShowReportModal(false)} />
            )}
        </div>
    );
};
