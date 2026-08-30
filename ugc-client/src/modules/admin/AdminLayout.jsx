import React, { useCallback, useEffect, useState } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminPayoutsPage from './pages/AdminPayoutsPage';
import AdminOffersPage from './pages/AdminOffersPage';
import AdminReferencePage from './pages/AdminReferencePage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import { api } from '../../api';

/**
 * Isolated Admin Back-Office module shell — mounted by App.jsx whenever the active role is
 * ROLE_ADMIN, same standalone sidebar+header+page-switch pattern as every other cabinet in this
 * codebase. The platform-wide dashboard summary is fetched once here and shared with AdminHeader
 * (liquidity readout) and AdminDashboardPage, same rationale as every other *Layout.
 */
export default function AdminLayout({ admin, onRefresh, onLogout }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    const loadDashboard = useCallback(async () => {
        try {
            setDashboardError(null);
            const data = await api.getAdminDashboard();
            setDashboard(data);
        } catch (err) {
            setDashboardError(err.message || 'Не удалось загрузить дашборд администратора');
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    useEffect(() => {
        setDashboardLoading(true);
        loadDashboard();
    }, [loadDashboard]);

    const handleChangePage = (page) => {
        setActivePage(page);
        setSidebarOpen(false);
    };

    // Bumped after anything that moves money or state platform-wide (ban, balance adjust, payout
    // action, offer pause, reference-data change, margin update) so the header's liquidity
    // readout and the dashboard KPIs stay current.
    const handleDataChanged = () => {
        loadDashboard();
        onRefresh?.();
    };

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex">
            <AdminSidebar
                activePage={activePage}
                onChangePage={handleChangePage}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 min-w-0 flex flex-col">
                <AdminHeader
                    admin={admin}
                    dashboard={dashboard}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    onRefresh={handleDataChanged}
                    onLogout={onLogout}
                />

                <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
                    {activePage === 'dashboard' && (
                        <AdminDashboardPage dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />
                    )}
                    {activePage === 'users' && <AdminUsersPage onDataChanged={handleDataChanged} />}
                    {activePage === 'payouts' && <AdminPayoutsPage onDataChanged={handleDataChanged} />}
                    {activePage === 'offers' && <AdminOffersPage onDataChanged={handleDataChanged} />}
                    {activePage === 'reference' && <AdminReferencePage />}
                    {activePage === 'settings' && <AdminSettingsPage onDataChanged={handleDataChanged} />}
                </main>
            </div>
        </div>
    );
}
