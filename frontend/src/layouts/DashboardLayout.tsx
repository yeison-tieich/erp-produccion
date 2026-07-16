
import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Users, LogOut, Menu, X, Factory, Settings, Wrench, ChevronDown, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useConfigStore } from '../store/config.store';
import { SyncIndicator } from '../components/SyncIndicator';

export const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const { fetchUserSettings, fetchGlobalSettings } = useConfigStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Initialize configuration
    React.useEffect(() => {
        fetchUserSettings();
        fetchGlobalSettings();
    }, []);

    // Close mobile menu on route change
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
        setOpenDropdown(null);
    }, [location.pathname]);

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
                setOpenDropdown(null);
            }
        };
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
            label: 'Almacén', 
            icon: Package, 
            isGroup: true,
            roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras', 'Diseño', 'Recursos Humanos'],
            subItems: [
                { icon: Package, label: 'Inventario MP', path: '/inventory', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
                { icon: Factory, label: 'Catálogo Productos', path: '/products', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Diseño', 'Contabilidad', 'Compras'] },
                { icon: Wrench, label: 'Herramientas', path: '/tools', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
                { icon: ClipboardList, label: 'Préstamos', path: '/loans', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Recursos Humanos', 'Compras'] },
                { icon: Truck, label: 'Pedidos', path: '/pedidos', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Almacén', 'Contabilidad', 'Compras'] },
            ]
        },
        { icon: ClipboardList, label: 'Órdenes', path: '/orders', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Compras'] },
        { icon: Users, label: 'Clientes', path: '/clients', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Contabilidad', 'Compras', 'Ventas'] },
        { icon: Users, label: 'Personal', path: '/personal', roles: ['Administrador'] },
        { icon: Settings, label: 'Mantenimiento', path: '/maintenance', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Contabilidad', 'Compras'] },
        { icon: Factory, label: 'Proyectos', path: '/special-projects', roles: ['Administrador', 'Supervisor', 'Gerencia', 'Producción', 'Diseño', 'Contabilidad', 'Compras'] },
        { icon: Settings, label: 'Config', path: '/settings', roles: ['Administrador'] },
        { icon: Factory, label: 'Tareas', path: '/tasks', roles: ['Administrador', 'Supervisor', 'Operario', 'Gerencia', 'Producción', 'Contabilidad', 'Compras', 'Diseño', 'Recursos Humanos', 'Almacén'] },
        { icon: Users, label: 'Usuarios', path: '/users', roles: ['Administrador', 'Gerencia', 'Compras'] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user.rol));

    // Check if a group has an active sub-item
    const isGroupActive = (item: typeof menuItems[0]) => {
        if (!item.isGroup || !item.subItems) return false;
        return item.subItems.some(sub => location.pathname === sub.path);
    };

    const activeGroupLabel = filteredItems.find(item => item.isGroup && isGroupActive(item))?.label;

    return (
        <div className="flex flex-col h-screen bg-transparent overflow-hidden relative z-10">
            
            {/* ===== TOP NAV BAR ===== */}
            <header className="flex-shrink-0 w-full px-4 lg:px-6 pt-4 pb-2">
                <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2">
                    
                    {/* Logo / Brand */}
                    <Link to="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-brand-400 flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-brand-950" />
                        </div>
                        <span className="font-bold text-slate-800 text-sm hidden sm:block">Control MT</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center justify-center gap-1 flex-1 flex-wrap" ref={dropdownRef}>
                        {filteredItems.map((item) => {
                            if (item.isGroup) {
                                const subItems = item.subItems?.filter(si => si.roles.includes(user.rol)) || [];
                                if (subItems.length === 0) return null;
                                const groupActive = isGroupActive(item);
                                const isOpen = openDropdown === item.label;

                                return (
                                    <div key={item.label} className="relative">
                                        <button
                                            onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                                            className={clsx(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group",
                                                groupActive
                                                    ? "bg-white shadow-sm text-brand-700 border border-black/5"
                                                    : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                                            )}
                                        >
                                            <item.icon className="w-4 h-4 flex-shrink-0" />
                                            {groupActive && <span className="whitespace-nowrap">{item.label}</span>}
                                            <ChevronDown className={clsx("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                                            
                                            {/* Tooltip for icon-only */}
                                            {!groupActive && (
                                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                                    {item.label}
                                                </span>
                                            )}
                                        </button>

                                        {/* Dropdown */}
                                        {isOpen && (
                                            <div className="absolute top-full left-0 mt-2 py-2 glass-panel rounded-xl min-w-[200px] z-50 shadow-xl animate-in fade-in slide-in-from-top-2">
                                                {subItems.map((sub) => {
                                                    const isSubActive = location.pathname === sub.path;
                                                    return (
                                                        <Link
                                                            key={sub.path}
                                                            to={sub.path}
                                                            className={clsx(
                                                                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all mx-1 rounded-lg",
                                                                isSubActive
                                                                    ? "bg-brand-50 text-brand-700"
                                                                    : "text-slate-600 hover:bg-white/60 hover:text-slate-800"
                                                            )}
                                                        >
                                                            <sub.icon className="w-4 h-4" />
                                                            {sub.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Regular menu item
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group flex-shrink-0",
                                        isActive
                                            ? "bg-white shadow-sm text-brand-700 border border-black/5"
                                            : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                                    )}
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    {isActive && <span className="whitespace-nowrap">{item.label}</span>}

                                    {/* Tooltip for icon-only */}
                                    {!isActive && (
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right section: Sync + User + Logout */}
                    <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                        <SyncIndicator />
                        <div className="h-6 w-px bg-black/10" />
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-800 leading-none">{user.nombre}</p>
                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mt-0.5">{user.rol}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-black/5 text-brand-600 flex items-center justify-center font-black text-sm">
                                {user.nombre.charAt(0)}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors relative group"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                Cerrar Sesión
                            </span>
                        </button>
                    </div>

                    {/* Mobile: Hamburger */}
                    <div className="flex lg:hidden items-center gap-2">
                        <SyncIndicator />
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-700">
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden glass-panel rounded-2xl mt-2 p-3 shadow-xl max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {/* User info */}
                        <div className="flex items-center gap-3 px-3 py-3 border-b border-black/5 mb-2">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-black/5 text-brand-600 flex items-center justify-center font-black">
                                {user.nombre.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{user.nombre}</p>
                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{user.rol}</p>
                            </div>
                        </div>

                        <nav className="space-y-1">
                            {filteredItems.map((item) => {
                                if (item.isGroup) {
                                    const subItems = item.subItems?.filter(si => si.roles.includes(user.rol)) || [];
                                    if (subItems.length === 0) return null;
                                    const groupActive = isGroupActive(item);
                                    const isOpen = openDropdown === item.label;

                                    return (
                                        <div key={item.label}>
                                            <button
                                                onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                                                className={clsx(
                                                    "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                                                    groupActive ? "bg-white/80 text-brand-700" : "text-slate-600 hover:bg-white/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="w-5 h-5" />
                                                    {item.label}
                                                </div>
                                                <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                                            </button>
                                            {isOpen && (
                                                <div className="pl-6 mt-1 space-y-0.5 border-l-2 border-brand-200 ml-5">
                                                    {subItems.map((sub) => {
                                                        const isSubActive = location.pathname === sub.path;
                                                        return (
                                                            <Link
                                                                key={sub.path}
                                                                to={sub.path}
                                                                className={clsx(
                                                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                                                                    isSubActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-white/50"
                                                                )}
                                                            >
                                                                <sub.icon className="w-4 h-4" />
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
                                        className={clsx(
                                            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                                            isActive ? "bg-white shadow-sm text-brand-700 border border-black/5" : "text-slate-600 hover:bg-white/50"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Logout */}
                        <div className="border-t border-black/5 mt-2 pt-2">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 overflow-y-auto px-4 lg:px-6 pb-6">
                <Outlet />
            </main>
        </div>
    );
};
