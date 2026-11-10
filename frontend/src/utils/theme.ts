export interface ThemeSettings {
  tema: 'Claro' | 'Oscuro' | 'Automático';
  color_primario?: string;
  color_secundario?: string;
  color_superficie?: string;
  color_borde?: string;
  color_texto?: string;
}

const DEFAULT_THEME: ThemeSettings = {
  tema: 'Automático',
  color_primario: '#2563eb',
  color_secundario: '#475569',
  color_superficie: '#ffffff',
  color_borde: '#e2e8f0',
  color_texto: '#0f172a',
};

const normalizeHex = (value?: string) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isDefaultSurface = (value?: string) => {
  const normalized = normalizeHex(value);
  return !normalized || normalized.toLowerCase() === '#ffffff';
};

const isDefaultBorder = (value?: string) => {
  const normalized = normalizeHex(value);
  return !normalized ||
    normalized.toLowerCase() === '#e2e8f0' ||
    normalized.toLowerCase() === '#4e5c6e';
};

const isDefaultText = (value?: string) => {
  const normalized = normalizeHex(value);
  return !normalized || normalized.toLowerCase() === '#0f172a';
};

export const applyThemeSettings = (settings: Partial<ThemeSettings> = {}) => {
  const root = document.documentElement;
  const body = document.body;
  const merged: ThemeSettings = { ...DEFAULT_THEME, ...settings };
  const primaryColor = normalizeHex(merged.color_primario) || DEFAULT_THEME.color_primario as string;

  const palette = {
    '--brand-50': primaryColor + '10',
    '--brand-100': primaryColor + '20',
    '--brand-200': primaryColor + '30',
    '--brand-300': primaryColor + '50',
    '--brand-400': primaryColor + '70',
    '--brand-500': primaryColor + '90',
    '--brand-600': primaryColor,
    '--brand-700': primaryColor + 'ee',
    '--brand-800': primaryColor + 'ff',
    '--brand-900': primaryColor,
    '--brand-950': primaryColor,
  } as Record<string, string>;

  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  if (isDefaultSurface(merged.color_superficie)) {
    root.style.removeProperty('--color-surface');
  } else {
    root.style.setProperty('--color-surface', merged.color_superficie as string);
  }

  if (isDefaultBorder(merged.color_borde)) {
    root.style.removeProperty('--color-border');
  } else {
    root.style.setProperty('--color-border', merged.color_borde as string);
  }

  if (isDefaultText(merged.color_texto)) {
    root.style.removeProperty('--color-text');
  } else {
    root.style.setProperty('--color-text', merged.color_texto as string);
  }

  const darkEnabled = merged.tema === 'Oscuro' ||
    (merged.tema === 'Automático' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.classList.toggle('dark', darkEnabled);
  body.classList.toggle('dark', darkEnabled);
  body.classList.toggle('light', !darkEnabled);

  try {
    localStorage.setItem('user_theme_settings', JSON.stringify(merged));
  } catch (error) {
    console.warn('No se pudo persistir el tema:', error);
  }
};

export const readSavedThemeSettings = (): Partial<ThemeSettings> | null => {
  try {
    const saved = localStorage.getItem('user_theme_settings');
    if (!saved) return null;
    return JSON.parse(saved) as Partial<ThemeSettings>;
  } catch (error) {
    console.warn('No se pudo leer el tema guardado:', error);
    return null;
  }
};
