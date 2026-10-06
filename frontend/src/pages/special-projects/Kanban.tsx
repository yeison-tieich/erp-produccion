import React, { useEffect, useState } from 'react';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { ProyectoEspecial } from '../../types';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

const KanbanColumn: React.FC<{ title: string; projects: ProyectoEspecial[] }> = ({ title, projects }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-2 w-80">
      <h2 className="font-bold text-lg mb-4 text-center">{title}</h2>
      <Droppable droppableId={title}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`min-h-screen ${snapshot.isDraggingOver ? 'bg-blue-100' : ''}`}
          >
            {projects.map((project, index) => (
              <Draggable key={project.id} draggableId={`${project.id}:${title}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white rounded-lg p-4 mb-2 shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                  >
                    <Link to={`/special-projects/${project.id}`} className="block font-semibold hover:text-brand-600">
                      {project.descripcion_tecnica}
                    </Link>
                    <p className="text-sm text-gray-600">Cliente: {project.cliente}</p>
                    <p className="text-sm">Prioridad: {project.prioridad}</p>
                    <p className="mt-2 text-xs font-bold text-gray-500">Avance: {project.porcentaje_avance}%</p>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const SpecialProjectsKanban: React.FC = () => {
  const { projects, fetchProjects, transitionPhase } = useSpecialProjectsStore();
  const [columns, setColumns] = useState<{ [key: string]: ProyectoEspecial[] }>({});

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const projectPhases = Array.from(new Set(projects.flatMap(project => project.fases?.map(phase => phase.nombre) || [])));
    const newColumns: { [key: string]: ProyectoEspecial[] } = {};
    projectPhases.forEach(phase => {
      newColumns[phase] = projects.filter(p => p.fases.find(f => f.estado === 'En Progreso')?.nombre === phase);
    });
    newColumns['Pendiente'] = projects.filter(p => !p.fases.find(f => f.estado === 'En Progreso'));
    setColumns(newColumns);
  }, [projects]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const projectId = Number(result.draggableId.split(':')[0]);
    const project = projects.find(item => item.id === projectId);
    const targetPhase = project?.fases.find(phase => phase.nombre === destination.droppableId);
    if (!project || !targetPhase || targetPhase.nombre === source.droppableId) return;

    try {
      await transitionPhase(project.id.toString(), targetPhase.id.toString());
    } catch (error: any) {
      window.alert(error.response?.data?.message || 'No se pudo mover el proyecto a esa fase.');
    }
  };

  return (
    <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Kanban de Proyectos Especiales</h1>
        {Object.keys(columns).length === 1 && columns.Pendiente?.length > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">Los proyectos no tienen fases configuradas. Agrega fases para habilitar movimientos entre columnas.</p>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4 overflow-x-auto">
            {Object.entries(columns).map(([title, projects]) => (
                <KanbanColumn key={title} title={title} projects={projects} />
            ))}
            </div>
        </DragDropContext>
    </div>
  );
};

export default SpecialProjectsKanban;
