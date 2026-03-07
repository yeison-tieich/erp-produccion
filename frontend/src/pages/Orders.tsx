
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { generateOrderPDF } from '../utils/pdfGenerator';
import {
    Plus, FileText, Calendar, CheckCircle, Clock,
    AlertTriangle, Edit2, Copy, Trash2, Eye,
    MoreVertical, ChevronRight, User, Settings,
    Thermometer, ShieldCheck, DollarSign, Timer, X,
    Activity, Factory, ClipboardList, ArrowUp, ArrowDown
} from 'lucide-react';
import clsx from 'clsx';

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
    tareas: any[];
    costo_total_real: number;
    tipo_orden?: string;
}

export const Orders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0); // 0: first confirm, 1: final confirm
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [personalList, setPersonalList] = useState<any[]>([]);
    const [machinesList, setMachinesList] = useState<any[]>([]);
    const [operationsList, setOperationsList] = useState<any[]>([]);

    // Form States
    const [formData, setFormData] = useState({
        tipo_orden: 'PRODUCCION_SERIE',
        producto_id: '',
        cantidad_fabricar: '',
        cliente: '',
        fecha_entrega_req: '',
        estado_ot: ''
    });

    const [formMaterials, setFormMaterials] = useState<any[]>([]);

    const generatePDF = (order: any) => {
        generateOrderPDF(order);
    };

    const fetchPersonalAndMachines = async () => {
        try {
            const [per, mac] = await Promise.all([
                axios.get('http://localhost:3000/api/personal'),
                axios.get('http://localhost:3000/api/machines')
            ]);
            setPersonalList(per.data);
            setMachinesList(mac.data);
        } catch (error) {
            console.error('Error fetching helper data:', error);
        }
    };

    const handleStartTask = async (taskId: number) => {
        try {
            await axios.post(`http://localhost:3000/api/tasks/${taskId}/start`);
            if (selectedOrder) {
                const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
                setSelectedOrder(res.data);
                fetchOrders(); // Update main list too as status might change
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
            await axios.post(`http://localhost:3000/api/tasks/${taskId}/finish`, {
                cantidad_buena: Number(buena),
                cantidad_mala: Number(mala),
                tiempo_parada_min: 0
            });
            if (selectedOrder) {
                const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
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
            await axios.delete(`http://localhost:3000/api/tasks/${taskId}`);
            if (selectedOrder) {
                const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
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
            await axios.post(`http://localhost:3000/api/tasks`, {
                orden_trabajo_id: selectedOrder.id,
                ruta_fabricacion_id: rutaId
            });
            const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
            setSelectedOrder(res.data);
        } catch (error) {
            alert('Error al añadir tarea');
        }
    };

    const handleAddOperationSelection = async (value: string) => {
        if (!selectedOrder) return;
        try {
            if (value.startsWith('ruta:')) {
                const id = Number(value.replace('ruta:', ''));
                await axios.post(`http://localhost:3000/api/tasks`, { orden_trabajo_id: selectedOrder.id, ruta_fabricacion_id: id });
            } else if (value.startsWith('op:')) {
                const operId = Number(value.replace('op:', ''));
                await axios.post(`http://localhost:3000/api/orders/${selectedOrder.id}/operations`, { operacionId: operId });
            }
            const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
            setSelectedOrder(res.data);
        } catch (error) {
            alert('Error al añadir operación');
        }
    }

    const handleAssign = async (taskId: number, personal_id: any, maquina_id: any) => {
        try {
            await axios.put(`http://localhost:3000/api/tasks/${taskId}/assign`, {
                personal_id: personal_id === "" ? null : personal_id,
                maquina_id: maquina_id === "" ? null : maquina_id
            });
            // Refresh detail view
            if (selectedOrder) {
                const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
                setSelectedOrder(res.data);
            }
        } catch (error) {
            alert('Error asignando tarea');
        }
    };

    const handleReorderTasks = async (taskIds: number[]) => {
        if (!selectedOrder) return;
        try {
            await axios.post('http://localhost:3000/api/tasks/order/reorder-tasks', {
                orden_trabajo_id: selectedOrder.id,
                taskIds: taskIds
            });
            // Refresh detail view
            const res = await axios.get(`http://localhost:3000/api/orders/${selectedOrder.id}/details`);
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

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/orders');
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/products');
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        axios.get('http://localhost:3000/api/operations')
            .then(r => setOperationsList(r.data))
            .catch(() => setOperationsList([]));
    }, []);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...formData };
            if (formData.tipo_orden === 'PROYECTO_ESPECIAL') payload.materiales_proyecto = formMaterials;
            await axios.post('http://localhost:3000/api/orders', payload);
            setShowCreateModal(false);
            fetchOrders();
        } catch (err) {
            alert('Error al crear orden');
        }
    };

    const handleDuplicate = async (id: number) => {
        try {
            await axios.post(`http://localhost:3000/api/orders/${id}/duplicate`);
            fetchOrders();
        } catch (err) {
            alert('Error al duplicar orden');
        }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await axios.patch(`http://localhost:3000/api/orders/${id}/status`, { estado_ot: status });
            setShowStatusModal(false);
            fetchOrders();
        } catch (err) {
            alert('Error al actualizar estado');
        }
    };

    const initiateDeleteOrder = (order: Order) => {
        setShowDetailModal(false); // Close detail modal if open
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
            await axios.delete(`http://localhost:3000/api/orders/${orderToDelete.id}`);
            setShowDeleteConfirmModal(false);
            setOrderToDelete(null);
            setDeleteConfirmStep(0);
            fetchOrders();
            alert('Orden eliminada correctamente');
        } catch (err) {
            alert('Error al eliminar orden');
        }
    };

    const handleUpdateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        try {
            await axios.put(`http://localhost:3000/api/orders/${selectedOrder.id}`, formData);
            setShowEditModal(false);
            fetchOrders();
        } catch (err) {
            alert('Error al actualizar orden');
        }
    };

    const openEditModal = (order: Order) => {
        setSelectedOrder(order);
        setFormData({
            tipo_orden: order.tipo_orden || 'PRODUCCION_SERIE',
            producto_id: order.producto.id.toString(),
            cantidad_fabricar: order.cantidad_fabricar.toString(),
            cliente: order.cliente || '',
            fecha_entrega_req: order.fecha_entrega_req.split('T')[0],
            estado_ot: order.estado_ot
        });
        setShowEditModal(true);
    };

    const openDetailModal = async (order: Order) => {
        console.log('Opening details for order:', order.id);
        try {
            const res = await axios.get(`http://localhost:3000/api/orders/${order.id}/details`);
            console.log('Order details fetched:', res.data);
            setSelectedOrder(res.data);
            fetchPersonalAndMachines();
            setShowDetailModal(true);
        } catch (err: any) {
            console.error('Error loading details:', err);
            alert(`Error al cargar detalles: ${err.response?.data?.error || err.message}`);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-brand-600" /> Órdenes de Producción
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Gestión y trazabilidad de órdenes de manufactura.</p>
                </div>
                <button
                    onClick={() => { setFormData({ tipo_orden: 'PRODUCCION_SERIE', producto_id: '', cantidad_fabricar: '', cliente: '', fecha_entrega_req: '', estado_ot: 'Pendiente' }); setShowCreateModal(true); }}
                    className="bg-brand-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-brand-700 transition shadow-xl shadow-brand-100 font-black text-lg"
                >
                    <Plus className="w-6 h-6" /> Nueva OT
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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

                {orders.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No hay órdenes activas</h3>
                        <p className="text-gray-300 font-medium">Comienza creando una nueva orden de trabajo.</p>
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
                                    onClick={() => handleStatusUpdate(selectedOrder.id, status)}
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full p-10">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black tracking-tight">{showEditModal ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition"><X className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={showEditModal ? handleUpdateOrder : handleCreateOrder} className="space-y-6">
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
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Proyecto / Cliente Especial</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none font-bold"
                                    value={formData.cliente}
                                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                    placeholder="Nombre del cliente o proyecto..."
                                />
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
            )}

            {/* DETAILED VIEW MODAL */}
            {showDetailModal && selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/90 shadow-2xl backdrop-blur-md z-[120] flex items-center justify-center p-0 lg:p-10">
                    <div className="bg-white rounded-none lg:rounded-[3rem] w-full max-w-6xl h-full flex flex-col overflow-hidden">
                        {/* Detail Header */}
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
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
                                    <p className="text-slate-400 font-bold">
                                        {selectedOrder.producto?.nombre_producto || 'N/A'} • SKU: {selectedOrder.producto?.sku_producto || 'N/A'}
                                        {selectedOrder.fecha_inicio_real && ` • Iniciada: ${new Date(selectedOrder.fecha_inicio_real).toLocaleString()}`}
                                        {selectedOrder.duracion_total_real_min > 0 && ` • Tiempo Total: ${selectedOrder.duracion_total_real_min} min`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
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
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-indigo-600">
                                        <Timer className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-tighter">Duración Total</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-800">
                                        {selectedOrder.tareas.reduce((acc, t) => acc + (t.duracion_real_min || 0), 0)} min
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
                                                                    <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>
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
                                                        <div className="flex flex-col text-[10px] font-black text-gray-500 gap-1">
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tarea.fecha_hora_inicio ? new Date(tarea.fecha_hora_inicio).toLocaleTimeString() : '--:--'}</span>
                                                            <span className="flex items-center gap-1 text-gray-400 text-[8px]">{tarea.fecha_hora_fin ? new Date(tarea.fecha_hora_fin).toLocaleTimeString() : '--:--'}</span>
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
        </div>
    );
};
