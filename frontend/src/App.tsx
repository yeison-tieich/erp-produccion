
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { GlobalMasterDashboard } from './pages/GlobalMasterDashboard';
import { Inventory } from './pages/Inventory';
import { Orders } from './pages/Orders';
import { Tasks } from './pages/Tasks';
import { Products } from './pages/Products';
import { Clients } from './pages/Clients';
import { PersonalPage } from './pages/Personal';
import { MaintenancePage } from './pages/Maintenance';
import SpecialProjects from './pages/SpecialProjects';
import SpecialProjectsDashboard from './pages/special-projects/Dashboard';
import SpecialProjectsKanban from './pages/special-projects/Kanban';
import SpecialProjectDetails from './pages/special-projects/ProjectDetails';
import ProjectForm from './pages/special-projects/ProjectForm';
import { Settings as SettingsPage } from './pages/Settings';
import { ToolsInventory } from './pages/ToolsInventory';
import { ToolLoans } from './pages/ToolLoans';
import { Pedidos } from './pages/Pedidos';
import { UsersPage } from './pages/UsersPage';
import { FinancesPage } from './pages/FinancesPage';
import { QualityDashboard } from './pages/quality/QualityDashboard';
import { InspectionsPage } from './pages/quality/InspectionsPage';
import { NonConformancesPage } from './pages/quality/NonConformancesPage';
import { CorrectiveActionsPage } from './pages/quality/CorrectiveActionsPage';
import { ControlPlansPage } from './pages/quality/ControlPlansPage';
import { TraceabilityPage } from './pages/quality/TraceabilityPage';
import { SuppliersQualityPage } from './pages/quality/SuppliersQualityPage';
import { CustomerClaimsPage } from './pages/quality/CustomerClaimsPage';
import { RisksAndAuditsPage } from './pages/quality/RisksAndAuditsPage';
import { DocumentsSGCPage } from './pages/quality/DocumentsSGCPage';
import { useAuthStore } from './store/auth.store';
import { databaseService } from './services/databaseService';
import { useEffect, type ReactNode } from 'react';
import { getModulePermission } from './utils/permissions';

const ModuleAccess = ({ module, children }: { module: string; children: ReactNode }) => {
    const user = useAuthStore(state => state.user);
    const hasModuleAccess = getModulePermission(user?.permisos, module);
    return user?.rol !== 'Administrador' && hasModuleAccess === false
        ? <Navigate to="/" replace />
        : children;
};


function App() {
    const { user } = useAuthStore();

    useEffect(() => {
        const initLocalDB = async () => {
            try {
                await databaseService.initDB();
                console.log('Local DB initialized');
            } catch (error) {
                console.error('Failed to initialize local DB:', error);
            }
        };

        initLocalDB();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<DashboardLayout />}>
                    {/* Admin & Supervisor Routes */}
                    <Route path="/" element={<GlobalMasterDashboard />} />
                    <Route path="/inventory" element={<ModuleAccess module="Inventario"><Inventory /></ModuleAccess>} />
                    <Route path="/products/dashboard" element={<Products />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/clients" element={<ModuleAccess module="Clientes"><Clients /></ModuleAccess>} />
                    <Route path="/orders/live-plant" element={<ModuleAccess module="Órdenes"><Orders /></ModuleAccess>} />
                    <Route path="/orders" element={<ModuleAccess module="Órdenes"><Orders /></ModuleAccess>} />
                    <Route path="/personal" element={<ModuleAccess module="Personal"><PersonalPage /></ModuleAccess>} />
                    <Route path="/maintenance" element={<ModuleAccess module="Mantenimiento"><MaintenancePage /></ModuleAccess>} />
                    <Route path="/special-projects" element={<ModuleAccess module="Proyectos Especiales"><SpecialProjects /></ModuleAccess>} />
                    <Route path="/special-projects/dashboard" element={<ModuleAccess module="Proyectos Especiales"><SpecialProjectsDashboard /></ModuleAccess>} />
                    <Route path="/special-projects/kanban" element={<ModuleAccess module="Proyectos Especiales"><SpecialProjectsKanban /></ModuleAccess>} />
                    <Route path="/special-projects/new" element={<ModuleAccess module="Proyectos Especiales"><ProjectForm /></ModuleAccess>} />
                    <Route path="/special-projects/:id" element={<ModuleAccess module="Proyectos Especiales"><SpecialProjectDetails /></ModuleAccess>} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/tools" element={<ModuleAccess module="Herramientas"><ToolsInventory /></ModuleAccess>} />
                    <Route path="/loans" element={<ModuleAccess module="Herramientas"><ToolLoans /></ModuleAccess>} />
                    <Route path="/pedidos" element={<ModuleAccess module="Pedidos"><Pedidos /></ModuleAccess>} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/finances" element={<ModuleAccess module="Finanzas"><FinancesPage /></ModuleAccess>} />

                    {/* Quality Module Routes (ISO 9001:2015) */}
                    <Route path="/quality" element={<QualityDashboard />} />
                    <Route path="/quality/inspections" element={<InspectionsPage />} />
                    <Route path="/quality/non-conformances" element={<NonConformancesPage />} />
                    <Route path="/quality/corrective-actions" element={<CorrectiveActionsPage />} />
                    <Route path="/quality/control-plans" element={<ControlPlansPage />} />
                    <Route path="/quality/traceability" element={<TraceabilityPage />} />
                    <Route path="/quality/suppliers" element={<SuppliersQualityPage />} />
                    <Route path="/quality/claims" element={<CustomerClaimsPage />} />
                    <Route path="/quality/risks" element={<RisksAndAuditsPage />} />
                    <Route path="/quality/documents" element={<DocumentsSGCPage />} />

                    {/* Operator Routes */}
                    <Route path="/tasks" element={<ModuleAccess module="Tareas"><Tasks /></ModuleAccess>} />


                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
