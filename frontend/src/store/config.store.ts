import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../api';
import { applyThemeSettings, type ThemeSettings } from '../utils/theme';

type UserSettings = ThemeSettings & {
  notificaciones_app: boolean;
  notificaciones_email: boolean;
};

interface GlobalSettings {
  unidad_longitud: string;
  unidad_peso: string;
  unidad_volumen: string;
  decimales_produccion: number;
  decimales_costos: number;
  decimales_medidas: number;
  umbral_stock_minimo: number;
  dias_retraso_alerta: number;
  frecuencia_alertas: string;
  alarma_retraso_ot: boolean;
  alarma_bajo_stock: boolean;
  alarma_mantenimiento: boolean;
  alarma_fases_proyecto: boolean;
  nombre_empresa: string;
  nit_empresa: string;
  direccion_empresa: string;
  telefono_empresa: string;
  email_empresa: string;
  densidad_acero_default: number;
}

interface ConfigStore {
  userSettings: UserSettings | null;
  globalSettings: GlobalSettings | null;
  loading: boolean;
  error: string | null;
  
  fetchUserSettings: () => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  fetchGlobalSettings: () => Promise<void>;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
  applyTheme: (settings: Partial<UserSettings>) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  userSettings: null,
  globalSettings: null,
  loading: false,
  error: null,

  fetchUserSettings: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const res = await axios.get(`${API_URL}/settings/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ userSettings: res.data, loading: false });
      get().applyTheme(res.data);
    } catch (error) {
      set({ error: 'Error fetching user settings', loading: false });
    }
  },

  updateUserSettings: async (settings) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const res = await axios.put(`${API_URL}/settings/user`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ userSettings: res.data });
      get().applyTheme(res.data);
    } catch (error) {
      console.error('Error updating user settings:', error);
      set({ error: 'Error updating user settings' });
      throw error;
    }
  },

  fetchGlobalSettings: async () => {
    set({ loading: true });
    try {
      const res = await axios.get(`${API_URL}/settings`);
      set({ globalSettings: res.data, loading: false });
    } catch (error) {
      set({ error: 'Error fetching global settings', loading: false });
    }
  },

  updateGlobalSettings: async (settings) => {
    try {
      const res = await axios.put(`${API_URL}/settings`, settings);
      set({ globalSettings: res.data });
    } catch (error) {
      set({ error: 'Error updating global settings' });
    }
  },

  applyTheme: (settings) => {
    applyThemeSettings(settings);
  }
}));
