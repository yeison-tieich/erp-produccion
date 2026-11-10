
import React, { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, API_BASE_URL, updateServerUrl } from '../api';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showServerConfig, setShowServerConfig] = useState(false);
    const [customServerUrl, setCustomServerUrl] = useState(API_BASE_URL);
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            setAuth(res.data.user, res.data.token);

            // Redirect based on role
            if (res.data.user.rol === 'Operario') {
                navigate('/tasks');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            if (!err.response) {
                setError(`No hay conexión con el servidor (${API_BASE_URL}). Verifica que el móvil esté conectado al mismo Wi-Fi y la IP sea correcta.`);
            } else if (err.response.status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else {
                setError(`El servidor respondió con error (${err.response.status}).`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveServerUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (customServerUrl.trim()) {
            updateServerUrl(customServerUrl.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-center mb-8">
                    <img src="/logo.png" alt="Logo MT" className="h-24 w-auto object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Iniciar Sesión</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg hover:bg-brand-700 transition-colors font-medium shadow-sm hover:shadow-md cursor-pointer"
                    >
                        {isSubmitting ? 'Conectando...' : 'Ingresar'}
                    </button>
                </form>

                {/* Configuración rápida de Servidor / IP para pruebas móviles */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => setShowServerConfig(!showServerConfig)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center justify-between w-full"
                    >
                        <span className="truncate">Servidor: <strong className="text-gray-700">{API_BASE_URL}</strong></span>
                        <span className="text-brand-600 font-medium ml-2">{showServerConfig ? 'Ocultar' : 'Cambiar IP'}</span>
                    </button>

                    {showServerConfig && (
                        <form onSubmit={handleSaveServerUrl} className="mt-3 space-y-2">
                            <label className="block text-xs font-medium text-gray-600">
                                Dirección del Servidor / Backend (ej. http://192.168.20.100):
                            </label>
                            <input
                                type="text"
                                value={customServerUrl}
                                onChange={(e) => setCustomServerUrl(e.target.value)}
                                placeholder="http://192.168.20.100"
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-brand-500 outline-none"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="submit"
                                    className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 cursor-pointer"
                                >
                                    Guardar y Reiniciar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
