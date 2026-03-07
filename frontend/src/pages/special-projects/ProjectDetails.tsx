import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';

const SpecialProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { project, fetchProject } = useSpecialProjectsStore();

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  if (!project) {
    return <div>Loading...</div>;
  }

  const getDaysRemaining = () => {
    const today = new Date();
    const commitmentDate = new Date(project.fecha_compromiso);
    const diffTime = commitmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{project.descripcion_tecnica}</h1>
          <Link to="/special-projects" className="text-white">
            Volver
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-400">Estado Actual</p>
            <p className="text-lg font-semibold">{project.estado}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">% Avance</p>
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full"
                style={{ width: `${project.porcentaje_avance}%` }}
              ></div>
            </div>
            <p className="text-center">{project.porcentaje_avance}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Días Restantes</p>
            <p className="text-lg font-semibold">{getDaysRemaining()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Indicador de Riesgo</p>
            <p className="text-lg font-semibold">{project.indicador_riesgo}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* Timeline */}
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Línea de Tiempo (Fases)</h2>
            <div className="relative border-l-2 border-gray-200">
              {project.fases.map((fase, index) => (
                <div key={fase.id} className="mb-8 ml-4">
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-1.5 border border-white"></div>
                  <time className="mb-1 text-sm font-normal leading-none text-gray-400">
                    {new Date(fase.fecha_inicio).toLocaleDateString()} - {fase.fecha_fin ? new Date(fase.fecha_fin).toLocaleDateString() : 'Presente'}
                  </time>
                  <h3 className="text-lg font-semibold text-gray-900">{fase.nombre}</h3>
                  <p className="text-base font-normal text-gray-500">Estado: {fase.estado}</p>
                  <p className="text-sm">Responsable: {fase.responsable}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Historial de Cambios */}
          <div>
            <h2 className="text-xl font-bold mb-2">Historial de Cambios</h2>
            <ul className="list-disc list-inside">
              {project.historial.map((item) => (
                <li key={item.id}>
                  {new Date(item.fecha).toLocaleString()}: {item.descripcion} (por {item.usuario.nombre})
                </li>
              ))}
            </ul>
          </div>

          {/* Consumo de horas */}
          <div>
            <h2 className="text-xl font-bold mb-2">Consumo de Horas</h2>
            {/* TODO: Implementar visualizacion de consumo de horas */}
          </div>

          {/* Archivos adjuntos */}
          <div>
            <h2 className="text-xl font-bold mb-2">Archivos Adjuntos</h2>
            <ul>
              {project.archivos.map((file) => (
                <li key={file.id}>
                  <a href={file.url_archivo} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                    {file.nombre_archivo}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Notas técnicas */}
          <div>
            <h2 className="text-xl font-bold mb-2">Notas Técnicas</h2>
            {project.notas.map((note) => (
              <div key={note.id} className="border-b py-2">
                <p className="text-sm text-gray-500">
                  {note.autor} - {new Date(note.fecha).toLocaleString()}
                </p>
                <p>{note.contenido}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialProjectDetails;
