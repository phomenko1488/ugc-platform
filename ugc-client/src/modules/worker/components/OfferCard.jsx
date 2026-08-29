import React from 'react';
import { Send, Clock, Eye, Ban, PlusCircle, CheckCircle2, XCircle, Film, Wallet } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

function triggerHaptic(type = 'success') {
    try {
        WebApp.HapticFeedback?.notificationOccurred(type);
    } catch {
        // Not running inside Telegram — no-op.
    }
}

function triggerImpact(style = 'light') {
    try {
        WebApp.HapticFeedback?.impactOccurred(style);
    } catch {
        // Not running inside Telegram — no-op.
    }
}

/**
 * One offer, either from the "Взять в работу" catalog or from the worker's own "В работе" list.
 *
 * `showStats` is driven by which tab WorkerOffersPage has active, not by whether the DTO's
 * mySubmissionsCount/myHoldAmountTotal/myApprovedAmountTotal fields are non-zero — the backend's
 * /offers/catalog endpoint deliberately zeroes those out for every row (no per-worker aggregate
 * query per catalog item), so treating "0" as "nothing to show" there would just be wrong instead
 * of merely uninformative. Only the "Мои офферы" tab passes showStats=true, where the numbers are
 * real.
 */
export default function OfferCard({ offer, showStats = false, isPending = false, onTake, onLeave, onSubmit, onOpenDetails }) {
    // stopWords isn't a field this delivery could confirm on the real Offer entity (it lives too
    // deep in the backend tree for this session's tools to read) — rendered defensively, hidden
    // entirely if the backend doesn't send it yet.
    const stopWords = Array.isArray(offer.stopWords)
        ? offer.stopWords
        : (typeof offer.stopWords === 'string' && offer.stopWords.trim() ? offer.stopWords.split(',').map(w => w.trim()) : []);

    const handleTake = (e) => {
        e.stopPropagation();
        if (isPending) return;
        triggerImpact('medium');
        onTake?.(offer);
    };

    const handleLeave = (e) => {
        e.stopPropagation();
        if (isPending) return;
        const confirmed = window.confirm(`Отказаться от оффера «${offer.title}»? Уже сданные ролики останутся в истории.`);
        if (!confirmed) return;
        triggerHaptic('warning');
        onLeave?.(offer);
    };

    const handleSubmit = (e) => {
        e.stopPropagation();
        triggerImpact('light');
        onSubmit?.(offer);
    };

    const handleOpenDetails = () => {
        triggerImpact('light');
        onOpenDetails?.(offer);
    };

    return (
        <div
            onClick={handleOpenDetails}
            className="p-5 rounded-2xl border border-brand-border bg-brand-card hover:bg-brand-cardHover/60 hover:border-slate-700 transition-all cursor-pointer"
        >
            <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 text-sm md:text-base">{offer.title}</h3>
                    {offer.requirementsDescription && (
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                            {offer.requirementsDescription}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="bg-brand-success/10 text-brand-success text-xs font-bold font-mono px-2.5 py-1 rounded-lg border border-brand-success/20 whitespace-nowrap">
                        ${Number(offer.workerCpmRate).toFixed(2)} / 1M
                    </span>
                    {offer.isTaken && (
                        <span className="flex items-center gap-1 bg-brand-accent/10 text-brand-accent text-[10px] font-bold px-2 py-0.5 rounded-lg border border-brand-accent/20 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" />
                            В работе
                        </span>
                    )}
                </div>
            </div>

            {stopWords.length > 0 && (
                <div className="flex items-center flex-wrap gap-1.5 mt-3">
                    <Ban className="w-3 h-3 text-brand-danger shrink-0" />
                    {stopWords.map((word) => (
                        <span key={word} className="text-[10px] bg-brand-danger/10 text-brand-danger border border-brand-danger/20 px-1.5 py-0.5 rounded font-mono">
                            {word}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-brand-border/60 text-[11px] text-slate-400">
                {offer.allowedPlatforms?.map((p) => (
                    <span key={p.id ?? p.code} className="bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-300 font-medium">
                        {p.displayName ?? p.code}
                    </span>
                ))}
                {offer.targetGeos?.map((g) => (
                    <span key={g.id ?? g.isoCode} className="bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-500 font-medium">
                        {g.isoCode ?? g.name}
                    </span>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-brand-accent" />
                    <b className="text-brand-accent font-mono">{Number(offer.minViewsThreshold).toLocaleString()}</b> просмотров
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Холд <b className="text-amber-400">{offer.holdPeriodDays} дн.</b>
                </span>
            </div>

            {offer.isTaken && showStats && (
                <div className="flex items-center gap-4 mt-3 p-2.5 rounded-xl bg-brand-bg border border-brand-border text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <Film className="w-3.5 h-3.5 text-slate-500" />
                        Сдано: <b className="text-slate-200 font-mono">{offer.mySubmissionsCount ?? 0}</b>
                    </span>
                    {Number(offer.myHoldAmountTotal) > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-400">
                            <Wallet className="w-3.5 h-3.5" />
                            В холде: <b className="font-mono">+${Number(offer.myHoldAmountTotal).toFixed(2)}</b>
                        </span>
                    )}
                    {Number(offer.myApprovedAmountTotal) > 0 && (
                        <span className="flex items-center gap-1.5 text-brand-success">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Одобрено: <b className="font-mono">+${Number(offer.myApprovedAmountTotal).toFixed(2)}</b>
                        </span>
                    )}
                </div>
            )}

            {offer.isTaken ? (
                <div className="mt-4 space-y-2">
                    <button
                        onClick={handleSubmit}
                        className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-brand-accent/10"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Сдать ролик
                    </button>
                    <button
                        onClick={handleLeave}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-brand-danger text-[11px] font-medium py-1.5 transition-colors disabled:opacity-40"
                    >
                        <XCircle className="w-3 h-3" />
                        {isPending ? 'Обработка...' : 'Отказаться от оффера'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleTake}
                    disabled={isPending}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-brand-accent/10 disabled:opacity-50"
                >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {isPending ? 'Беру в работу...' : 'Взять в работу'}
                </button>
            )}
        </div>
    );
}
