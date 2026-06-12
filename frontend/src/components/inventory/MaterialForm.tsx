import React from 'react';
import { X } from 'lucide-react';

interface MaterialFormProps {
    title: string;
    data: any;
    setData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    isEdit?: boolean;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({
    title,
    data,
    setData,
    onSubmit,
    onClose,
    isEdit = false
}) => {
    const calculatedWeight = React.useMemo(() => {
        if (data.categoria_mp === 'Lámina' || data.categoria_mp === 'Placa') {
            const areaM2 = (Number(data.ancho) / 1000) * (Number(data.largo) / 1000);
            return areaM2 * Number(data.espesor) * Number(data.densidad);
        } else if (Number(data.peso_unitario) > 0) {
            return Number(data.peso_unitario);
        }
        return 0;
    }, [data.ancho, data.largo, data.espesor, data.densidad, data.categoria_mp, data.peso_unitario]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 my-8 border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">Completa los datos del material y sus especificaciones técnicas.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Información Básica</h4>
                            {!isEdit && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.sku_mp}
                                        onChange={e => setData({ ...data, sku_mp: e.target.value })}
                                        required
                                        placeholder="Ej: LAM-001"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Material</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    value={data.nombre_mp}
                                    onChange={e => setData({ ...data, nombre_mp: e.target.value })}
                                    required
                                    placeholder="Ej: Lámina CR Cal 20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select 
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    value={data.categoria_mp}
                                    onChange={e => setData({ ...data, categoria_mp: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Lámina">Lámina</option>
                                    <option value="Perfil">Perfil</option>
                                    <option value="Placa">Placa</option>
                                    <option value="Varilla">Varilla</option>
                                    <option value="Consumible">Consumible</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.unidad_medida_stock}
                                        onChange={e => setData({ ...data, unidad_medida_stock: e.target.value })}
                                        placeholder="Kg, Und, M"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Punto Reorden</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.punto_reorden}
                                        onChange={e => setData({ ...data, punto_reorden: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            {/* Stock and Reserve Editing */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-black text-brand-600 uppercase mb-1">Stock Actual</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                        value={data.stock_actual || 0}
                                        onChange={e => setData({ ...data, stock_actual: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-orange-600 uppercase mb-1">En Reserva</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                                        value={data.stock_reservado || 0}
                                        onChange={e => setData({ ...data, stock_reservado: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-blue-600 uppercase mb-1">Devoluciones / Retornos</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        value={data.devoluciones || 0}
                                        onChange={e => setData({ ...data, devoluciones: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold"
                                        value={data.costo_unitario || ''}
                                        onChange={e => setData({ ...data, costo_unitario: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 font-medium">* Costo por {data.unidad_medida_stock || 'unidad'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Especificaciones Técnicas (Peso)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Espesor (mm)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.espesor || ''}
                                        onChange={e => setData({ ...data, espesor: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Densidad (g/cm³)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.densidad || '7.85'}
                                        onChange={e => setData({ ...data, densidad: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (mm)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.ancho || ''}
                                        onChange={e => setData({ ...data, ancho: e.target.value })}
                                        placeholder="mm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Largo (mm)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        value={data.largo || ''}
                                        onChange={e => setData({ ...data, largo: e.target.value })}
                                        placeholder="mm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Unitario (Kg/m o Kg/und)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    value={data.peso_unitario || ''}
                                    onChange={e => setData({ ...data, peso_unitario: e.target.value })}
                                    placeholder="0.000"
                                />
                            </div>

                            {calculatedWeight > 0 && (
                                <div className="mt-4 p-4 bg-brand-50 rounded-2xl border border-brand-100 animate-in slide-in-from-top-2">
                                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Peso Teórico Estimado</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-black text-brand-700">{calculatedWeight.toFixed(3)}</p>
                                        <p className="text-xs font-bold text-brand-500 uppercase">Kg / {data.unidad_medida_stock || 'Unidad'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 active:scale-95 transition-all"
                        >
                            {isEdit ? 'Guardar Cambios' : 'Crear Material'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
