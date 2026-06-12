import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../api';

interface UserSettings {
  tema: 'Claro' | 'Oscuro' | 'Automático';
  color_primario: string;
  color_secundario: string;
  color_superficie: string;
  color_borde: string;
  color_texto: string;
  notificaciones_app: boolean;
  notificaciones_email: boolean;
}

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
  applyTheme: (settings: UserSettings) => void;
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
      set({ error: 'Error updating user settings' });
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
    const root = document.documentElement;

    // Persist to localStorage for synchronous, flicker-free recovery during boot
    try {
      localStorage.setItem('user_theme_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to persist theme settings:', e);
    }
    
    // Apply primary/brand colors dynamically if defined
    if (settings.color_primario) {
      const colors = {
        '--brand-50': settings.color_primario + '10',
        '--brand-100': settings.color_primario + '20',
        '--brand-200': settings.color_primario + '30',
        '--brand-300': settings.color_primario + '50',
        '--brand-400': settings.color_primario + '70',
        '--brand-500': settings.color_primario + '90',
        '--brand-600': settings.color_primario,
        '--brand-700': settings.color_primario + 'ee',
        '--brand-800': settings.color_primario + 'ff',
        '--brand-900': settings.color_primario,
        '--brand-950': settings.color_primario,
      };

      Object.entries(colors).forEach(([key, value]) => {
        if (value) root.style.setProperty(key, value);
      });
    }

    // Apply custom layout colors (surface, border, text) ONLY if they differ from standard defaults.
    // If they are equal to standard defaults, we remove the inline styles to let index.css rules (including .dark selector) take over.
    const isDefaultSurface = !settings.color_superficie || settings.color_superficie.toLowerCase() === '#ffffff';
    const isDefaultBorder = !settings.color_borde || 
                            settings.color_borde.toLowerCase() === '#e2e8f0' || 
                            settings.color_borde.toLowerCase() === '#4e5c6e';
    const isDefaultText = !settings.color_texto || settings.color_texto.toLowerCase() === '#0f172a';

    if (isDefaultSurface) {
      root.style.removeProperty('--color-surface');
    } else {
      root.style.setProperty('--color-surface', settings.color_superficie);
    }

    if (isDefaultBorder) {
      root.style.removeProperty('--color-border');
    } else {
      root.style.setProperty('--color-border', settings.color_borde);
    }

    if (isDefaultText) {
      root.style.removeProperty('--color-text');
    } else {
      root.style.setProperty('--color-text', settings.color_texto);
    }

    // Apply theme class
    const isDark = settings.tema === 'Oscuro' || 
                   (settings.tema === 'Automático' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}));
