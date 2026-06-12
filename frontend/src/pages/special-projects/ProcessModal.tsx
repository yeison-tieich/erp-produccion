import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';
import { FaseProyecto, Maquina, Personal } from '../../types';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { CheckCircle, Activity, Plus, X, Trash2, Package } from 'lucide-react';

interface ProcessModalProps {
  fase: FaseProyecto;
  projectId: number;
  onClose: () => void;
  onUpdate: (updatedFase: FaseProyecto) => void;
}

const ProcessModal: React.FC<ProcessModalProps> = ({ fase, projectId, onClose, onUpdate }) => {
  const { project, addPieceRecord } = useSpecialProjectsStore();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  
  // Piece record state
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [recordValue, setRecordValue] = useState<string>('');
  const [recordDescription, setRecordDescription] = useState<string>('');
  
  // Materials state (if it's the Materiales phase)
  const [materialesList, setMaterialesList] = useState<any[]>(project?.materiales || []);
  const [newMaterial, setNewMaterial] = useState({ 
    descripcion: '', 
    tipo: '', 
    cantidad: 1, 
    peso_kg: 0, 
    estado: 'Pendiente', 
    observaciones: '' 
  });
  
  const [formData, setFormData] = useState({
    estado: fase.estado || 'Pendiente',
    responsable: fase.responsable || '',
    maquina_id: fase.maquina_id || '',
    personal_id: fase.personal_id || '',
    costo_operacion: fase.costo_operacion || 0,
    horas_reales: fase.horas_reales || '',
    observaciones: fase.observaciones || ''
  });

  const isLocked = project?.estado === 'Verificación' || project?.estado === 'Finalizado';

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resMaquinas, resPersonal] = await Promise.all([
          axios.get(`${API_URL}/machines`),
          axios.get(`${API_URL}/personal`)
        ]);
        setMaquinas(resMaquinas.data);
        setPersonal(resPersonal.data);
      } catch (error) {
        console.error('Error fetching machine/personal data', error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    
    const updatedFase = {
      ...fase,
      estado: formData.estado,
      responsable: formData.responsable,
      maquina_id: formData.maquina_id ? Number(formData.maquina_id) : undefined,
      personal_id: formData.personal_id ? Number(formData.personal_id) : undefined,
      costo_operacion: formData.costo_operacion ? Number(formData.costo_operacion) : 0,
      horas_reales: formData.horas_reales ? Number(formData.horas_reales) : undefined,
      observaciones: formData.observaciones
    };

    if (fase.nombre === 'Materiales') {
      const { updateMaterials } = useSpecialProjectsStore.getState();
      await updateMaterials(projectId.toString(), materialesList);
    }

    onUpdate(updatedFase);
    setLoading(false);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.descripcion) return;
    setMaterialesList([...materialesList, { ...newMaterial }]);
    setNewMaterial({ descripcion: '', tipo: '', cantidad: 1, peso_kg: 0, estado: 'Pendiente', observaciones: '' });
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialesList(materialesList.filter((_, i) => i !== index));
  };

  const handlePieceRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPieceId) return;
    
    const tipo = fase.nombre === 'Programación' ? 'MONTAJE' : 'FABRICACION';
    await addPieceRecord(selectedPieceId, {
      tipo,
      descripcion: recordDescription,
      avance_reportado: tipo === 'FABRICACION' ? Number(recordValue) : undefined
    });

    setRecordValue('');
    setRecordDescription('');
    setSelectedPieceId('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{fase.nombre}</h2>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Control de Proceso Especial</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {isLocked && (
          <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
             <div className="bg-amber-500 p-1.5 rounded-full">
               <X className="w-3 h-3 text-white" />
             </div>
             <p className="text-amber-800 font-black text-[10px] uppercase tracking-tight">Fase bloqueada por estado del proyecto ({project?.estado})</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Estado de Fase</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completada">Completada</option>
                <option value="Cerrada">Cerrada</option>
              </select>
            </div>

            <div className={fase.nombre === 'Diseño' ? 'md:col-span-2' : ''}>
              <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Responsable (Texto)</label>
              <input
                type="text"
                name="responsable"
                value={formData.responsable}
                onChange={handleChange}
                placeholder="Nombre del responsable"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
              />
            </div>

            {fase.nombre !== 'Diseño' && (
              <>
                <div>
                  <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Máquina Asignada</label>
                  <select
                    name="maquina_id"
                    value={formData.maquina_id}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
                  >
                    <option value="">-- Sin máquina --</option>
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Operario Asignado</label>
                  <select
                    name="personal_id"
                    value={formData.personal_id}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
                  >
                    <option value="">-- Sin operario --</option>
                    {personal.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.cargo})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="md:col-span-1">
              <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Costo Fase ($)</label>
              <input
                type="number"
                name="costo_operacion"
                value={formData.costo_operacion}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-black text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
              />
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Horas Reales Invertidas</label>
              <input
                type="number"
                name="horas_reales"
                value={formData.horas_reales}
                onChange={handleChange}
                 step="0.1"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-black text-gray-700 focus:bg-white outline-none ring-2 ring-transparent focus:ring-brand-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all uppercase text-xs"
            >
              Cancelar
            </button>
            {!isLocked && (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-brand-600 text-white rounded-xl font-black hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all uppercase text-xs disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Actualizar Fase'}
              </button>
            )}
          </div>
        </form>

        {/* Materials list for 'Materiales' phase */}
        {fase.nombre === 'Materiales' && (
          <div className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Package className="text-orange-500 w-6 h-6" />
              <h3 className="text-xl font-black text-gray-900">Gestión de Materiales</h3>
            </div>

            <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 mb-6 font-bold space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text"
                  placeholder="Descripción (ej: Lámina CR Cal 20)"
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={newMaterial.descripcion}
                  onChange={e => setNewMaterial({...newMaterial, descripcion: e.target.value})}
                />
                <input 
                  type="text"
                  placeholder="Tipo (ej: Acero, Aluminio)"
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={newMaterial.tipo}
                  onChange={e => setNewMaterial({...newMaterial, tipo: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Cant</label>
                  <input 
                    type="number"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={newMaterial.cantidad}
                    onChange={e => setNewMaterial({...newMaterial, cantidad: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Peso (Kg)</label>
                  <input 
                    type="number"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={newMaterial.peso_kg}
                    onChange={e => setNewMaterial({...newMaterial, peso_kg: Number(e.target.value)})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Estado</label>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={newMaterial.estado}
                    onChange={e => setNewMaterial({...newMaterial, estado: e.target.value})}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pedido">Pedido</option>
                    <option value="En Almacén">En Almacén</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleAddMaterial}
                className="w-full bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> AGREGAR MATERIAL AL PROYECTO
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {materialesList.length > 0 ? materialesList.map((m, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-gray-100 flex justify-between items-center shadow-sm group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-gray-900 uppercase truncate">{m.descripcion}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        m.estado === 'En Almacén' ? 'bg-green-100 text-green-700' : 
                        m.estado === 'Pedido' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.estado}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase">
                      <span>Cant: <span className="text-gray-700">{m.cantidad}</span></span>
                      <span>Peso: <span className="text-gray-700">{m.peso_kg} Kg</span></span>
                      {m.tipo && <span>Tipo: <span className="text-gray-700">{m.tipo}</span></span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveMaterial(idx)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )) : (
                <p className="text-center text-gray-300 text-xs italic py-4">No hay materiales registrados para este proyecto.</p>
              )}
            </div>
          </div>
        )}

        {/* Piece Progress Section (Conditional) */}
        {!['Diseño', 'Materiales', 'Cierre'].includes(fase.nombre) && (
          <div className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              {fase.nombre === 'Programación' ? <CheckCircle className="text-green-500 w-6 h-6" /> : <Activity className="text-blue-500 w-6 h-6" />}
              <h3 className="text-xl font-black text-gray-900">
                Registros de {fase.nombre === 'Programación' ? 'Montaje' : 'Avance de Piezas'}
              </h3>
            </div>

            <form onSubmit={handlePieceRecordSubmit} className="space-y-4 bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 mb-6 font-bold">
              <select
                value={selectedPieceId}
                onChange={e => setSelectedPieceId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              >
                <option value="">-- Seleccionar Pieza --</option>
                {project?.piezas?.filter(p => fase.nombre !== 'Programación' || p.requiere_montaje).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({fase.nombre !== 'Programación' ? `${p.avance_fabricacion}%` : p.estado_montaje})</option>
                ))}
              </select>

              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Descripción del avance o novedad"
                  className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={recordDescription}
                  onChange={e => setRecordDescription(e.target.value)}
                  required
                />
                {fase.nombre !== 'Programación' && (
                  <input 
                    type="number"
                    placeholder="+%"
                    className="w-20 bg-white border border-gray-200 rounded-xl p-3 text-sm font-black text-center outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={recordValue}
                    onChange={e => setRecordValue(e.target.value)}
                    required
                    min="1"
                    max="100"
                  />
                )}
                <button type="submit" className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </form>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {project?.piezas?.flatMap(p => (p.registros || []).map(r => ({...r, piezaNombre: p.nombre}))).filter(r => r.tipo === (fase.nombre === 'Programación' ? 'MONTAJE' : 'FABRICACION')).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(r => (
                <div key={r.id} className="p-3 bg-white rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-gray-300 uppercase shrink-0">{new Date(r.fecha).toLocaleDateString()}</span>
                     <div>
                       <p className="text-[10px] font-black text-brand-500 uppercase leading-none mb-1">{r.piezaNombre}</p>
                       <p className="text-xs text-gray-700 font-bold leading-tight">{r.descripcion}</p>
                     </div>
                  </div>
                  {r.avance_reportado && <span className="text-xs font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">+{r.avance_reportado}%</span>}
                </div>
              ))}
              {(!project?.piezas?.some(p => p.registros?.some(r => r.tipo === (fase.nombre === 'Programación' ? 'MONTAJE' : 'FABRICACION')))) && (
                <p className="text-center text-gray-300 text-xs italic py-4">No hay registros de {fase.nombre.toLowerCase()} todavía.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessModal;
