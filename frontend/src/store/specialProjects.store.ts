import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../api';
import { ProyectoEspecial } from '../types';

const getApiErrorMessage = (error: any, fallback: string) =>
  error.response?.data?.message || error.message || fallback;

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
  addPiecesBulk: (id: string, requestId: string, pieces: any[]) => Promise<void>;
  addPieceRecord: (pieceId: string, record: any) => Promise<void>;
  updatePiece: (pieceId: string, piece: any) => Promise<void>;
  deletePiece: (pieceId: string) => Promise<void>;
  updatePhase: (projectId: string, phaseId: string, phaseData: any) => Promise<void>;
  transitionPhase: (projectId: string, phaseId: string) => Promise<void>;
  quickUpdatePhase: (projectId: string, phaseId: string, phaseData: any) => Promise<void>;
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
      set({ error: getApiErrorMessage(error, 'No se pudieron cargar los proyectos'), loading: false });
    }
  },
  fetchProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/special-projects/${id}`);
      set({ project: response.data, loading: false });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudo cargar el proyecto'), loading: false });
    }
  },
  createProject: async (project) => {
    set({ loading: true, error: null });
    try {
      const isFormData = project instanceof FormData;
      const headers = isFormData ? undefined : { 'Content-Type': 'application/json' };
      
      await axios.post(`${API_URL}/special-projects`, project, { headers });
      // After creating, fetch all projects again to update the list
      const response = await axios.get(`${API_URL}/special-projects`);
      set({ projects: response.data, loading: false });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudo crear el proyecto'), loading: false });
      throw error;
    }
  },
  updateProject: async (id, project) => {
    set({ loading: true, error: null });
    try {
      const isFormData = project instanceof FormData;
      const headers = isFormData ? undefined : { 'Content-Type': 'application/json' };
      
      await axios.put(`${API_URL}/special-projects/${id}`, project, { headers });
      // After updating, fetch the project again to get the latest data
      const response = await axios.get(`${API_URL}/special-projects/${id}`);
      set({ project: response.data, loading: false });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudo actualizar el proyecto'), loading: false });
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
      set({ error: getApiErrorMessage(error, 'No se pudo eliminar el proyecto'), loading: false });
    }
  },
  addNote: async (projectId, note) => {
    try {
      await axios.post(`${API_URL}/special-projects/${projectId}/notes`, note);
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudo agregar la nota') });
    }
  },
  updateMaterials: async (projectId, materiales) => {
    try {
      await axios.put(`${API_URL}/special-projects/${projectId}/materials`, { materiales });
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudieron actualizar los materiales') });
    }
  },
  uploadAttachment: async (projectId, file) => {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      await axios.post(`${API_URL}/special-projects/${projectId}/attachments`, formData, {
        headers: undefined
      });
      // Refresh project details
      const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
      set({ project: response.data });
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudo cargar el archivo') });
    }
  },
  fetchPieces: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/special-projects/${id}/pieces`);
      set((state) => ({
        project: state.project?.id === Number(id) ? { ...state.project, piezas: response.data } : state.project
      }));
    } catch (error: any) {
      set({ error: getApiErrorMessage(error, 'No se pudieron cargar las piezas') });
    }
  },
  addPiece: async (id, piece) => {
    set({ loading: true, error: null });
    try {
      const isFormData = piece instanceof FormData;
      const headers = isFormData ? undefined : { 'Content-Type': 'application/json' };
      
      await axios.post(`${API_URL}/special-projects/${id}/pieces`, piece, { headers });
      const store = useSpecialProjectsStore.getState();
      await store.fetchProject(id);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Error al agregar pieza', loading: false });
    }
  },
  addPiecesBulk: async (id, requestId, pieces) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/special-projects/${id}/pieces/bulk`, { requestId, rows: pieces });
      set(state => ({
        project: state.project?.id === Number(id)
          ? { ...state.project, piezas: [...(state.project.piezas || []), ...response.data.piezas] }
          : state.project,
        loading: false,
      }));
      return response.data;
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'No se pudo guardar el despiece');
      set({ error: message, loading: false });
      throw error;
    }
  },
  addPieceRecord: async (pieceId, record) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_URL}/special-projects/pieces/${pieceId}/records`, record);
      const projectId = useSpecialProjectsStore.getState().project?.id;
      if (projectId) {
        const response = await axios.get(`${API_URL}/special-projects/${projectId}`);
        set({ project: response.data });
      }
      set({ loading: false });
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Error al agregar registro');
      set({ error: message, loading: false });
      throw error;
    }
  },
  updatePiece: async (pieceId, piece) => {
    set({ loading: true, error: null });
    try {
      const isFormData = piece instanceof FormData;
      const headers = isFormData ? undefined : { 'Content-Type': 'application/json' };
      
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
      set({ error: getApiErrorMessage(error, 'No se pudo eliminar la pieza') });
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
  transitionPhase: async (projectId, phaseId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/special-projects/${projectId}/fases/transition`, { fase_destino_id: Number(phaseId) });
      set(state => ({
        project: state.project?.id === Number(projectId) ? response.data : state.project,
        projects: state.projects.map(project => project.id === Number(projectId) ? { ...project, ...response.data } : project),
        loading: false,
      }));
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'No se pudo cambiar la fase activa');
      set({ error: message, loading: false });
      throw error;
    }
  },
  quickUpdatePhase: async (projectId, phaseId, phaseData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/special-projects/${projectId}/fases/${phaseId}`, phaseData);
      set(state => {
        const updatedProject = state.project?.id === Number(projectId)
          ? {
              ...state.project,
              porcentaje_avance: response.data.porcentaje_avance,
              fases: state.project.fases.map(phase => phase.id === Number(phaseId) ? { ...phase, ...response.data } : phase),
            }
          : state.project;
        return {
          project: updatedProject,
          projects: state.projects.map(project => project.id === Number(projectId) ? { ...project, ...updatedProject } : project),
          loading: false,
        };
      });
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'No se pudo actualizar la fase');
      set({ error: message, loading: false });
      throw error;
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
