import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSpecialProjectsStore } from '../store/specialProjects.store';
import { getAssetUrl } from '../api';
import { AlertCircle, Loader2, Trash2, Plus, RefreshCw } from 'lucide-react';

const SpecialProjects: React.FC = () => {
  const { projects, loading, error, fetchProjects, deleteProject } = useSpecialProjectsStore();
  const [filterStatus, setFilterStatus] = React.useState<string>('Activos'); // 'Todos', 'Activos', 'Pendiente', 'En proceso', 'En pausa', 'Finalizado'

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(p => {
    if (filterStatus === 'Activos') return p.estado !== 'Finalizado';
    if (filterStatus === 'Todos') return true;
    return p.estado === filterStatus;
  });

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Eliminar este proyecto?')) {
      await deleteProject(id.toString());
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Proyectos Especiales</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión de proyectos y fabricación personalizada</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Link to="/special-projects/new" className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-brand-100 transition-all text-center flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> NUEVO PROYECTO
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        {['Activos', 'Todos', 'Pendiente', 'En proceso', 'En pausa', 'Finalizado'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            aria-pressed={filterStatus === status}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filterStatus === status 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-100' 
              : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading && projects.length === 0 && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-12 text-gray-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="font-semibold">Cargando proyectos...</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">No se pudieron cargar los proyectos</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <button onClick={() => fetchProjects()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h2 className="text-lg font-black text-gray-900">No hay proyectos en esta vista</h2>
          <p className="mt-2 text-sm text-gray-500">Crea un proyecto o cambia el filtro para consultar otros estados.</p>
          <Link to="/special-projects/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Crear proyecto
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white border p-0 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {project.foto_referencia_url ? (
              <img 
                src={getAssetUrl(project.foto_referencia_url)}
                alt={project.descripcion_tecnica}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h2 className="font-black text-lg text-gray-900 leading-tight flex-1">{project.descripcion_tecnica}</h2>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    project.prioridad === 'Alta' ? 'bg-red-500 text-white' : 
                    project.prioridad === 'Media' ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {project.prioridad}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(e, project.id)}
                    aria-label={`Eliminar proyecto ${project.descripcion_tecnica}`}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">Cliente: <span className="text-gray-900">{project.cliente}</span></p>
              <p className="text-gray-500 text-sm font-medium mb-4">Estado: <span className="font-bold text-brand-600">{project.estado}</span></p>
              
              <div className="mt-auto">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-black text-gray-400">PROGRESO</span>
                  <span className="text-xs font-black text-brand-600">{project.porcentaje_avance}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    role="progressbar"
                    aria-label={`Progreso de ${project.descripcion_tecnica}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(Math.max(Number(project.porcentaje_avance) || 0, 0), 100)}
                    className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(Number(project.porcentaje_avance) || 0, 0), 100)}%` }}
                  ></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link to={`/special-projects/${project.id}`} className="col-span-2 rounded-lg bg-slate-900 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">
                    Abrir proyecto
                  </Link>
                  <Link to={`/special-projects/${project.id}?action=pieces`} className="min-h-11 rounded-lg border border-slate-200 py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">
                    Despiece
                  </Link>
                  <Link to={`/special-projects/${project.id}?action=advance`} className="min-h-11 rounded-lg border border-teal-200 bg-teal-50 py-3 text-center text-xs font-bold text-teal-800 hover:bg-teal-100">
                    Registrar avance
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialProjects;
