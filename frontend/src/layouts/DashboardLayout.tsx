
import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Users, LogOut, Menu, X, Factory, Settings } from 'lucide-react';
import clsx from 'clsx';

export const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    // Ensure sidebar/overlay is closed on mount and when route changes
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, []);

    // Close sidebar when navigating to another route
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Close on Escape key
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSidebarOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['Administrador', 'Supervisor'] },
        { icon: Package, label: 'Inventario MP', path: '/inventory', roles: ['Administrador', 'Supervisor'] },
        { icon: Factory, label: 'Catálogo Productos', path: '/products', roles: ['Administrador', 'Supervisor'] },
        { icon: Users, label: 'Directorio Clientes', path: '/clients', roles: ['Administrador', 'Supervisor'] },
        { icon: ClipboardList, label: 'Órdenes Trabajo', path: '/orders', roles: ['Administrador', 'Supervisor'] },
        { icon: Users, label: 'Control Personal', path: '/personal', roles: ['Administrador', 'Supervisor'] },
        { icon: Settings, label: 'Mantenimiento', path: '/maintenance', roles: ['Administrador', 'Supervisor'] },
        { icon: Factory, label: 'Proyectos Especiales', path: '/special-projects', roles: ['Administrador', 'Supervisor'] },
        { icon: Factory, label: 'Mis Tareas', path: '/tasks', roles: ['Operario'] },
        { icon: Users, label: 'Usuarios', path: '/users', roles: ['Administrador'] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user.rol));

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
                    <img src="/logo.png" alt="Control MT Logo" className="h-12 w-auto" />
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-6 px-4 py-3 bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-400">Bienvenido,</p>
                        <p className="font-semibold truncate">{user.nombre}</p>
                        <p className="text-xs text-slate-500 uppercase mt-1">{user.rol}</p>
                    </div>

                    <nav className="space-y-1">
                        {filteredItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={clsx(
                                        "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                        isActive
                                            ? "bg-brand-600 text-white"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white shadow-sm lg:hidden h-16 flex items-center px-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-semibold text-gray-800">Control MT</span>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
