
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
import { useAuthStore } from './store/auth.store';

function App() {
    const { user } = useAuthStore();

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}>
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
                    <Route path="/special-projects/:id" element={<SpecialProjectDetails />} />

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
