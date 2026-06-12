import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../../api';

interface AddStockModalProps {
    material: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({ material, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [refId, setRefId] = useState('');
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [image, setImage] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await axios.get(`${API_URL}/clients`);
                setClients(res.data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };
        fetchClients();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = null;
            if (image) {
                const formData = new FormData();
                formData.append('image', image);
                const uploadRes = await axios.post(`${API_URL}/inventory/upload-remission`, formData);
                imageUrl = uploadRes.data.url;
            }

            await axios.post(`${API_URL}/inventory/${material.id}/add-stock`, {
                cantidad: Number(amount),
                referencia_id: refId,
                cliente_id: clientId ? Number(clientId) : null,
                imagen_remision_url: imageUrl
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Error al agregar stock');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Ingreso de Material</h3>
                        <p className="text-sm text-brand-600 font-semibold">{material.nombre_mp} ({material.sku_mp})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Ingresar</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all font-bold"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / Factura</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
                                value={refId}
                                onChange={e => setRefId(e.target.value)}
                                required
                                placeholder="Ej: FAC-1234"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Cliente (Opcional)</label>
                        <select
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                        >
                            <option value="">Ninguno / Stock General</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Remisión</label>
                        <div 
                            className={`border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                                ${previewUrl ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-200 hover:bg-gray-50'}
                            `}
                            onClick={() => document.getElementById('remission-upload')?.click()}
                        >
                            {previewUrl ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm">
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold bg-black/40 px-2 py-1 rounded-full text-center">Click para cambiar</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-300" />
                                    <p className="text-xs text-gray-500 font-medium">Haz click para subir foto de la remisión</p>
                                </>
                            )}
                            <input
                                id="remission-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-all"
                            disabled={uploading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 active:scale-95 transition-all flex items-center gap-2"
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Confirmar Ingreso
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
