import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { Users, UserPlus, Shield, Check, X, Edit3, Trash2, Key, CheckSquare, Square } from 'lucide-react';

interface User {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    cargo: string | null;
    activo: boolean;
    permisos: string | null;
}

const MODULES = [
    'Clientes',
    'Tareas',
    'Mantenimiento',
    'Inventario',
    'Órdenes',
    'Pedidos',
    'Personal',
    'Herramientas',
    'Proyectos Especiales',
    'Finanzas'
];

const ROLES = [
    'Administrador',
    'Gerencia',
    'Producción',
    'Calidad',
    'Almacén',
    'Compras',
    'Mantenimiento',
    'Operario',
    'Consulta'
];

export const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [form, setForm] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'Operario',
        cargo: '',
        activo: true
    });

    const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({});

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setForm({
            nombre: '',
            email: '',
            password: '',
            rol: 'Operario',
            cargo: '',
            activo: true
        });
        
        // Initialize default permissions matrix
        const defaultMatrix: Record<string, Record<string, boolean>> = {};
        MODULES.forEach(mod => {
            defaultMatrix[mod] = { ver: true, crear: false, editar: false, eliminar: false, exportar: false };
        });
        setPermissionMatrix(defaultMatrix);
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setForm({
            nombre: user.nombre,
            email: user.email,
            password: '',
            rol: user.rol,
            cargo: user.cargo || '',
            activo: user.activo
        });

        let currentMatrix: Record<string, Record<string, boolean>> = {};
        try {
            if (user.permisos) {
                currentMatrix = JSON.parse(user.permisos);
            }
        } catch (e) {}

        MODULES.forEach(mod => {
            if (!currentMatrix[mod]) {
                currentMatrix[mod] = { ver: true, crear: false, editar: false, eliminar: false, exportar: false };
            }
        });
        setPermissionMatrix(currentMatrix);
        setShowModal(true);
    };

    const togglePermission = (mod: string, action: string) => {
        setPermissionMatrix(prev => ({
            ...prev,
            [mod]: {
                ...prev[mod],
                [action]: !prev[mod]?.[action]
            }
        }));
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                permisos: permissionMatrix
            };

            if (editingUser) {
                await axios.put(`${API_URL}/users/${editingUser.id}`, payload);
                alert('Usuario actualizado correctamente');
            } else {
                await axios.post(`${API_URL}/users`, payload);
                alert('Usuario creado correctamente');
            }
            setShowModal(false);
            fetchUsers();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar usuario');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;
        try {
            await axios.delete(`${API_URL}/users/${id}`);
            fetchUsers();
        } catch (error) {
            alert('Error al eliminar usuario');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Panel de Usuarios & Permisos</h1>
                    <p className="text-gray-500 font-medium">Gestión de cuentas, roles del sistema y matriz de accesos.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-brand-100 hover:bg-brand-700 transition"
                >
                    <UserPlus className="w-5 h-5" /> Crear Usuario
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                            <tr>
                                <th className="p-5">Usuario</th>
                                <th className="p-5">Correo</th>
                                <th className="p-5">Rol / Cargo</th>
                                <th className="p-5">Estado</th>
                                <th className="p-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm font-medium">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                                    <td className="p-5 font-bold text-gray-900 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black">
                                            {u.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        {u.nombre}
                                    </td>
                                    <td className="p-5 text-gray-500">{u.email}</td>
                                    <td className="p-5">
                                        <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-black">
                                            {u.rol}
                                        </span>
                                        {u.cargo && <span className="text-xs text-gray-400 ml-2">({u.cargo})</span>}
                                    </td>
                                    <td className="p-5">
                                        {u.activo ? (
                                            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold">Activo</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold">Inactivo</span>
                                        )}
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl transition"
                                                title="Editar Usuario / Permisos"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit User & Matrix Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">
                                {editingUser ? 'Editar Usuario y Matriz de Permisos' : 'Crear Nuevo Usuario'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.nombre}
                                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Correo / Usuario</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Contraseña inicial'}
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Rol</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.rol}
                                        onChange={e => setForm({ ...form, rol: e.target.value })}
                                    >
                                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Cargo</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.cargo}
                                        onChange={e => setForm({ ...form, cargo: e.target.value })}
                                        placeholder="Ej: Operador de Torno"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Estado</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                                        value={form.activo ? 'true' : 'false'}
                                        onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            {/* PERMISSION MATRIX */}
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-brand-600" /> Matriz de Permisos por Módulo
                                </h3>

                                <div className="bg-gray-50 p-4 rounded-2xl border overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs font-black uppercase text-gray-400 border-b">
                                                <th className="py-2">Módulo</th>
                                                <th className="py-2 text-center">Ver</th>
                                                <th className="py-2 text-center">Crear</th>
                                                <th className="py-2 text-center">Editar</th>
                                                <th className="py-2 text-center">Eliminar</th>
                                                <th className="py-2 text-center">Exportar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 text-sm font-bold text-gray-700">
                                            {MODULES.map(mod => (
                                                <tr key={mod}>
                                                    <td className="py-3">{mod}</td>
                                                    {['ver', 'crear', 'editar', 'eliminar', 'exportar'].map(action => {
                                                        const isChecked = Boolean(permissionMatrix[mod]?.[action]);
                                                        return (
                                                            <td key={action} className="py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePermission(mod, action)}
                                                                    className="p-1 text-brand-600"
                                                                >
                                                                    {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-300" />}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-black text-sm"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white py-3.5 rounded-xl font-black text-sm shadow-md hover:bg-brand-700 transition"
                                >
                                    GUARDAR CONFIGURACIÓN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
