import { Capacitor } from '@capacitor/core';

const getInitialBaseUrl = () => {
    const savedUrl = localStorage.getItem('SERVER_URL');
    const isNative = Capacitor.isNativePlatform();

    // Si el usuario configuró una URL manualmente, respetarla (evitando localhost si estamos en un teléfono real)
    const isLocalhostUrl = savedUrl && /localhost|127\.0\.0\.1/.test(savedUrl);
    if (savedUrl && !(isNative && isLocalhostUrl)) {
        return savedUrl.replace(/\/$/, '');
    }

    if (isNative) {
        return (
            import.meta.env.VITE_API_URL_PRODUCTION ||
            import.meta.env.VITE_API_URL ||
            'http://192.168.20.100'
        ).replace(/\/$/, '');
    }

    // Si estamos en el navegador
    if (typeof window !== 'undefined' && window.location) {
        // En entorno de desarrollo Vite (puerto 5173), apuntar al backend local en puerto 3000
        if (window.location.port === '5173') {
            return `${window.location.protocol}//${window.location.hostname}:3000`;
        }

        // Si se definió explícitamente en el build de producción y no es el fallback predeterminado
        if (import.meta.env.PROD && import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('192.168.20.100')) {
            return import.meta.env.VITE_API_URL.replace(/\/$/, '');
        }

        // En producción web (servido por Nginx u otro servidor web), usar el mismo origen
        return window.location.origin;
    }

    return (import.meta.env.VITE_API_URL || 'http://192.168.20.100').replace(/\/$/, '');
};

let currentBaseUrl = getInitialBaseUrl();

export let API_BASE_URL = currentBaseUrl;
export let API_URL = `${currentBaseUrl}/api`;
export let BASE_URL = currentBaseUrl;

/**
 * Convierte rutas del servidor en URLs accesibles de forma dinámica y robusta,
 * eliminando IPs obsoletas hardcodeadas en BD y preservando Cloudinary/CDNs externos.
 */
export const getAssetUrl = (url?: string | null): string => {
    if (!url) return '';

    const normalizePath = (rawPath: string) => {
        const cleaned = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const legacyImagePrefix = 'Inventario Producto_Images/';
        return cleaned.startsWith(legacyImagePrefix)
            ? `images/${cleaned.slice(legacyImagePrefix.length)}`
            : cleaned;
    };

    if (/^(data:|blob:)/i.test(url)) return url;

    const isNative = Capacitor.isNativePlatform();

    if (/^https?:/i.test(url)) {
        try {
            const asset = new URL(url);

            // Si es Cloudinary o servicio externo CDN, retornar intacto
            if (asset.hostname.includes('cloudinary.com') || asset.hostname.includes('res.cloudinary')) {
                return url;
            }

            const path = normalizePath(decodeURIComponent(asset.pathname));
            const isServerAsset = /^(images|public|uploads)\//i.test(path);
            const isPrivateHost = asset.hostname === 'localhost'
                || asset.hostname === '127.0.0.1'
                || /^192\.168\.\d+\.\d+$/.test(asset.hostname)
                || /^10\.\d+\.\d+\.\d+$/.test(asset.hostname)
                || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(asset.hostname);

            if (isServerAsset && isPrivateHost) {
                // En navegador web (producción o desarrollo), servir usando el origen actual
                if (!isNative && typeof window !== 'undefined') {
                    if (window.location.port === '5173') {
                        return `${window.location.protocol}//${window.location.hostname}:3000/${path}${asset.search}${asset.hash}`;
                    }
                    return `/${path}${asset.search}${asset.hash}`;
                }
                return `${API_BASE_URL}/${path}${asset.search}${asset.hash}`;
            }
        } catch {
            return url;
        }
        return url;
    }

    const normalized = normalizePath(url);

    // En navegador web, si no es nativo:
    if (!isNative && typeof window !== 'undefined') {
        if (window.location.port === '5173') {
            return `${window.location.protocol}//${window.location.hostname}:3000/${normalized}`;
        }
        // En producción web (puerto 80 con Nginx o dominio), ruta relativa al origen
        return `/${normalized}`;
    }

    return `${API_BASE_URL}/${normalized}`;
};

/**
 * Actualiza la URL del servidor y recarga la página para aplicar los cambios globalmente.
 * @param url Nueva URL base del backend
 */
export const updateServerUrl = (url: string) => {
    localStorage.setItem('SERVER_URL', url);
    API_BASE_URL = url.replace(/\/$/, '');
    API_URL = `${API_BASE_URL}/api`;
    BASE_URL = API_BASE_URL;
    window.location.reload();
};

