
import { create } from 'zustand';
import axios from 'axios';

interface User {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    permisos?: string | null;
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

const getInitialUser = (): User | null => {
    const saved = localStorage.getItem('user');
    if (saved) return JSON.parse(saved);
    return null;
};

const getInitialToken = (): string | null => {
    const saved = localStorage.getItem('token');
    if (saved) return saved;
    return null;
};

const redirectToLogin = () => {
    useAuthStore.getState().logout();
    if (window.location.pathname !== '/login') {
        window.location.replace('/login');
    }
};

let expirationTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleTokenExpiration = (token: string | null) => {
    if (expirationTimer) clearTimeout(expirationTimer);
    if (!token) return;

    try {
        const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(encodedPayload));
        const remainingMs = payload.exp * 1000 - Date.now();
        if (remainingMs <= 0) {
            redirectToLogin();
            return;
        }
        expirationTimer = setTimeout(redirectToLogin, remainingMs);
    } catch {
        // El servidor seguirá validando tokens malformados en la siguiente solicitud.
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: getInitialUser(),
    token: getInitialToken(),
    setAuth: (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        set({ user, token });
        scheduleTokenExpiration(token);
    },
    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },
    logout: () => {
        if (expirationTimer) clearTimeout(expirationTimer);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));

scheduleTokenExpiration(getInitialToken());

// Configure axios interceptor
axios.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
            redirectToLogin();
        }
        return Promise.reject(error);
    }
);
