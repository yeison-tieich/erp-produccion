import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Maquina, CargaMaquina } from '../../types';
import { API_URL } from '../../api';

interface MachineLoad extends Maquina {
  carga: CargaMaquina[];
}

const SpecialProjectsDashboard: React.FC = () => {
  const [machineLoad, setMachineLoad] = useState<MachineLoad[]>([]);
  const [week, setWeek] = useState(new Date().getWeek());
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchMachineLoad = async () => {
      try {
        // This endpoint needs to be created in the backend
        const response = await axios.get(`${API_URL}/machines/load?week=${week}&year=${year}`);
        setMachineLoad(response.data);
      } catch (error) {
        console.error('Error fetching machine load:', error);
      }
    };
    fetchMachineLoad();
  }, [week, year]);

  const getOccupationPercentage = (machine: MachineLoad) => {
    const assignedHours = machine.carga.reduce((acc, curr) => acc + curr.horas_asignadas, 0);
    const availableHours = machine.horas_disponibles_semana || 40;
    return (assignedHours / availableHours) * 100;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Carga de Máquinas</h1>
      <div className="flex items-center space-x-4 mb-4">
        <div>
          <label htmlFor="week">Semana:</label>
          <input
            type="number"
            id="week"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="border p-1"
          />
        </div>
        <div>
          <label htmlFor="year">Año:</label>
          <input
            type="number"
            id="year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border p-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machineLoad.map((machine) => {
          const occupation = getOccupationPercentage(machine);
          return (
            <div
              key={machine.id}
              className={`border p-4 rounded-lg ${occupation > 90 ? 'border-red-500' : ''
                }`}
            >
              <h2 className="font-bold text-lg">{machine.descripcion}</h2>
              <p>Horas disponibles semana: {machine.horas_disponibles_semana || 40}</p>
              <p>Horas asignadas: {machine.carga.reduce((acc, curr) => acc + curr.horas_asignadas, 0)}</p>
              <p>% Ocupación: {occupation.toFixed(2)}%</p>
              <h3 className="font-semibold mt-2">Proyectos Asignados:</h3>
              <ul>
                {machine.carga.map((carga) => (
                  <li key={carga.id}>{carga.proyecto_id}</li> // Would be better to show project name
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
      7
    )
  );
};


export default SpecialProjectsDashboard;
