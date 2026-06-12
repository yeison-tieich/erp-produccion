import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSpecialProjectsStore } from '../store/specialProjects.store';
import { API_URL } from '../api';
import { Trash2, Plus, ArrowRight } from 'lucide-react';

const SpecialProjects: React.FC = () => {
  const { projects, fetchProjects, deleteProject } = useSpecialProjectsStore();
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white border p-0 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {project.foto_referencia_url ? (
              <img 
                src={`${API_URL.replace('/api', '')}${project.foto_referencia_url}`} 
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
                    className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${project.porcentaje_avance}%` }}
                  ></div>
                </div>
                <Link to={`/special-projects/${project.id}`} className="mt-4 w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-black py-3 rounded-xl text-center text-sm transition-all block">
                  VER DETALLES
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialProjects;
