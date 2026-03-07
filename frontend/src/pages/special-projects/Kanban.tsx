import React, { useEffect, useState } from 'react';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';
import { ProyectoEspecial } from '../../types';
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
              <Draggable key={project.id} draggableId={String(project.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white rounded-lg p-4 mb-2 shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                  >
                    <h3 className="font-semibold">{project.descripcion_tecnica}</h3>
                    <p className="text-sm text-gray-600">Cliente: {project.cliente}</p>
                    <p className="text-sm">Prioridad: {project.prioridad}</p>
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
  const { projects, fetchProjects, updateProject } = useSpecialProjectsStore();
  const [columns, setColumns] = useState<{ [key: string]: ProyectoEspecial[] }>({});

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const projectPhases = [
      'Diseño',
      'Programación',
      'Fabricación',
      'Ajuste',
      'Prueba',
      'Cierre',
    ];
    const newColumns: { [key: string]: ProyectoEspecial[] } = {};
    projectPhases.forEach(phase => {
        newColumns[phase] = projects.filter(p => p.fases.find(f => f.estado === 'En Progreso')?.nombre === phase);
    });
    // Add a column for projects that are not in progress
    newColumns['Pendiente'] = projects.filter(p => !p.fases.find(f => f.estado === 'En Progreso'));
    setColumns(newColumns);
  }, [projects]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    // TODO: Implement logic to update project phase
    console.log(source, destination);
  };

  return (
    <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Kanban de Proyectos Especiales</h1>
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
