
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
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
import { useEffect } from 'react';


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
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/personal" element={<PersonalPage />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />
                    <Route path="/special-projects" element={<SpecialProjects />} />
                    <Route path="/special-projects/dashboard" element={<SpecialProjectsDashboard />} />
                    <Route path="/special-projects/kanban" element={<SpecialProjectsKanban />} />
                    <Route path="/special-projects/new" element={<ProjectForm />} />
                    <Route path="/special-projects/:id" element={<SpecialProjectDetails />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/tools" element={<ToolsInventory />} />
                    <Route path="/loans" element={<ToolLoans />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/finances" element={<FinancesPage />} />

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
                    <Route path="/tasks" element={<Tasks />} />


                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
