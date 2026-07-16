// Intentar obtener la URL del servidor desde las variables de entorno de Vite, luego localStorage, o usar la de por defecto
let currentBaseUrl = import.meta.env.VITE_API_URL || localStorage.getItem('SERVER_URL') || 'https://erp-backend-pfbj.onrender.com';

export let API_BASE_URL = currentBaseUrl;
export let API_URL = `${currentBaseUrl}/api`;
export let BASE_URL = currentBaseUrl;

/**
 * Actualiza la URL del servidor y recarga la página para aplicar los cambios globalmente.
 * @param url Nueva URL base del backend
 */
export const updateServerUrl = (url: string) => {
    localStorage.setItem('SERVER_URL', url);
    API_BASE_URL = url;
    API_URL = `${url}/api`;
    BASE_URL = url;
    window.location.reload();
};
