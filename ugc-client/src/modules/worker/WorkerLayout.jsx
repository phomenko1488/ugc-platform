import React, { useState } from 'react';
import WorkerHeader from './components/WorkerHeader';
import WorkerBottomNav, { WORKER_TABS } from './components/WorkerBottomNav';
import WorkerOffersPage from './pages/WorkerOffersPage';
import WorkerOfferDetailPage from './pages/WorkerOfferDetailPage';
import WorkerSubmissionsPage from './pages/WorkerSubmissionsPage';
import WorkerWalletPage from './pages/WorkerWalletPage';
import WorkerReferralsPage from './pages/WorkerReferralsPage';

/**
 * Isolated Worker (Нарезчик) module shell — mounted by App.jsx whenever the active role is
 * ROLE_WORKER. Owns page switching (no react-router in this project; state-based tabs match
 * the rest of the app's existing pattern) and renders the shared header + responsive nav
 * (top tabs on desktop, fixed bottom bar on mobile / Telegram Mini App).
 *
 * The Offer Details Hub (`selectedOfferId`) is layered on top of this same switching scheme
 * rather than being a fifth tab: opening an offer card replaces the main content with
 * WorkerOfferDetailPage while keeping the header/nav mounted, and "Назад к офферам" just clears
 * the id to fall back to whichever tab was active underneath (always 'offers', since that's the
 * only page that can open one).
 */
export default function WorkerLayout({ worker, offers, onRefresh, onLogout }) {
    const [activePage, setActivePage] = useState('offers');
    const [selectedOfferId, setSelectedOfferId] = useState(null);

    const handleChangePage = (page) => {
        setSelectedOfferId(null);
        setActivePage(page);
    };

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex flex-col pb-20 sm:pb-0">
            <WorkerHeader worker={worker} onRefresh={onRefresh} onLogout={onLogout} />

            {/* Desktop top tabs — mobile uses WorkerBottomNav instead. */}
            <div className="hidden sm:block border-b border-brand-border bg-brand-card/60">
                <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2">
                    {WORKER_TABS.map(({ key, label, icon: Icon }) => {
                        const isActive = activePage === key && !selectedOfferId;
                        return (
                            <button
                                key={key}
                                onClick={() => handleChangePage(key)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
                {selectedOfferId ? (
                    <WorkerOfferDetailPage
                        worker={worker}
                        offerId={selectedOfferId}
                        onBack={() => setSelectedOfferId(null)}
                    />
                ) : (
                    <>
                        {activePage === 'offers' && (
                            <WorkerOffersPage worker={worker} offers={offers} onRefresh={onRefresh} onOpenOffer={setSelectedOfferId} />
                        )}
                        {activePage === 'submissions' && (
                            <WorkerSubmissionsPage worker={worker} />
                        )}
                        {activePage === 'wallet' && (
                            <WorkerWalletPage worker={worker} onRefresh={onRefresh} />
                        )}
                        {activePage === 'referrals' && (
                            <WorkerReferralsPage worker={worker} />
                        )}
                    </>
                )}
            </main>

            <WorkerBottomNav activePage={activePage} onChangePage={handleChangePage} />
        </div>
    );
}
