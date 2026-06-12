
import React, { useState } from 'react';
import axios from 'axios';
import { FileUp, Loader2, FileText, ArrowRight, X, Download, Save, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { API_URL, BASE_URL } from '../api';

interface ExtractedItem {
    posicion?: string | null;
    referencia: string | null;
    descripcion: string | null;
    cantidad: number | null;
    material?: string | null;
    precio_unitario?: number | null;
    valor_total?: number | null;
    fecha_entrega?: string | null;
}

interface ExtractedPO {
    empresa: string;
    numero_orden: string | null;
    cliente: string;
    fecha: string | null;
    items: ExtractedItem[];
    observaciones: string | null;
}

interface ExtractionResponse {
    po: ExtractedPO;
    file_url: string;
    json_url: string;
    original_filename: string;
}

export const ImportPO = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [extractionData, setExtractionData] = useState<ExtractionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successOrder, setSuccessOrder] = useState(false);
    const [successPedido, setSuccessPedido] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setExtractionData(null);
            setSuccessOrder(false);
            setSuccessPedido(false);
        }
    };

    const handleUploadAndExtract = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/ai/read-po`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });
            setExtractionData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al procesar el archivo');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setExtractionData(null);
        setError(null);
        setSuccessOrder(false);
        setSuccessPedido(false);
    };

    const downloadJSON = () => {
        if (!extractionData) return;
        window.open(`${BASE_URL}${extractionData.json_url}`, '_blank');
    };

    const handleCreateOrders = async () => {
        if (!extractionData) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            for (const item of extractionData.po.items) {
                await axios.post(`${API_URL}/orders`, {
                    numero_ot: `OT-${extractionData.po.numero_orden || 'S/N'}-${item.posicion || ''}`,
                    cliente: extractionData.po.cliente,
                    cantidad_pedido: item.cantidad || 0,
                    cantidad_fabricar: item.cantidad || 0,
                    fecha_entrega_req: item.fecha_entrega || extractionData.po.fecha,
                    descripcion_proyecto: item.descripcion,
                    po_pdf_url: extractionData.file_url
                }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                });
            }
            setSuccessOrder(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al crear las órdenes en el sistema');
        } finally {
            setLoading(false);
        }
    };

    const handleIntegrateToPedidos = async () => {
        if (!extractionData) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            for (const item of extractionData.po.items) {
                await axios.post(`${API_URL}/pedidos`, {
                    cliente: extractionData.po.cliente,
                    orden_compra: extractionData.po.numero_orden,
                    descripcion: item.descripcion,
                    codigo: item.referencia,
                    referencia: item.referencia,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    valor_total: item.valor_total,
                    fecha_entrega_estimada: item.fecha_entrega || extractionData.po.fecha,
                    estado: 'EN INVENTARIO'
                }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                });
            }
            setSuccessPedido(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al integrar los datos en Pedidos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4">
            {/* Header */}
            <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500 rounded-full -mr-48 -mt-48 opacity-20 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-500/20">
                            <FileText className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter">Lector de Órdenes Inteligente</h1>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Extracción Automática & Generación JSON</p>
                        </div>
                    </div>
                    {extractionData && (
                        <div className="flex gap-3">
                            <button 
                                onClick={downloadJSON}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all border border-white/10 backdrop-blur-md"
                            >
                                <Download className="w-5 h-5" /> Exportar JSON
                            </button>
                            <button 
                                onClick={reset}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all border border-red-500/10"
                            >
                                <X className="w-5 h-5" /> Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!extractionData ? (
                /* Upload Section */
                <div className="max-w-3xl mx-auto py-12">
                    <div className="bg-white p-12 rounded-[4rem] shadow-3xl border border-gray-100 text-center relative">
                        <label className="group block relative border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center hover:border-brand-500 hover:bg-brand-50/30 transition-all cursor-pointer">
                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                            <div className="space-y-6">
                                <div className="p-8 bg-slate-50 rounded-[2.5rem] w-fit mx-auto group-hover:bg-brand-100 transition-colors">
                                    <FileUp className="w-16 h-16 text-slate-400 group-hover:text-brand-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-slate-900 tracking-tight">
                                        {file ? file.name : 'Cargar Orden de Compra'}
                                    </p>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.3em] mt-3">Arrastra tu archivo PDF aquí</p>
                                </div>
                            </div>
                        </label>

                        {file && (
                            <button
                                onClick={handleUploadAndExtract}
                                disabled={loading}
                                className="w-full mt-10 bg-slate-900 text-white py-8 rounded-[3rem] font-black text-2xl shadow-3xl hover:bg-brand-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <><Loader2 className="w-8 h-8 animate-spin" /> Procesando con IA...</>
                                ) : (
                                    <><ArrowRight className="w-8 h-8" /> Iniciar Lectura Digital</>
                                )}
                            </button>
                        )}
                        
                        {error && (
                            <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-3xl font-bold flex items-center gap-3 border border-red-100">
                                <AlertCircle className="w-6 h-6 shrink-0" /> {error}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Results Section */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    {/* Left: Data View */}
                    <div className="bg-white rounded-[4rem] shadow-3xl border border-gray-100 overflow-hidden flex flex-col max-h-[900px]">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" /> Datos Extraídos
                                </h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Sincronización Determinística de OC</p>
                            </div>
                            <div className="flex gap-2">
                                {!successPedido && (
                                    <button
                                        onClick={handleIntegrateToPedidos}
                                        disabled={loading}
                                        className="bg-brand-600 text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Integrar en Pedidos
                                    </button>
                                )}
                                {!successOrder && (
                                    <button
                                        onClick={handleCreateOrders}
                                        disabled={loading}
                                        className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                        Crear OTs
                                    </button>
                                )}
                            </div>
                        </div>

                        {successOrder && (
                            <div className="bg-slate-900 text-white p-4 text-center font-black animate-in slide-in-from-top duration-500">
                                ✓ ÓRDENES DE TRABAJO (OT) CREADAS CON ÉXITO
                            </div>
                        )}

                        {/* Metadatos de la Orden */}
                        <div className="p-8 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-8 items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-slate-400">Empresa Detectada</span>
                                <span className="text-lg font-black text-brand-600 tracking-tight">{extractionData.po.empresa}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-slate-400">Número de Orden</span>
                                <span className="text-lg font-black text-slate-800 tracking-tight">{extractionData.po.numero_orden || 'NO DETECTADO'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-slate-400">Fecha Emisión</span>
                                <span className="text-lg font-bold text-slate-600 tracking-tight">{extractionData.po.fecha || 'NO DETECTADO'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-slate-400">Items Extraídos</span>
                                <span className="text-lg font-black text-slate-800 tracking-tight">{extractionData.po.items.length}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                            {extractionData.po.items.map((item, idx) => (
                                <div key={idx} className="group bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/5 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-brand-600 text-lg group-hover:bg-brand-50 transition-colors">
                                            {item.posicion || idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia: {item.referencia || 'N/A'}</p>
                                            <h3 className="text-lg font-bold text-slate-800 leading-tight">{item.descripcion}</h3>
                                            {item.fecha_entrega && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Entrega</span>
                                                    <span className="text-xs font-bold text-brand-600">{item.fecha_entrega}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10 text-right">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cantidad</span>
                                            <span className="text-2xl font-black text-slate-900">{item.cantidad}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">P. Unitario</span>
                                            <span className="text-xl font-bold text-slate-700">${item.precio_unitario?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total</span>
                                            <span className="text-xl font-black text-slate-900">${item.valor_total?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: PDF Reference */}
                    <div className="bg-slate-900 rounded-[4rem] shadow-3xl overflow-hidden h-[900px] border border-white/10 flex flex-col">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Documento Original</span>
                            </div>
                        </div>
                        <iframe 
                            src={`${BASE_URL}${extractionData.file_url}`} 
                            className="flex-1 w-full border-none rounded-b-[4rem]"
                            title="PO Viewer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
