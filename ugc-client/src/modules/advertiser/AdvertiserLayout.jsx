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
 * shared Header/main shell used by Moderator. Owns the campaign-detail drill-down and the offer
 * creation wizard, both layered on top of the tab switch rather than being separate tabs.
 *
 * Tab switching is route-driven when App.jsx passes `activeTabOverride`/`onNavigateTab` (each tab
 * then has a real URL — /dashboard, /campaigns, etc. — so it's bookmarkable and protected by the
 * app's auth route); those two props are optional and fall back to plain internal state, so this
 * component still works exactly as before if mounted without a router around it.
 *
 * The dashboard summary (balances, KPIs) is fetched once here and shared with both AdvertiserHeader
 * (Available/В офферах balances) and AdvertiserDashboardPage, instead of each fetching it separately.
 */
export default function AdvertiserLayout({ advertiser, onRefresh, onLogout, activeTabOverride, onNavigateTab }) {
    const [internalActivePage, setInternalActivePage] = useState('dashboard');
    const isRouted = activeTabOverride != null && onNavigateTab != null;
    const activePage = isRouted ? activeTabOverride : internalActivePage;
    const goToTab = (page) => (isRouted ? onNavigateTab(page) : setInternalActivePage(page));

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
        goToTab(page);
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

                <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
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
                        goToTab('campaigns');
                    }}
                />
            )}
        </div>
    );
}
