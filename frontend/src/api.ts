import { Capacitor } from '@capacitor/core';

const getInitialBaseUrl = () => {
    const savedUrl = localStorage.getItem('SERVER_URL');
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
        return import.meta.env.VITE_API_URL_PRODUCTION || 'https://mecaytro.parrandavallenatanuevayork.com';
    }

    if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const isLocalhostUrl = savedUrl && /localhost|127\.0\.0\.1/.test(savedUrl);
    if (savedUrl && !(isNative && isLocalhostUrl)) return savedUrl;

    // Si estamos en el navegador y se accede por una IP local o localhost, derivar la URL dinámicamente
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        // Si el hostname es localhost, 127.0.0.1 o una IP de red local (ej. 192.168.x.x)
        if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\.\d+\.\d+$/.test(hostname) || /^10\.\d+\.\d+\.\d+$/.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) {
            return `${window.location.protocol}//${hostname}:3000`;
        }
    }

    return import.meta.env.VITE_API_URL || 'https://mecaytro.parrandavallenatanuevayork.com';
};

let currentBaseUrl = getInitialBaseUrl();

export let API_BASE_URL = currentBaseUrl;
export let API_URL = `${currentBaseUrl}/api`;
export let BASE_URL = currentBaseUrl;

/**
 * Convierte rutas antiguas del servidor en URLs completas sin alterar las
 * URLs absolutas que entrega Cloudinary.
 */
export const getAssetUrl = (url: string) => {
    if (!url) return '';

    const normalizePath = (path: string) => {
        const normalized = path.replace(/^\/+/, '');
        const legacyImagePrefix = 'Inventario Producto_Images/';
        return normalized.startsWith(legacyImagePrefix)
            ? `images/${normalized.slice(legacyImagePrefix.length)}`
            : normalized;
    };

    if (/^https?:/i.test(url)) {
        try {
            const asset = new URL(url);
            const path = normalizePath(decodeURIComponent(asset.pathname));
            const isServerAsset = /^(images|public|uploads)\//i.test(path);
            const isPrivateHost = asset.hostname === 'localhost'
                || asset.hostname === '127.0.0.1'
                || /^192\.168\.\d+\.\d+$/.test(asset.hostname)
                || /^10\.\d+\.\d+\.\d+$/.test(asset.hostname)
                || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(asset.hostname);

            if (asset.protocol === 'http:' && isServerAsset && isPrivateHost) {
                return `${API_BASE_URL.replace(/\/$/, '')}/${path}${asset.search}${asset.hash}`;
            }
        } catch {
            return url;
        }
        return url;
    }

    if (/^(data:|blob:)/i.test(url)) return url;
    return `${API_BASE_URL.replace(/\/$/, '')}/${normalizePath(url)}`;
};

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
