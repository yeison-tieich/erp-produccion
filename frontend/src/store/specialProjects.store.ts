import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../api';
import { ProyectoEspecial } from '../types';

interface SpecialProjectsState {
  projects: ProyectoEspecial[];
  project: ProyectoEspecial | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (project: FormData | Omit<ProyectoEspecial, 'id' | 'createdAt' | 'updatedAt' | 'fases' | 'historial' | 'archivos' | 'notas' | 'cargas_maquina' | 'porcentaje_avance' | 'indicador_riesgo' | 'bloqueado'>) => Promise<void>;
  updateProject: (id: string, project: FormData | Partial<ProyectoEspecial>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addNote: (id: string, note: any) => Promise<void>;
  updateMaterials: (id: string, materiales: any[]) => Promise<void>;
  uploadAttachment: (id: string, file: File) => Promise<void>;
  // Piece management
  fetchPieces: (id: string) => Promise<void>;
  addPiece: (id: string, piece: any) => Promise<void>;
  addPieceRecord: (pieceId: string, record: any) => Promise<void>;
  updatePiece: (pieceId: string, piece: any) => Promise<void>;
  deletePiece: (pieceId: string) => Promise<void>;
  updatePhase: (projectId: string, phaseId: string, phaseData: any) => Promise<void>;
  addPhase: (projectId: string, phaseData: any) => Promise<void>;
  deletePhase: (projectId: string, phaseId: string) => Promise<void>;
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
      const isFormData = project instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
      
      await axios.post(`${API_URL}/special-projects`, project, { headers });
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
      const isFormData = project instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
      
      await axios.put(`${API_URL}/special-projects/${id}`, project, { headers });
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
  addNote: async (projectId, note) => {
    try {
      await axios.post(`${API_URL}/special-projects/${projectId}/notes`, note);
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  updateMaterials: async (projectId, materiales) => {
    try {
      await axios.put(`${API_URL}/special-projects/${projectId}/materials`, { materiales });
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  uploadAttachment: async (projectId, file) => {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      await axios.post(`${API_URL}/special-projects/${projectId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  fetchPieces: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/special-projects/${id}/pieces`);
      set((state) => ({
        project: state.project?.id === Number(id) ? { ...state.project, piezas: response.data } : state.project
      }));
    } catch (error: any) {
      console.error('Error fetching pieces', error);
    }
  },
  addPiece: async (id, piece) => {
    set({ loading: true, error: null });
    try {
      const isFormData = piece instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
      
      await axios.post(`${API_URL}/special-projects/${id}/pieces`, piece, { headers });
      const store = useSpecialProjectsStore.getState();
      await store.fetchProject(id);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al agregar pieza', loading: false });
    }
  },
  addPieceRecord: async (pieceId, record) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/special-projects/pieces/${pieceId}/records`, record);
      const store = useSpecialProjectsStore.getState();
      if (store.project) {
        await store.fetchPieces(store.project.id.toString());
        await store.fetchProject(store.project.id.toString());
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al agregar registro', loading: false });
    }
  },
  updatePiece: async (pieceId, piece) => {
    set({ loading: true, error: null });
    try {
      const isFormData = piece instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
      
      await axios.put(`${API_URL}/special-projects/pieces/${pieceId}`, piece, { headers });
      const store = useSpecialProjectsStore.getState();
      if (store.project) {
        await store.fetchProject(store.project.id.toString());
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al actualizar pieza', loading: false });
    }
  },
  deletePiece: async (pieceId) => {
    try {
      await axios.delete(`${API_URL}/special-projects/pieces/${pieceId}`);
      const store = useSpecialProjectsStore.getState();
      if (store.project) await store.fetchPieces(store.project.id.toString());
    } catch (error: any) {
      console.error('Error deleting piece', error);
    }
  },
  updatePhase: async (projectId, phaseId, phaseData) => {
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_URL}/special-projects/${projectId}/fases/${phaseId}`, phaseData);
      const store = useSpecialProjectsStore.getState();
      await store.fetchProject(projectId);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al actualizar fase', loading: false });
    }
  },
  addPhase: async (projectId, phaseData) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/special-projects/${projectId}/fases`, phaseData);
      const store = useSpecialProjectsStore.getState();
      await store.fetchProject(projectId);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al agregar fase', loading: false });
    }
  },
  deletePhase: async (projectId, phaseId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_URL}/special-projects/${projectId}/fases/${phaseId}`);
      const store = useSpecialProjectsStore.getState();
      await store.fetchProject(projectId);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al eliminar fase', loading: false });
    }
  }
}));
