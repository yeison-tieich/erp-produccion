
import { create } from 'zustand';
import axios from 'axios';

interface User {
    id: number;
    nombre: string;
    email: string;
    rol: 'Administrador' | 'Supervisor' | 'Operario';
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
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

export const useAuthStore = create<AuthState>((set) => ({
    user: getInitialUser(),
    token: getInitialToken(),
    setAuth: (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        set({ user, token });
    },
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));

// Configure axios interceptor
axios.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
