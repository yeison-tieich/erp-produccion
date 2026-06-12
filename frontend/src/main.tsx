
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./firebase";

// Restablecer tema de forma síncrona al iniciar para evitar parpadeos blancos
(() => {
  try {
    const saved = localStorage.getItem('user_theme_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      const root = document.documentElement;

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
          root.style.setProperty(key, value);
        });
      }

      const isDefaultSurface = !settings.color_superficie || settings.color_superficie.toLowerCase() === '#ffffff';
      const isDefaultBorder = !settings.color_borde || 
                              settings.color_borde.toLowerCase() === '#e2e8f0' || 
                              settings.color_borde.toLowerCase() === '#4e5c6e';
      const isDefaultText = !settings.color_texto || settings.color_texto.toLowerCase() === '#0f172a';

      if (!isDefaultSurface) root.style.setProperty('--color-surface', settings.color_superficie);
      if (!isDefaultBorder) root.style.setProperty('--color-border', settings.color_borde);
      if (!isDefaultText) root.style.setProperty('--color-text', settings.color_texto);

      const isDark = settings.tema === 'Oscuro' || 
                     (settings.tema === 'Automático' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  } catch (e) {
    console.warn('Error al cargar tema inicial:', e);
  }
})();



import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red' }}>
                    <h1>Application Error</h1>
                    <pre>{this.state.error?.toString()}</pre>
                    <pre>{this.state.error?.stack}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
