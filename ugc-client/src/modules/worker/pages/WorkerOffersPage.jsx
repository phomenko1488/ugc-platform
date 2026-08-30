import React, { useCallback, useEffect, useState } from 'react';
import { Search, Flame, Inbox, Loader2 } from 'lucide-react';
import { api } from '../../../api';
import OfferCard from '../components/OfferCard';
import SubmissionModal from '../components/SubmissionModal';
import Pagination from '../../../components/Pagination';

const PLATFORM_FILTERS = [
    { key: 'ALL', label: 'Все' },
    { key: 'TIKTOK', label: 'TikTok' },
    { key: 'YOUTUBE_SHORTS', label: 'Shorts' },
    { key: 'INSTAGRAM_REELS', label: 'Reels' },
];

const SUB_TABS = [
    { key: 'MY_OFFERS', label: 'В работе' },
    { key: 'ALL_OFFERS', label: 'Каталог' },
];

const DEFAULT_PAGE_SIZE = 10;

// Debounces the catalog's search box the same way AdminUsersPage does — waits for the user to
// stop typing before hitting the server, instead of re-fetching on every keystroke.
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Worker's offer Workbench — "Взять оффер в работу". Self-fetches both lists (rather than relying
 * on App.jsx's shared `offers` state, which has no per-worker isTaken/stats annotation and is
 * also used by Advertiser/Moderator cabinets) so taking/leaving an offer can refresh just this
 * page instantly instead of round-tripping through the whole app's loadData().
 * <p>
 * Pagination initiative: both sub-tabs are now server-paginated with their own independent
 * {page, pageSize} state, and the catalog's search/platform filters are resolved server-side
 * (WorkerOfferController's /catalog) rather than client-side over a fully-fetched array.
 */
export default function WorkerOffersPage({ worker, onRefresh, onOpenOffer }) {
    const [subTab, setSubTab] = useState('MY_OFFERS');

    const [myOffers, setMyOffers] = useState([]);
    const [myPage, setMyPage] = useState({ pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0 });

    const [catalogOffers, setCatalogOffers] = useState([]);
    const [catalogPage, setCatalogPage] = useState({ pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0 });

    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState(null);
    const [pendingOfferId, setPendingOfferId] = useState(null);
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('ALL');
    const [submittingOffer, setSubmittingOffer] = useState(null);

    const loadMyOffers = useCallback(async (page = myPage.pageNumber, size = myPage.pageSize) => {
        if (!worker?.id) return;
        const result = await api.getMyOffers(worker.id, page, size);
        setMyOffers(result?.content || []);
        setMyPage({
            pageNumber: result?.pageNumber ?? 0,
            pageSize: result?.pageSize ?? size,
            totalElements: result?.totalElements ?? 0,
            totalPages: result?.totalPages ?? 0,
        });
    }, [worker?.id, myPage.pageNumber, myPage.pageSize]);

    const loadCatalog = useCallback(async (page = catalogPage.pageNumber, size = catalogPage.pageSize) => {
        if (!worker?.id) return;
        const result = await api.getActiveOffers(worker.id, search, platformFilter, page, size);
        setCatalogOffers(result?.content || []);
        setCatalogPage({
            pageNumber: result?.pageNumber ?? 0,
            pageSize: result?.pageSize ?? size,
            totalElements: result?.totalElements ?? 0,
            totalPages: result?.totalPages ?? 0,
        });
    }, [worker?.id, catalogPage.pageNumber, catalogPage.pageSize, search, platformFilter]);

    const loadBoth = useCallback(async () => {
        if (!worker?.id) return;
        try {
            setActionError(null);
            await Promise.all([loadMyOffers(0, myPage.pageSize), loadCatalog(0, catalogPage.pageSize)]);
        } catch (err) {
            console.error('Не удалось загрузить офферы воркера:', err);
            setActionError(err.message || 'Не удалось загрузить офферы');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worker?.id]);

    // Initial load — both tabs, page 0.
    useEffect(() => {
        setLoading(true);
        loadBoth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worker?.id]);

    // Re-fetch the catalog (reset to page 0) whenever search/platform filters change, debounced.
    useEffect(() => {
        if (!worker?.id) return;
        const timeout = setTimeout(() => {
            loadCatalog(0, catalogPage.pageSize).catch((err) => {
                console.error('Не удалось загрузить каталог офферов:', err);
                setActionError(err.message || 'Не удалось загрузить каталог');
            });
        }, search ? SEARCH_DEBOUNCE_MS : 0);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, platformFilter]);

    const handleMyPageChange = (nextPage) => {
        loadMyOffers(nextPage, myPage.pageSize).catch((err) => setActionError(err.message));
    };
    const handleMyPageSizeChange = (nextSize) => {
        loadMyOffers(0, nextSize).catch((err) => setActionError(err.message));
    };
    const handleCatalogPageChange = (nextPage) => {
        loadCatalog(nextPage, catalogPage.pageSize).catch((err) => setActionError(err.message));
    };
    const handleCatalogPageSizeChange = (nextSize) => {
        loadCatalog(0, nextSize).catch((err) => setActionError(err.message));
    };

    const handleTake = async (offer) => {
        setPendingOfferId(offer.id);
        setActionError(null);
        try {
            await api.takeOffer(offer.id, worker.id);
            await Promise.all([loadMyOffers(0, myPage.pageSize), loadCatalog(catalogPage.pageNumber, catalogPage.pageSize)]);
            setSubTab('MY_OFFERS');
        } catch (err) {
            console.error('Не удалось взять оффер в работу:', err);
            setActionError(err.message || 'Не удалось взять оффер в работу');
        } finally {
            setPendingOfferId(null);
        }
    };

    const handleLeave = async (offer) => {
        setPendingOfferId(offer.id);
        setActionError(null);
        try {
            await api.leaveOffer(offer.id, worker.id);
            await Promise.all([loadMyOffers(myPage.pageNumber, myPage.pageSize), loadCatalog(catalogPage.pageNumber, catalogPage.pageSize)]);
        } catch (err) {
            console.error('Не удалось отказаться от оффера:', err);
            setActionError(err.message || 'Не удалось отказаться от оффера');
        } finally {
            setPendingOfferId(null);
        }
    };

    const activeList = subTab === 'MY_OFFERS' ? myOffers : catalogOffers;
    const activePage = subTab === 'MY_OFFERS' ? myPage : catalogPage;
    const handleActivePageChange = subTab === 'MY_OFFERS' ? handleMyPageChange : handleCatalogPageChange;
    const handleActivePageSizeChange = subTab === 'MY_OFFERS' ? handleMyPageSizeChange : handleCatalogPageSizeChange;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Мои офферы</h2>
            </div>

            <div className="flex gap-1.5">
                {SUB_TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setSubTab(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                            subTab === key
                                ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                        }`}
                    >
                        {label}
                        {key === 'MY_OFFERS' && myPage.totalElements > 0 && (
                            <span className={`text-[10px] font-mono min-w-[18px] px-1 rounded-full ${
                                subTab === key ? 'bg-brand-bg/25 text-brand-bg' : 'bg-brand-border text-slate-300'
                            }`}>
                                {myPage.totalElements}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {subTab === 'ALL_OFFERS' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по названию оффера..."
                            className="w-full bg-brand-card border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent placeholder:text-slate-600"
                        />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                        {PLATFORM_FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setPlatformFilter(key)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                    platformFilter === key
                                        ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                        : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {actionError && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">
                    {actionError}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-12">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка офферов...
                </div>
            ) : activeList.length === 0 ? (
                subTab === 'MY_OFFERS' ? (
                    <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center space-y-3">
                        <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-slate-400 text-xs leading-relaxed">
                            У вас пока нет офферов в работе.<br />
                            Перейдите в каталог, чтобы выбрать проект.
                        </p>
                        <button
                            onClick={() => setSubTab('ALL_OFFERS')}
                            className="bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs px-4 py-2 rounded-xl transition-all"
                        >
                            Перейти в каталог
                        </button>
                    </div>
                ) : (
                    <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                        Ничего не найдено по вашим фильтрам.
                    </div>
                )
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {activeList.map((offer) => (
                            <OfferCard
                                key={offer.id}
                                offer={offer}
                                showStats={subTab === 'MY_OFFERS'}
                                isPending={pendingOfferId === offer.id}
                                onTake={handleTake}
                                onLeave={handleLeave}
                                onSubmit={setSubmittingOffer}
                                onOpenDetails={(o) => onOpenOffer?.(o.id)}
                            />
                        ))}
                    </div>
                    <Pagination
                        currentPage={activePage.pageNumber}
                        totalPages={activePage.totalPages}
                        totalElements={activePage.totalElements}
                        pageSize={activePage.pageSize}
                        onPageChange={handleActivePageChange}
                        onPageSizeChange={handleActivePageSizeChange}
                    />
                </>
            )}

            {submittingOffer && (
                <SubmissionModal
                    worker={worker}
                    offer={submittingOffer}
                    onClose={() => setSubmittingOffer(null)}
                    onSubmitted={() => {
                        setSubmittingOffer(null);
                        loadBoth();
                        onRefresh?.();
                    }}
                />
            )}
        </div>
    );
}
