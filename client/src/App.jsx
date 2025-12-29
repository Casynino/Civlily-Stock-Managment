import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth.jsx';
import { StoreProvider } from './data/StoreContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import AppShell from './layouts/AppShell.jsx';
import BranchesPage from './pages/Branches.jsx';
import CustomersPage from './pages/Customers.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import ExpensesPage from './pages/Expenses.jsx';
import InventoryPage from './pages/Inventory.jsx';
import LoginPage from './pages/Login.jsx';
import ReportsPage from './pages/Reports.jsx';
import SalesPage from './pages/Sales.jsx';
import SettingsPage from './pages/Settings.jsx';
import StaffPage from './pages/Staff.jsx';
import TransfersPage from './pages/Transfers.jsx';
import WelcomePage from './pages/Welcome.jsx';

function titleKeyForPath(pathname) {
    if (pathname === '/') return 'title.dashboard';
    if (pathname.startsWith('/welcome')) return 'title.welcome';
    if (pathname.startsWith('/login')) return 'title.login';
    if (pathname.startsWith('/inventory')) return 'title.inventory';
    if (pathname.startsWith('/sales')) return 'title.sales';
    if (pathname.startsWith('/customers')) return 'title.customers';
    if (pathname.startsWith('/expenses')) return 'title.expenses';
    if (pathname.startsWith('/reports')) return 'title.reports';
    if (pathname.startsWith('/staff')) return 'title.staff';
    if (pathname.startsWith('/branches')) return 'title.branches';
    if (pathname.startsWith('/transfers')) return 'title.transfers';
    if (pathname.startsWith('/settings')) return 'title.settings';
    return 'title.dashboard';
}

function ProtectedApp() {
    const { isAuthed, staff, authLoading, authError } = useAuth();
    const loc = useLocation();

    const role = String(staff?.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN';

    function canAccessPath(path) {
        const p = String(path || '');
        if (role === 'ADMIN') return true;
        if (role === 'MANAGER') return p !== '/staff' && p !== '/branches';
        if (role === 'CASHIER' || role === 'STOREKEEPER') return p === '/' || p === '/sales' || p === '/expenses';
        return p === '/' || p === '/sales' || p === '/expenses';
    }

    function guard(path, el) {
        return canAccessPath(path) ? el : <Navigate to="/" replace />;
    }

    if (authLoading) {
        return (
            <div style={{ padding: 24, fontWeight: 800 }}>
                Loading…
            </div>
        );
    }

    if (!isAuthed) {
        return authError ? (
            <div style={{ padding: 24 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Connection issue</div>
                <div>{authError}</div>
            </div>
        ) : (
            <Navigate to="/welcome" replace />
        );
    }

    return (
        <AppShell titleKey={titleKeyForPath(loc.pathname)}>
            <Routes>
                <Route path="/" element={guard('/', <DashboardPage />)} />
                <Route path="/inventory" element={guard('/inventory', <InventoryPage />)} />
                <Route path="/sales" element={guard('/sales', <SalesPage />)} />
                <Route path="/customers" element={guard('/customers', <CustomersPage />)} />
                <Route path="/expenses" element={guard('/expenses', <ExpensesPage />)} />
                <Route path="/reports" element={guard('/reports', <ReportsPage />)} />
                <Route path="/staff" element={guard('/staff', <StaffPage />)} />
                <Route path="/branches" element={guard('/branches', <BranchesPage />)} />
                <Route path="/transfers" element={guard('/transfers', <TransfersPage />)} />
                <Route path="/settings" element={guard('/settings', <SettingsPage />)} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppShell>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <I18nProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/welcome" element={<WelcomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/*" element={<ProtectedApp />} />
                    </Routes>
                </AuthProvider>
            </I18nProvider>
        </StoreProvider>
    );
}
