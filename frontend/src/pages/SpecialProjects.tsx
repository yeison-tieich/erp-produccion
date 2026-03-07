import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSpecialProjectsStore } from '../store/specialProjects.store';

const SpecialProjects: React.FC = () => {
  const { projects, fetchProjects } = useSpecialProjectsStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Proyectos Especiales</h1>
        <Link to="/special-projects/new" className="bg-blue-500 text-white px-4 py-2 rounded">
          Nuevo Proyecto
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="border p-4 rounded-lg shadow">
            <h2 className="font-bold text-lg">{project.descripcion_tecnica}</h2>
            <p>Cliente: {project.cliente}</p>
            <p>Estado: {project.estado}</p>
            <p>Avance: {project.porcentaje_avance}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${project.porcentaje_avance}%` }}
              ></div>
            </div>
            <Link to={`/special-projects/${project.id}`} className="text-blue-500 mt-2 inline-block">
              Ver Detalles
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialProjects;
