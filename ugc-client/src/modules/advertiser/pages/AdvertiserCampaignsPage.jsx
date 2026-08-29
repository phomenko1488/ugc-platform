import React, { useEffect, useState } from 'react';
import { Loader2, PlayCircle, PauseCircle, PlusCircle, DollarSign, ChevronRight } from 'lucide-react';
import { api } from '../../../api';
import TopUpModal from '../components/TopUpModal';

/**
 * Campaigns table — every offer the advertiser has launched, with quick pause/resume, a top-up
 * shortcut, and a "Подробнее" drill-down into AdvertiserCampaignDetailPage (via onOpenOffer).
 */
export default function AdvertiserCampaignsPage({ advertiser, refreshKey, onOpenOffer, onOpenWizard, onBalanceChanged }) {
    const [offers, setOffers] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [topUpOffer, setTopUpOffer] = useState(null);

    const load = () => {
        if (!advertiser?.id) return;
        api.getAdvertiserOffers(advertiser.id)
            .then((data) => { setOffers(data || []); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить кампании'));
    };

    useEffect(load, [advertiser?.id, refreshKey]);

    const handleToggle = async (offer) => {
        setTogglingId(offer.id);
        try {
            await api.setOfferStatus(offer.id, advertiser.id, !offer.isActive);
            load();
        } catch (err) {
            setError(err.message || 'Не удалось изменить статус кампании');
        } finally {
            setTogglingId(null);
        }
    };

    if (offers === null && !error) {
        return (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка кампаний...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Мои кампании</h2>
                <button
                    onClick={onOpenWizard}
                    className="flex items-center gap-1.5 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Новая кампания
                </button>
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">
                    {error}
                </div>
            )}

            {offers?.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    У вас пока нет запущенных кампаний.
                </div>
            ) : (
                <div className="grid gap-3">
                    {offers?.map((offer) => (
                        <div key={offer.id} className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <button
                                    onClick={() => onOpenOffer(offer.id)}
                                    className="text-left group flex-1 min-w-0"
                                >
                                    <h3 className="font-bold text-slate-100 text-sm group-hover:text-brand-accent transition-colors truncate">
                                        {offer.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono flex-wrap">
                                        <span>Ставка: <b>${Number(offer.advertiserCpmRate).toFixed(2)}</b></span>
                                        <span>Выплата: <b>${Number(offer.workerCpmRate).toFixed(2)}</b></span>
                                        <span>Порог: <b>{Number(offer.minViewsThreshold).toLocaleString()}</b></span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleToggle(offer)}
                                    disabled={togglingId === offer.id}
                                    className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold transition-colors disabled:opacity-40 ${
                                        offer.isActive
                                            ? 'bg-brand-success/10 text-brand-success border border-brand-success/20 hover:bg-brand-success/20'
                                            : 'bg-slate-800 text-slate-400 border border-brand-border hover:bg-slate-700'
                                    }`}
                                >
                                    {offer.isActive ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                                    {offer.isActive ? 'Активна' : 'Остановлена'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center justify-between font-mono text-xs">
                                    <span className="text-slate-400">Остаток бюджета:</span>
                                    <span className="font-bold text-brand-success text-sm">
                                        ${Number(offer.remainingBudget).toFixed(2)} / ${Number(offer.totalBudget).toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTopUpOffer(offer)}
                                    title="Пополнить бюджет"
                                    className="p-3 rounded-xl border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors"
                                >
                                    <DollarSign className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onOpenOffer(offer.id)}
                                    title="Подробнее"
                                    className="p-3 rounded-xl border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {topUpOffer && (
                <TopUpModal
                    advertiser={advertiser}
                    offer={topUpOffer}
                    onClose={() => setTopUpOffer(null)}
                    onToppedUp={() => {
                        setTopUpOffer(null);
                        load();
                        onBalanceChanged?.();
                    }}
                />
            )}
        </div>
    );
}
