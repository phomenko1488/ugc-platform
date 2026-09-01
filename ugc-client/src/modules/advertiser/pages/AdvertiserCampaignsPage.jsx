import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, PlayCircle, PauseCircle, PlusCircle, DollarSign, ChevronRight } from 'lucide-react';
import { api } from '../../../api';
import TopUpModal from '../components/TopUpModal';
import Pagination from '../../../components/Pagination';

const DEFAULT_PAGE_SIZE = 10;

/**
 * "Потоки" — every offer/campaign the advertiser has launched, as a dense table (title, rate,
 * payout, threshold, budget-with-progress, status) rather than a stack of padded cards — the
 * brief specifically asks for high data density here, and a card grid tops out around 4-5 rows
 * before it becomes more scrolling than information. Quick pause/resume, a top-up shortcut, and
 * a drill-down into AdvertiserCampaignDetailPage (via onOpenOffer) all keep their original
 * behavior; only the layout changed.
 * Pagination initiative: server-paginated via api.getAdvertiserOffers(advertiserId, page, size).
 */
export default function AdvertiserCampaignsPage({ advertiser, refreshKey, onOpenOffer, onOpenWizard, onBalanceChanged }) {
    const [offers, setOffers] = useState(null); // null = loading
    const [page, setPage] = useState({ pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0 });
    const [error, setError] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [topUpOffer, setTopUpOffer] = useState(null);

    // No default params referencing `page` here: load is memoized via useCallback with a fixed
    // dependency list, so a closure-captured default would go stale after setPage — every call
    // site below passes pageNumber/pageSize explicitly instead, read live from state.
    const load = useCallback((pageNumber, pageSize) => {
        if (!advertiser?.id) return;
        api.getAdvertiserOffers(advertiser.id, pageNumber, pageSize)
            .then((result) => {
                setOffers(result?.content || []);
                setPage({
                    pageNumber: result?.pageNumber ?? 0,
                    pageSize: result?.pageSize ?? pageSize,
                    totalElements: result?.totalElements ?? 0,
                    totalPages: result?.totalPages ?? 0,
                });
                setError(null);
            })
            .catch((err) => setError(err.message || 'Не удалось загрузить потоки'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [advertiser?.id]);

    useEffect(() => { load(0, page.pageSize); }, [advertiser?.id, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePageChange = (nextPage) => load(nextPage, page.pageSize);
    const handlePageSizeChange = (nextSize) => load(0, nextSize);

    const handleToggle = async (offer) => {
        setTogglingId(offer.id);
        try {
            await api.setOfferStatus(offer.id, advertiser.id, !offer.isActive);
            load(page.pageNumber, page.pageSize);
        } catch (err) {
            setError(err.message || 'Не удалось изменить статус потока');
        } finally {
            setTogglingId(null);
        }
    };

    if (offers === null && !error) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка потоков...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl uppercase tracking-tight text-ash">Потоки</h1>
                    <p className="mt-1 text-xs text-slate-500">Кампании трафика, их ставки и остаток бюджета.</p>
                </div>
                <button
                    onClick={onOpenWizard}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-3.5 py-2 text-xs font-bold text-brand-bg transition-colors hover:bg-brand-accentHover"
                >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Новый поток
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-brand-danger/20 bg-brand-danger/10 p-3 text-xs text-brand-danger">
                    {error}
                </div>
            )}

            {offers?.length === 0 ? (
                <div className="rounded-xl border border-brand-border bg-brand-card p-10 text-center text-xs text-slate-500">
                    У вас пока нет запущенных потоков.
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-brand-border">
                                        <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Поток</th>
                                        <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ставка / Выплата</th>
                                        <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Бюджет</th>
                                        <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Статус</th>
                                        <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {offers?.map((offer) => {
                                        const spentRatio = offer.totalBudget > 0
                                            ? Math.min(1, 1 - Number(offer.remainingBudget) / Number(offer.totalBudget))
                                            : 0;
                                        return (
                                            <tr key={offer.id} className="transition-colors hover:bg-brand-cardHover/60">
                                                <td className="max-w-[240px] px-4 py-3 align-top">
                                                    <button onClick={() => onOpenOffer(offer.id)} className="group text-left">
                                                        <div className="truncate text-sm font-bold text-slate-100 transition-colors group-hover:text-brand-accent">
                                                            {offer.title}
                                                        </div>
                                                        <div className="mt-1 whitespace-nowrap font-mono text-[10px] text-slate-500">
                                                            Порог: {Number(offer.minViewsThreshold).toLocaleString()} просмотров
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right align-top">
                                                    <div className="whitespace-nowrap font-mono text-xs font-bold text-ash">
                                                        ${Number(offer.advertiserCpmRate).toFixed(2)}
                                                    </div>
                                                    <div className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                                                        выплата ${Number(offer.workerCpmRate).toFixed(2)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                                                        <span className="font-bold text-brand-success">${Number(offer.remainingBudget).toFixed(2)}</span>
                                                        <span className="text-slate-600">/ ${Number(offer.totalBudget).toFixed(2)}</span>
                                                    </div>
                                                    <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-brand-border">
                                                        <div
                                                            className="h-full rounded-full bg-brand-accent"
                                                            style={{ width: `${Math.round(spentRatio * 100)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <button
                                                        onClick={() => handleToggle(offer)}
                                                        disabled={togglingId === offer.id}
                                                        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                                                            offer.isActive
                                                                ? 'border-brand-success/20 bg-brand-success/10 text-brand-success hover:bg-brand-success/20'
                                                                : 'border-brand-border bg-brand-bg text-slate-400 hover:bg-brand-cardHover'
                                                        }`}
                                                    >
                                                        {offer.isActive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                                                        {offer.isActive ? 'Активен' : 'Остановлен'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right align-top">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setTopUpOffer(offer)}
                                                            title="Пополнить бюджет"
                                                            className="rounded-lg border border-brand-border p-2 text-slate-400 transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
                                                        >
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenOffer(offer.id)}
                                                            title="Подробнее"
                                                            className="rounded-lg border border-brand-border p-2 text-slate-400 transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
                                                        >
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-brand-border px-2">
                            <Pagination
                                currentPage={page.pageNumber}
                                totalPages={page.totalPages}
                                totalElements={page.totalElements}
                                pageSize={page.pageSize}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>
                    </div>
                </>
            )}

            {topUpOffer && (
                <TopUpModal
                    advertiser={advertiser}
                    offer={topUpOffer}
                    onClose={() => setTopUpOffer(null)}
                    onToppedUp={() => {
                        setTopUpOffer(null);
                        load(page.pageNumber, page.pageSize);
                        onBalanceChanged?.();
                    }}
                />
            )}
        </div>
    );
}
