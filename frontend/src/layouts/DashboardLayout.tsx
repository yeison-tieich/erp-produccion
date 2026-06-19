
import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Users, LogOut, Menu, X, Factory, Settings, Wrench, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useConfigStore } from '../store/config.store';
import { SyncIndicator } from '../components/SyncIndicator';

export const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const { fetchUserSettings, fetchGlobalSettings } = useConfigStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isWarehouseOpen, setIsWarehouseOpen] = React.useState(false);

    // Initialize configuration
    React.useEffect(() => {
        fetchUserSettings();
        fetchGlobalSettings();
    }, []);

    // Ensure sidebar/overlay is closed on mount and when route changes
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, []);

    // Close sidebar when navigating to another route
    React.useEffect(() => {
        setIsSidebarOpen(false);
        // Automatically open warehouse if current path is a sub-item
        const warehousePaths = ['/inventory', '/products', '/tools', '/loans', '/pedidos'];
        if (warehousePaths.includes(location.pathname)) {
            setIsWarehouseOpen(true);
        }
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
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Contabilidad', 'Compras'] },
        { 
            label: 'ALMACÉN', 
            icon: Package, 
            isGroup: true,
            roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras', 'Diseño', 'Recursos Humanos'],
            subItems: [
                { icon: Package, label: 'Inventario MP', path: '/inventory', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
                { icon: Factory, label: 'Catálogo Productos', path: '/products', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Diseño', 'Contabilidad', 'Compras'] },
                { icon: Wrench, label: 'Inventario Herramientas', path: '/tools', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
                { icon: ClipboardList, label: 'Préstamo Herramientas', path: '/loans', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Recursos Humanos', 'Compras'] },
                { icon: Truck, label: 'PEDIDOS', path: '/pedidos', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
            ]
        },
        { icon: ClipboardList, label: 'Órdenes Trabajo', path: '/orders', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Compras'] },
        { icon: Users, label: 'Clientes', path: '/clients', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Contabilidad', 'Compras', 'Ventas'] },
        { icon: Users, label: 'Control Personal', path: '/personal', roles: ['Administrador'] },
        { icon: Settings, label: 'Mantenimiento', path: '/maintenance', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Contabilidad', 'Compras'] },
        { icon: Factory, label: 'Proyectos Especiales', path: '/special-projects', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Diseño', 'Contabilidad', 'Compras'] },
        { icon: Settings, label: 'Configuraciones', path: '/settings', roles: ['Administrador'] },

        { icon: Factory, label: 'Mis Tareas', path: '/tasks', roles: ['Administrador', 'Supervisor', 'Operario', 'Gerencia', 'Producción', 'Contabilidad', 'Compras', 'Diseño', 'Recursos Humanos', 'Almacén'] },
        { icon: Users, label: 'Usuarios', path: '/users', roles: ['Administrador', 'Gerencia', 'Compras'] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user.rol));

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-brand-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between h-16 px-6 bg-slate-900/40 backdrop-blur-sm border-b border-white/5">
                    <img src="/logo.png" alt="Control MT Logo" className="h-12 w-auto" />
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-6 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                        <p className="text-sm text-slate-400">Bienvenido,</p>
                        <p className="font-semibold truncate">{user.nombre}</p>
                        <p className="text-xs text-slate-500 uppercase mt-1">{user.rol}</p>
                    </div>

                    <nav className="space-y-1">
                        {filteredItems.map((item) => {
                            if (item.isGroup) {
                                const isWarehouse = item.label === 'ALMACÉN';
                                const subItems = item.subItems?.filter(si => si.roles.includes(user.rol)) || [];
                                if (subItems.length === 0) return null;

                                return (
                                    <div key={item.label} className="space-y-1">
                                        <button
                                            onClick={() => setIsWarehouseOpen(!isWarehouseOpen)}
                                            className={clsx(
                                                "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <item.icon className="w-5 h-5 mr-3" />
                                                {item.label}
                                            </div>
                                            {isWarehouseOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        
                                        {isWarehouseOpen && (
                                            <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-800 ml-6">
                                                {subItems.map((sub) => {
                                                    const isSubActive = location.pathname === sub.path;
                                                    return (
                                                        <Link
                                                            key={sub.path}
                                                            to={sub.path}
                                                            onClick={() => setIsSidebarOpen(false)}
                                                            className={clsx(
                                                                "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                                                isSubActive
                                                                    ? "bg-brand-600/30 text-white border border-brand-500/50 shadow-lg shadow-brand-900/20"
                                                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            <sub.icon className="w-4 h-4 mr-3" />
                                                            {sub.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={clsx(
                                        "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                        isActive
                                        ? "bg-brand-600 text-white shadow-lg shadow-brand-900/40"
                                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950/20 backdrop-blur-md border-t border-white/5">
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
                {/* Mobile Header */}
                <header className="bg-white dark:bg-slate-900 shadow-sm lg:hidden h-16 flex items-center justify-between px-4">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400">
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="ml-4 font-semibold text-gray-800 dark:text-white">Control MT</span>
                    </div>
                    <SyncIndicator />
                </header>

                {/* Desktop Top Bar */}
                <header className="hidden lg:flex bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 h-16 items-center justify-end px-8 gap-4">
                    <SyncIndicator />
                    <div className="h-8 w-px bg-gray-100 dark:bg-slate-800 mx-2" />
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.nombre}</p>
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">{user.rol}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
                            {user.nombre.charAt(0)}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
