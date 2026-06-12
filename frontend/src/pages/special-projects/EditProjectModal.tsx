import React, { useState, useEffect } from 'react';
import { ProyectoEspecial } from '../../types';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { X, Camera, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../../api';
import CameraModal from './CameraModal';

interface EditProjectModalProps {
  project: ProyectoEspecial;
  onClose: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose }) => {
  const { updateProject, loading, fetchProject } = useSpecialProjectsStore();
  const [formData, setFormData] = useState({
    cliente: project.cliente,
    descripcion_tecnica: project.descripcion_tecnica,
    tipo_proyecto: project.tipo_proyecto,
    responsable_tecnico: project.responsable_tecnico,
    fecha_inicio: project.fecha_inicio.split('T')[0],
    fecha_compromiso: project.fecha_compromiso.split('T')[0],
    prioridad: project.prioridad,
    penalidad_retraso: project.penalidad_retraso || '',
    estado: project.estado
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    foto_referencia: null,
    plano_pdf: null
  });

  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    project.foto_referencia_url ? `${API_URL.replace('/api', '')}${project.foto_referencia_url}` : null
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles.length > 0) {
      const file = selectedFiles[0];
      setFiles(prev => ({ ...prev, [name]: file }));
      
      if (name === 'foto_referencia') {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleCameraCapture = (file: File) => {
    setFiles(prev => ({ ...prev, foto_referencia: file }));
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removePhoto = () => {
    setFiles(prev => ({ ...prev, foto_referencia: null }));
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key as keyof typeof formData]);
    });
    
    if (files.foto_referencia) submitData.append('foto_referencia', files.foto_referencia);
    if (files.plano_pdf) submitData.append('plano_pdf', files.plano_pdf);

    await updateProject(project.id.toString(), submitData as any);
    await fetchProject(project.id.toString());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black">Editar Proyecto</h2>
            <p className="text-brand-100 text-sm font-bold uppercase tracking-wider">Actualizar información y archivos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-2">Cliente</label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                required
                className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-2">Descripción Técnica</label>
              <textarea
                name="descripcion_tecnica"
                value={formData.descripcion_tecnica}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-2">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold transition-all"
              >
                <option value="Activo">Activo</option>
                <option value="En espera">En espera</option>
                <option value="Detenido">Detenido</option>
                <option value="Terminado">Terminado</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-2">Prioridad</label>
              <select
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold transition-all"
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-4 border-t pt-6">
              <div>
                <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-3 italic">Foto de Referencia</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer bg-brand-50 border-2 border-dashed border-brand-200 hover:border-brand-500 rounded-2xl p-4 flex flex-col items-center justify-center transition-all group">
                        <ImageIcon className="w-6 h-6 text-brand-400 group-hover:text-brand-600 mb-1" />
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-wider">Subir</span>
                        <input
                          type="file"
                          name="foto_referencia"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="flex-1 cursor-pointer bg-blue-50 border-2 border-blue-100 hover:border-blue-500 rounded-2xl p-4 flex flex-col items-center justify-center transition-all group text-blue-600 hover:bg-blue-100"
                      >
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Cámara</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 relative border-2 border-gray-50 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[100px]">
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin imagen</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-black text-xs uppercase tracking-widest mb-2 italic">Actualizar Plano (PDF)</label>
                <input
                  type="file"
                  name="plano_pdf"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs font-bold text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all uppercase tracking-widest text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-brand-200 transition-all uppercase tracking-widest text-sm"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default EditProjectModal;
