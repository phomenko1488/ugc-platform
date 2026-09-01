import React, { useCallback, useEffect, useState } from 'react';
import AdvertiserSidebar from './components/AdvertiserSidebar';
import AdvertiserHeader from './components/AdvertiserHeader';
import OfferWizardModal from './components/OfferWizardModal';
import AdvertiserDashboardPage from './pages/AdvertiserDashboardPage';
import AdvertiserAnalyticsPage from './pages/AdvertiserAnalyticsPage';
import AdvertiserCampaignsPage from './pages/AdvertiserCampaignsPage';
import AdvertiserCampaignDetailPage from './pages/AdvertiserCampaignDetailPage';
import AdvertiserTrafficPage from './pages/AdvertiserTrafficPage';
import AdvertiserBillingPage from './pages/AdvertiserBillingPage';
import AdvertiserCreatorsPage from './pages/AdvertiserCreatorsPage';
import AdvertiserApiPage from './pages/AdvertiserApiPage';
import TelegramLinkBanner from '../../components/TelegramLinkBanner';
import { api } from '../../api';

/**
 * Isolated Advertiser Cabinet module shell — mounted by App.jsx whenever the active role is
 * ROLE_ADVERTISER, standalone like WorkerLayout is for ROLE_WORKER rather than nesting inside the
 * shared Header/main shell used by Moderator. Owns page switching (sidebar tabs, no react-router
 * — same state-based pattern as the rest of the app) plus the campaign-detail drill-down and the
 * offer creation wizard, both layered on top of the tab switch rather than being separate tabs.
 *
 * The dashboard summary (balances, KPIs) is fetched once here and shared with both AdvertiserHeader
 * (Available/В офферах balances) and AdvertiserDashboardPage, instead of each fetching it separately.
 */
export default function AdvertiserLayout({ advertiser, onRefresh, onLogout }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [selectedOfferId, setSelectedOfferId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    const loadDashboard = useCallback(async () => {
        if (!advertiser?.id) return;
        try {
            setDashboardError(null);
            const data = await api.getAdvertiserDashboard(advertiser.id);
            setDashboard(data);
        } catch (err) {
            setDashboardError(err.message || 'Не удалось загрузить дашборд');
        } finally {
            setDashboardLoading(false);
        }
    }, [advertiser?.id]);

    useEffect(() => {
        setDashboardLoading(true);
        loadDashboard();
    }, [loadDashboard]);

    const handleChangePage = (page) => {
        setSelectedOfferId(null);
        setActivePage(page);
        setSidebarOpen(false);
    };

    // Bumped after anything that moves money or offer state (create/top-up/stop/deposit) so the
    // currently mounted page refetches its own list, plus a full refresh of the shared dashboard
    // summary and (via onRefresh) the advertiser's own balance held in App.jsx.
    const handleDataChanged = () => {
        setRefreshKey((k) => k + 1);
        loadDashboard();
        onRefresh?.();
    };

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex">
            <AdvertiserSidebar
                activePage={activePage}
                onChangePage={handleChangePage}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 min-w-0 flex flex-col">
                <AdvertiserHeader
                    advertiser={advertiser}
                    dashboard={dashboard}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    onRefresh={handleDataChanged}
                    onLogout={onLogout}
                    onCreateCampaign={() => setWizardOpen(true)}
                />

                <TelegramLinkBanner user={advertiser} />

                <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
                    {selectedOfferId ? (
                        <AdvertiserCampaignDetailPage
                            advertiser={advertiser}
                            offerId={selectedOfferId}
                            onBack={() => setSelectedOfferId(null)}
                            onBalanceChanged={handleDataChanged}
                        />
                    ) : (
                        <>
                            {activePage === 'dashboard' && (
                                <AdvertiserDashboardPage
                                    dashboard={dashboard}
                                    loading={dashboardLoading}
                                    error={dashboardError}
                                />
                            )}
                            {activePage === 'campaigns' && (
                                <AdvertiserCampaignsPage
                                    advertiser={advertiser}
                                    refreshKey={refreshKey}
                                    onOpenOffer={setSelectedOfferId}
                                    onOpenWizard={() => setWizardOpen(true)}
                                    onBalanceChanged={handleDataChanged}
                                />
                            )}
                            {activePage === 'analytics' && (
                                <AdvertiserAnalyticsPage advertiser={advertiser} />
                            )}
                            {activePage === 'traffic' && (
                                <AdvertiserTrafficPage
                                    advertiser={advertiser}
                                    refreshKey={refreshKey}
                                />
                            )}
                            {activePage === 'billing' && (
                                <AdvertiserBillingPage
                                    advertiser={advertiser}
                                    onBalanceChanged={handleDataChanged}
                                />
                            )}
                            {activePage === 'creators' && (
                                <AdvertiserCreatorsPage advertiser={advertiser} />
                            )}
                            {activePage === 'api' && (
                                <AdvertiserApiPage advertiser={advertiser} />
                            )}
                        </>
                    )}
                </main>
            </div>

            {wizardOpen && (
                <OfferWizardModal
                    advertiser={advertiser}
                    onClose={() => setWizardOpen(false)}
                    onCreated={() => {
                        setWizardOpen(false);
                        handleDataChanged();
                        setActivePage('campaigns');
                    }}
                />
            )}
        </div>
    );
}
