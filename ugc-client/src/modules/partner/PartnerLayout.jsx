import React, { useCallback, useEffect, useState } from 'react';
import PartnerSidebar from './components/PartnerSidebar';
import PartnerHeader from './components/PartnerHeader';
import PartnerDashboardPage from './pages/PartnerDashboardPage';
import PartnerAdvertisersPage from './pages/PartnerAdvertisersPage';
import PartnerPromoPage from './pages/PartnerPromoPage';
import PartnerWalletPage from './pages/PartnerWalletPage';
import TelegramLinkBanner from '../../components/TelegramLinkBanner';
import { api } from '../../api';

/**
 * Isolated B2B Partner Cabinet module shell — mounted by App.jsx whenever the active role is
 * ROLE_PARTNER, same standalone pattern as AdvertiserLayout/WorkerLayout (sidebar-tab page
 * switching, no react-router). The dashboard summary is fetched once here and shared with both
 * PartnerHeader (available balance) and PartnerDashboardPage, instead of each fetching it
 * separately — same rationale as AdvertiserLayout.
 */
export default function PartnerLayout({ partner, onRefresh, onLogout }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    const loadDashboard = useCallback(async () => {
        if (!partner?.id) return;
        try {
            setDashboardError(null);
            const data = await api.getPartnerDashboard(partner.id);
            setDashboard(data);
        } catch (err) {
            setDashboardError(err.message || 'Не удалось загрузить дашборд партнера');
        } finally {
            setDashboardLoading(false);
        }
    }, [partner?.id]);

    useEffect(() => {
        setDashboardLoading(true);
        loadDashboard();
    }, [loadDashboard]);

    const handleChangePage = (page) => {
        setActivePage(page);
        setSidebarOpen(false);
    };

    // Bumped after anything that changes the partner's balance (payout request, wallet update) so
    // the shared dashboard summary and (via onRefresh) App.jsx's own copy of the partner stay current.
    const handleDataChanged = () => {
        loadDashboard();
        onRefresh?.();
    };

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex">
            <PartnerSidebar
                activePage={activePage}
                onChangePage={handleChangePage}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 min-w-0 flex flex-col">
                <PartnerHeader
                    partner={partner}
                    dashboard={dashboard}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    onRefresh={handleDataChanged}
                    onLogout={onLogout}
                />

                <TelegramLinkBanner user={partner} />

                <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
                    {activePage === 'dashboard' && (
                        <PartnerDashboardPage
                            dashboard={dashboard}
                            loading={dashboardLoading}
                            error={dashboardError}
                        />
                    )}
                    {activePage === 'advertisers' && (
                        <PartnerAdvertisersPage partner={partner} />
                    )}
                    {activePage === 'promo' && (
                        <PartnerPromoPage partner={partner} dashboard={dashboard} />
                    )}
                    {activePage === 'wallet' && (
                        <PartnerWalletPage partner={partner} onBalanceChanged={handleDataChanged} />
                    )}
                </main>
            </div>
        </div>
    );
}
