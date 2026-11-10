import React, { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { API_URL, getAssetUrl } from '../../api';
import ProcessModal from './ProcessModal';
import EditProjectModal from './EditProjectModal';
import PieceMatrix from './PieceMatrix';
import PiecesEditableTable from '../../components/special-projects/PiecesEditableTable';
import QuickPhaseModal from './QuickPhaseModal';
import { Plus, Trash2, FileText, Clock, History, StickyNote, Factory, Target, File as FileIcon, X, Edit3, TableProperties, Zap } from 'lucide-react';

const SpecialProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { project, fetchProject, deleteProject, addNote, updateMaterials, uploadAttachment, updatePhase } = useSpecialProjectsStore();
  const [isPhaseModalOpen, setIsPhaseModalOpen] = React.useState(false);
  const [selectedFase, setSelectedFase] = React.useState<any>(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = React.useState(0);
  const [isAddingPhase, setIsAddingPhase] = React.useState(false);
  const [newPhaseName, setNewPhaseName] = React.useState('');

  const isLocked = project?.estado === 'Verificación' || project?.estado === 'Finalizado';
  
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [newMaterial, setNewMaterial] = React.useState({ descripcion: '', peso_kg: '' });
  const [isPieceMatrixOpen, setIsPieceMatrixOpen] = React.useState(false);
  const [isQuickPhaseOpen, setIsQuickPhaseOpen] = React.useState(false);
  const { error: storeError } = useSpecialProjectsStore();

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (!project || project.id !== Number(id)) return;
    const action = searchParams.get('action');
    if (action === 'pieces') {
      setIsPieceMatrixOpen(true);
    } else if (action === 'advance') {
      const activePhase = project.fases?.find(phase => phase.estado === 'En Progreso')
        || project.fases?.find(phase => !['Completada', 'Cerrada', 'Omitida'].includes(phase.estado));
      if (activePhase) {
        setSelectedFase(activePhase);
        setIsQuickPhaseOpen(true);
      }
    } else {
      return;
    }
    setSearchParams({}, { replace: true });
  }, [id, project, searchParams, setSearchParams]);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const getDaysRemaining = () => {
    const today = new Date();
    const commitmentDate = new Date(project.fecha_compromiso);
    const diffTime = commitmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePrintPdf = () => {
    if (project) {
      window.open(`${API_URL}/special-projects/${project.id}/pdf`, '_blank');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) {
      await deleteProject(project.id.toString());
      window.location.href = '/special-projects';
    }
  };

  const openPhaseModal = (fase: any) => {
    setSelectedFase(fase);
    setIsPhaseModalOpen(true);
  };

  const openQuickPhase = (fase: any) => {
    setSelectedFase(fase);
    setIsQuickPhaseOpen(true);
  };

  const getTotalHours = () => {
    return project.fases?.reduce((acc, fase) => acc + Number(fase.horas_reales || 0), 0) || 0;
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addNote(project.id.toString(), { autor: 'Admin', contenido: newNote }); 
    setNewNote('');
  };

  const handleUploadExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      await uploadAttachment(project.id.toString(), e.target.files[0]);
      setIsUploading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.descripcion || !newMaterial.peso_kg) return;
    const updatedMaterials = [...(project.materiales || []), { 
      descripcion: newMaterial.descripcion, 
      peso_kg: Number(newMaterial.peso_kg) 
    }];
    await updateMaterials(project.id.toString(), updatedMaterials);
    setNewMaterial({ descripcion: '', peso_kg: '' });
  };

  const handleRemoveMaterial = async (index: number) => {
    const updatedMaterials = project.materiales?.filter((_, i) => i !== index) || [];
    await updateMaterials(project.id.toString(), updatedMaterials);
  };

  return (
    <div className="w-full min-h-full p-3 sm:p-4 lg:p-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <Link 
          to="/special-projects" 
          className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-black uppercase text-xs transition-all"
        >
          <X className="w-4 h-4" /> 🔙 Atrás
        </Link>
        <div className="flex gap-2">
          {['Pendiente', 'En proceso', 'En pausa', 'Finalizado'].map(status => (
            <button
              key={status}
              onClick={async () => {
                if (window.confirm(`¿Cambiar el estado del proyecto a ${status}?`)) {
                  const { updateProject } = useSpecialProjectsStore.getState();
                  await updateProject(project.id.toString(), { estado: status } as any);
                }
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                project.estado === status 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLocked && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <div className="bg-amber-500 p-2 rounded-full">
            <X className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-amber-800 font-black text-sm uppercase tracking-tight">Proyecto Bloqueado</p>
            <p className="text-amber-600 text-xs font-bold">No se permiten ediciones en estado de {project.estado}.</p>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-[2.5rem] shadow-2xl mb-8 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                project.prioridad === 'Alta' ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'
              }`}>
                Prioridad {project.prioridad}
              </span>
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Código: {project.codigo}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">{project.descripcion_tecnica}</h1>
            <p className="text-gray-400 font-bold mt-1">Cliente: <span className="text-white">{project.cliente}</span></p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePrintPdf}
              className="bg-brand-600 hover:bg-brand-700 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-900/20 active:scale-95"
            >
              <FileText className="w-5 h-5" /> Imprimir Orden
            </button>
            <button
              onClick={() => setIsEditProjectModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all border border-white/10"
            >
              Editar
            </button>
            <button
              onClick={handleDeleteProject}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all border border-red-500/10"
            >
              <Trash2 className="w-5 h-5" /> Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-10 pt-8 border-t border-white/10">
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Estado General</p>
            <p className="text-xl font-black flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${project.estado === 'Activo' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              {project.estado}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Progreso Total</p>
            <div className="flex items-center gap-4">
               <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${project.porcentaje_avance}%` }}
                ></div>
              </div>
              <span className="text-xl font-black">{project.porcentaje_avance}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Compromiso</p>
            <p className="text-xl font-black">{new Date(project.fecha_compromiso).toLocaleDateString()}</p>
            <p className={`text-[10px] font-bold mt-1 ${getDaysRemaining() < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {getDaysRemaining() < 0 ? `Retrasado ${Math.abs(getDaysRemaining())} días` : `${getDaysRemaining()} días restantes`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Responsable Técnico</p>
            <p className="text-xl font-black">{project.responsable_tecnico}</p>
          </div>
        </div>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Core logic & pieces (8 cols) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Photos & Blueprints Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 group">
              <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-4">Foto de Referencia</h3>
              {project.foto_referencia_url ? (
                <div className="relative overflow-hidden rounded-2xl aspect-video">
                  <img 
                    src={getAssetUrl(project.foto_referencia_url)}
                    alt="Referencia" 
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs font-bold text-center p-4';
                        placeholder.innerHTML = '⚠️ Imagen no disponible<br/><span class="text-[10px] text-gray-300">Verifica que el archivo exista en el servidor</span>';
                        target.parentElement?.appendChild(placeholder);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl aspect-video flex items-center justify-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold text-sm italic">Sin imagen de referencia</p>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="bg-blue-50 p-5 rounded-full mb-4 shadow-inner">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-gray-900 font-black text-lg mb-1 uppercase tracking-tight">Plano Técnico</h3>
              {project.plano_pdf_url ? (
                <a 
                  href={getAssetUrl(project.plano_pdf_url)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-500 text-white px-8 py-2 rounded-xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                >
                  VER PDF
                </a>
              ) : (
                <p className="text-gray-400 font-bold text-sm italic">Sin plano adjunto</p>
              )}
            </div>
          </div>

          {/* Piece Control Section - Tabla Editable */}
          <div className="rounded-[2rem] overflow-hidden">
            <PiecesEditableTable
              projectId={project.id}
              initialPieces={project.piezas || []}
              canEdit={!isLocked}
              onSaved={() => fetchProject(id!)}
            />
            {/* Botón de Carga Rápida (PieceMatrix) */}
            {!isLocked && (
              <div className="bg-white px-5 py-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsPieceMatrixOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 transition-all active:scale-95 shadow-sm"
                >
                  <TableProperties className="h-4 w-4" /> Carga rápida masiva
                </button>
              </div>
            )}
          </div>

          {/* Timeline and phases */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Clock className="w-8 h-8 text-brand-600" /> Fases de Producción
              </h2>
              <div className="flex gap-2">
                {!isLocked && (
                  <button 
                    onClick={() => setIsAddingPhase(!isAddingPhase)}
                    className="bg-brand-50 text-brand-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-brand-100 transition-all"
                  >
                    {isAddingPhase ? 'Cancelar' : '➕ Agregar Fase'}
                  </button>
                )}
              </div>
            </div>

            {isAddingPhase && (
              <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100 flex gap-3 animate-in slide-in-from-top duration-300">
                <input 
                  type="text" 
                  placeholder="Nombre de la nueva fase..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold outline-none"
                  value={newPhaseName}
                  onChange={e => setNewPhaseName(e.target.value)}
                />
                <button 
                  onClick={async () => {
                    if (newPhaseName.trim()) {
                      const { addPhase } = useSpecialProjectsStore.getState();
                      await addPhase(project.id.toString(), { nombre: newPhaseName.trim(), responsable: project.responsable_tecnico });
                      setNewPhaseName('');
                      setIsAddingPhase(false);
                    }
                  }}
                  className="bg-brand-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase"
                >
                  Guardar
                </button>
              </div>
            )}

            {/* Phase Navigation Controls */}
            {project.fases && project.fases.length > 0 && (
              <div className="mb-8 flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <button 
                  disabled={currentPhaseIndex === 0}
                  onClick={() => setCurrentPhaseIndex(currentPhaseIndex - 1)}
                  className="p-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-brand-600 hover:bg-brand-50 transition-all"
                >
                  ← Fase Anterior
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fase Actual ({currentPhaseIndex + 1}/{project.fases.length})</p>
                  <p className="text-lg font-black text-brand-600 uppercase tracking-tight">
                    {project.fases[currentPhaseIndex]?.nombre}
                  </p>
                </div>
                <button 
                  disabled={currentPhaseIndex === project.fases.length - 1}
                  onClick={() => setCurrentPhaseIndex(currentPhaseIndex + 1)}
                  className="p-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-brand-600 hover:bg-brand-50 transition-all"
                >
                  Siguiente Fase →
                </button>
              </div>
            )}
            <div className="relative border-l-4 border-gray-50 ml-6 space-y-10 py-2">
              {project.fases?.map((fase) => (
                <div 
                  key={fase.id} 
                  className="relative pl-10 group"
                >
                  <div className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-md transition-all duration-300 ${
                    fase.estado === 'Completada' || fase.estado === 'Cerrada' 
                    ? 'bg-green-500 scale-110' 
                    : fase.estado === 'En Progreso' ? 'bg-brand-500 animate-pulse' : 'bg-gray-200'
                  }`}></div>
                  
                  <div className="p-6 bg-gray-50/50 rounded-[1.5rem] border border-transparent hover:border-brand-200 hover:bg-white hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors uppercase tracking-tight">{fase.nombre}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                          {fase.estado === 'Pendiente' ? 'Pendiente por iniciar' : `Actualizado: ${new Date(fase.updatedAt || new Date()).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openQuickPhase(fase)}
                          disabled={isLocked}
                          aria-label={`Registrar avance de ${fase.nombre}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-40"
                        >
                          <Zap className="h-3.5 w-3.5" /> Avance
                        </button>
                        <button
                          type="button"
                          onClick={() => openPhaseModal(fase)}
                          aria-label={`Editar detalles de ${fase.nombre}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5" /> Detalles
                        </button>
                        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                           fase.estado.includes('Comp') || fase.estado === 'Cerrada' ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-600'
                        }`}>
                           {fase.estado}
                        </span>
                        {!isLocked && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Eliminar la fase "${fase.nombre}"?`)) {
                                const { deletePhase } = useSpecialProjectsStore.getState();
                                deletePhase(project.id.toString(), fase.id.toString());
                              }
                            }}
                            className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ejecutor</p>
                        <p className="text-xs font-black text-gray-700 truncate">{fase.personal?.nombre || fase.responsable || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Máquina</p>
                        <p className="text-xs font-black text-gray-700 truncate">{fase.maquina?.descripcion || 'No definida'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Horas Reales</p>
                        <p className="text-xs font-black text-orange-600">{Number(fase.horas_reales || 0)} Hras</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inversión Fase</p>
                        <p className="text-xs font-black text-green-600">${Number(fase.costo_operacion || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Widgets (4 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Hour Meter Widget */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[2rem] text-white shadow-xl shadow-orange-100">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-black uppercase tracking-tight">Consumo Total</h2>
               <Clock className="w-6 h-6 text-white/50" />
             </div>
             <div className="flex flex-col items-center py-4">
                <p className="text-6xl font-black mb-1">{getTotalHours()}</p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">Horas Hombre</p>
             </div>
             <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-[10px] font-bold text-orange-100 uppercase italic">Basado en reportes de fase</p>
             </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-900">Órdenes vinculadas</h2>
              <Link to="/orders" className="text-xs font-bold text-teal-700 hover:underline">Ver órdenes</Link>
            </div>
            {project.ordenes?.length ? (
              <div className="space-y-2">
                {project.ordenes.map(order => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{order.numero_ot}</p>
                      <p className="text-xs text-slate-500">{order.tipo_orden.split('_').join(' ')}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">{order.estado_ot}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hay órdenes vinculadas.</p>
            )}
          </div>

          {/* Technical Notes Widget */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <StickyNote className="w-6 h-6 text-yellow-500" /> Notas Técnicas
            </h2>
            <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-1">
              {project.notas?.map((note) => (
                <div key={note.id} className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100 relative">
                  <p className="text-xs text-gray-700 font-bold leading-relaxed mb-3">"{note.contenido}"</p>
                  <div className="flex justify-between items-center pt-2 border-t border-yellow-100">
                    <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">{note.autor}</span>
                    <span className="text-[9px] text-gray-400 font-bold">{new Date(note.fecha).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
              <textarea 
                placeholder="Escribe una observación..."
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white outline-none font-bold text-xs min-h-[80px]"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <button type="submit" className="bg-yellow-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-yellow-100">
                GUARDAR NOTA
              </button>
            </form>
          </div>

          {/* Extra Attachments Widget */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-purple-500" /> Anexos Extra
            </h2>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {project.archivos?.map((file) => (
                <a 
                  key={file.id} 
                  href={getAssetUrl(file.url_archivo)}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-brand-50 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                  <span className="text-[10px] font-black text-gray-700 truncate flex-1 uppercase tracking-tight">
                    {file.nombre_archivo}
                  </span>
                </a>
              ))}
            </div>
            <div className="relative group">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                onChange={handleUploadExtra}
                disabled={isUploading}
              />
              <div className="w-full border-2 border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:bg-brand-50/50 group-hover:border-brand-200 transition-all">
                <Plus className="w-6 h-6 text-gray-300 group-hover:text-brand-500" />
                <p className="text-[10px] font-black text-gray-400 group-hover:text-brand-600 uppercase tracking-widest">
                  {isUploading ? 'Subiendo...' : 'Subir nuevo anexo'}
                </p>
              </div>
            </div>
          </div>

          {/* History Log Widget */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-gray-900">
              <History className="w-6 h-6 text-blue-500" /> Historial de Cambios
            </h2>
            <div className="space-y-6 max-h-64 overflow-y-auto pr-2 relative">
              {project.historial?.map((item) => (
                <div key={item.id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-brand-500 before:rounded-full after:absolute after:left-[3px] after:top-4 after:w-0.5 after:h-full after:bg-gray-50 last:after:hidden">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">
                    {new Date(item.fecha).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-700 font-bold leading-tight">{item.descripcion}</p>
                  <p className="text-[8px] text-brand-500 font-black uppercase mt-1 tracking-widest">Por: {item.usuario?.nombre || 'SISTEMA'}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modals and Overlays */}
      {isPhaseModalOpen && selectedFase && (
        <ProcessModal
          fase={selectedFase}
          projectId={project.id}
          onClose={() => setIsPhaseModalOpen(false)}
          onUpdate={(updatedFase) => {
            updatePhase(project.id.toString(), updatedFase.id.toString(), updatedFase);
            setIsPhaseModalOpen(false);
          }}
        />
      )}

      {isQuickPhaseOpen && selectedFase && (
        <QuickPhaseModal
          projectId={project.id}
          phase={selectedFase}
          onClose={() => setIsQuickPhaseOpen(false)}
        />
      )}

      {isPieceMatrixOpen && (
        <PieceMatrix projectId={project.id} onClose={() => setIsPieceMatrixOpen(false)} />
      )}

      {isEditProjectModalOpen && project && (
        <EditProjectModal
          project={project}
          onClose={() => setIsEditProjectModalOpen(false)}
        />
      )}

    </div>
  );
};

export default SpecialProjectDetails;
