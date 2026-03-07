import { create } from 'zustand';
import axios from 'axios';
import { ProyectoEspecial } from '../types';

const API_URL = 'http://localhost:3000/api';

interface SpecialProjectsState {
  projects: ProyectoEspecial[];
  project: ProyectoEspecial | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (project: Omit<ProyectoEspecial, 'id' | 'createdAt' | 'updatedAt' | 'fases' | 'historial' | 'archivos' | 'notas' | 'cargas_maquina' | 'porcentaje_avance' | 'indicador_riesgo' | 'bloqueado' >) => Promise<void>;
  updateProject: (id: string, project: Partial<ProyectoEspecial>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useSpecialProjectsStore = create<SpecialProjectsState>((set) => ({
  projects: [],
  project: null,
  loading: false,
  error: null,
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/special-projects`);
      set({ projects: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  fetchProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/special-projects/${id}`);
      set({ project: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  createProject: async (project) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/special-projects`, project);
      // After creating, fetch all projects again to update the list
      const response = await axios.get(`${API_URL}/special-projects`);
      set({ projects: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  updateProject: async (id, project) => {
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_URL}/special-projects/${id}`, project);
      // After updating, fetch the project again to get the latest data
      const response = await axios.get(`${API_URL}/special-projects/${id}`);
      set({ project: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_URL}/special-projects/${id}`);
      // After deleting, remove the project from the local state
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== parseInt(id)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));
