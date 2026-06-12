import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import CameraModal from './CameraModal';

const ProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, loading, error } = useSpecialProjectsStore();

  const [formData, setFormData] = useState({
    cliente: '',
    descripcion_tecnica: '',
    tipo_proyecto: 'Proyecto Especial',
    responsable_tecnico: '',
    fecha_inicio: '',
    fecha_compromiso: '',
    prioridad: 'Media',
    penalidad_retraso: '',
    codigo: '', // required by type, ignored by backend
    estado: 'Pendiente'
  });
  
  const [selectedPhases, setSelectedPhases] = useState<string[]>([
    'Diseño', 'Programación', 'Producción', 'Verificación'
  ]);
  const [customPhases, setCustomPhases] = useState<string[]>([]);
  const [newCustomPhase, setNewCustomPhase] = useState('');

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    foto_referencia: null,
    plano_pdf: null
  });

  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    // Combine standard and custom phases
    const allPhases = [...selectedPhases, ...customPhases].map(name => ({
      nombre: name,
      responsable: name === 'Diseño' ? 'Andrés Mejía' : formData.responsable_tecnico,
      horas_estimadas: 0,
      estado: 'Pendiente'
    }));
    
    submitData.append('fases', JSON.stringify(allPhases));

    await createProject(submitData as any);
    // Go back to special projects if successful
    navigate('/special-projects');
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nuevo Proyecto Especial</h1>
        <Link to="/special-projects" className="text-gray-500 hover:text-gray-700">
          Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Cliente *
          </label>
          <input
            type="text"
            name="cliente"
            value={formData.cliente}
            onChange={handleChange}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Descripción Técnica *
          </label>
          <textarea
            name="descripcion_tecnica"
            value={formData.descripcion_tecnica}
            onChange={handleChange}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Tipo de Proyecto *
            </label>
            <input
              type="text"
              name="tipo_proyecto"
              value={formData.tipo_proyecto}
              onChange={handleChange}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Responsable Técnico *
            </label>
            <input
              type="text"
              name="responsable_tecnico"
              value={formData.responsable_tecnico}
              onChange={handleChange}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Fecha Compromiso *
            </label>
            <input
              type="date"
              name="fecha_compromiso"
              value={formData.fecha_compromiso}
              onChange={handleChange}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Prioridad *
            </label>
            <select
              name="prioridad"
              value={formData.prioridad}
              onChange={handleChange}
              required
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Penalidad por Retraso
            </label>
            <input
              type="text"
              name="penalidad_retraso"
              value={formData.penalidad_retraso}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        {/* Phase Selector */}
        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <label className="block text-gray-700 text-sm font-black uppercase tracking-widest mb-3">
            Configuración de Fases
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {['Diseño', 'Programación', 'Producción', 'Verificación', 'Materiales', 'Ajuste', 'Prueba', 'Cierre'].map(phase => (
              <label key={phase} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-gray-100 hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPhases.includes(phase)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPhases([...selectedPhases, phase]);
                    else setSelectedPhases(selectedPhases.filter(p => p !== phase));
                  }}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-bold text-gray-700">{phase}</span>
              </label>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Otra fase (Ej: Pintura)"
                className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                value={newCustomPhase}
                onChange={e => setNewCustomPhase(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (newCustomPhase.trim()) {
                    setCustomPhases([...customPhases, newCustomPhase.trim()]);
                    setNewCustomPhase('');
                  }
                }}
                className="bg-blue-100 text-blue-600 font-bold py-2 px-4 rounded text-sm hover:bg-blue-200 transition-all"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customPhases.map((phase, idx) => (
                <span key={idx} className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                  {phase}
                  <button type="button" onClick={() => setCustomPhases(customPhases.filter((_, i) => i !== idx))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Foto de Referencia
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center transition-all group">
                    <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                    <span className="text-sm font-bold text-gray-500 group-hover:text-blue-500">Subir Archivo</span>
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
                    className="flex-1 cursor-pointer bg-blue-50 border-2 border-blue-100 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center transition-all group text-blue-600 hover:bg-blue-100"
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">Tomar Foto</span>
                  </button>
                </div>
              </div>

              <div className="relative border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center h-32 md:h-auto">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Sin imagen</div>
                )}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Plano (PDF)
            </label>
            <input
              type="file"
              name="plano_pdf"
              accept="application/pdf"
              onChange={handleFileChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Guardando...' : 'Crear Proyecto'}
          </button>
        </div>
      </form>

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default ProjectForm;
