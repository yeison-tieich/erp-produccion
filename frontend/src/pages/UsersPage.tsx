import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { SideDrawer } from '../components/ui/SideDrawer';
import { Users, UserPlus, Shield, Check, X, Edit3, Trash2, Key, CheckSquare, Square, Loader2 } from 'lucide-react';
import { getPermissionMatrix } from '../utils/permissions';

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const createDefaultMatrix = () => {
        const defaultMatrix: Record<string, Record<string, boolean>> = {};
        MODULES.forEach(mod => {
            defaultMatrix[mod] = { ver: true, crear: false, editar: false, eliminar: false, exportar: false };
        });
        return defaultMatrix;
    };

    const [form, setForm] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'Operario',
        cargo: '',
        activo: true
    });

    const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>(createDefaultMatrix());

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

    const closeDrawer = () => {
        setShowModal(false);
        setEditingUser(null);
        setForm({
            nombre: '',
            email: '',
            password: '',
            rol: 'Operario',
            cargo: '',
            activo: true
        });
        setPermissionMatrix(createDefaultMatrix());
        setNotice(null);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setNotice(null);
        setForm({
            nombre: '',
            email: '',
            password: '',
            rol: 'Operario',
            cargo: '',
            activo: true
        });
        setPermissionMatrix(createDefaultMatrix());
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setNotice(null);
        setForm({
            nombre: user.nombre,
            email: user.email,
            password: '',
            rol: user.rol,
            cargo: user.cargo || '',
            activo: user.activo
        });

        const currentMatrix = getPermissionMatrix(user.permisos) ?? {};

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
        if (isSubmitting) return;

        setIsSubmitting(true);
        setNotice(null);

        try {
            const payload = {
                ...form,
                permisos: permissionMatrix
            };

            let savedUser: User | null = null;

            if (editingUser) {
                const res = await axios.put(`${API_URL}/users/${editingUser.id}`, payload);
                savedUser = res.data.user ?? res.data ?? editingUser;
                setUsers(prev => prev.map(user => user.id === editingUser.id ? { ...user, ...savedUser } : user));
            } else {
                const res = await axios.post(`${API_URL}/users`, payload);
                savedUser = res.data.user ?? res.data ?? { ...payload, id: Date.now(), activo: payload.activo, rol: payload.rol, cargo: payload.cargo || null, permisos: JSON.stringify(payload.permisos) };
                setUsers(prev => [savedUser as User, ...prev]);
            }

            const successMessage = editingUser ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.';
            closeDrawer();
            setNotice({ type: 'success', message: successMessage });
        } catch (error: any) {
            setNotice({
                type: 'error',
                message: error.response?.data?.error || 'Error al guardar usuario.'
            });
        } finally {
            setIsSubmitting(false);
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

    useEffect(() => {
        if (!notice) return;

        const timer = window.setTimeout(() => {
            setNotice(null);
        }, 3000);

        return () => window.clearTimeout(timer);
    }, [notice]);

    return (
        <div className="space-y-6">
            {notice && (
                <div className={`fixed right-5 top-5 z-[110] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
                    notice.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                        {notice.message}
                    </div>
                </div>
            )}
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

            <SideDrawer
                open={showModal}
                onClose={closeDrawer}
                title={editingUser ? 'Editar usuario y permisos' : 'Crear nuevo usuario'}
                description={editingUser ? 'Actualiza la información general y la matriz de accesos.' : 'Completa los datos del usuario y configura los permisos del sistema.'}
                size="lg"
            >
                <form onSubmit={handleSaveUser} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Correo / Usuario</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Contraseña</label>
                            <input
                                type="password"
                                placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Contraseña inicial'}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Rol</label>
                            <select
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.rol}
                                onChange={e => setForm({ ...form, rol: e.target.value })}
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Cargo</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.cargo}
                                onChange={e => setForm({ ...form, cargo: e.target.value })}
                                placeholder="Ej: Operador de Torno"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">Estado</label>
                            <select
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={form.activo ? 'true' : 'false'}
                                onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                            <Shield className="h-5 w-5 text-brand-600" /> Matriz de Permisos por Módulo
                        </h3>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                                        <th className="py-2">Módulo</th>
                                        <th className="py-2 text-center">Ver</th>
                                        <th className="py-2 text-center">Crear</th>
                                        <th className="py-2 text-center">Editar</th>
                                        <th className="py-2 text-center">Eliminar</th>
                                        <th className="py-2 text-center">Exportar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm font-bold text-slate-700">
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
                                                            {isChecked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-300" />}
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

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeDrawer}
                            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-75"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    GUARDANDO...
                                </>
                            ) : (
                                'GUARDAR CONFIGURACIÓN'
                            )}
                        </button>
                    </div>
                </form>
            </SideDrawer>
        </div>
    );
};
