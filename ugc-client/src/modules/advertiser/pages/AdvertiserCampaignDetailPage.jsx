import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeft, Loader2, Eye, Clock, DollarSign, Users, Film,
    CheckCircle2, PauseCircle, PlusCircle, StopCircle,
} from 'lucide-react';
import { api } from '../../../api';
import SubmissionCard from '../../worker/components/SubmissionCard';
import TopUpModal from '../components/TopUpModal';

/**
 * Campaign Detail Hub — offer info, workers currently in work, submission funnel counts, and the
 * offer's own submission history, plus early-stop (auto-refunds unused budget to the advertiser's
 * balance) and quick top-up. Mounted by AdvertiserLayout when a card in AdvertiserCampaignsPage
 * (or the Traffic Inspector) is opened.
 */
export default function AdvertiserCampaignDetailPage({ advertiser, offerId, onBack, onBalanceChanged }) {
    const [details, setDetails] = useState(null); // null = loading
    const [submissions, setSubmissions] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [stopping, setStopping] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);

    const load = useCallback(async () => {
        if (!advertiser?.id || !offerId) return;
        try {
            setLoadError(null);
            const [detail, subs] = await Promise.all([
                api.getAdvertiserOfferDetails(advertiser.id, offerId),
                api.getOfferSubmissions(offerId, advertiser.id).catch(() => []),
            ]);
            setDetails(detail);
            setSubmissions(subs || []);
        } catch (err) {
            setLoadError(err.message || 'Не удалось загрузить кампанию');
        }
    }, [advertiser?.id, offerId]);

    useEffect(() => {
        setDetails(null);
        setSubmissions(null);
        load();
    }, [load]);

    const handleStop = async () => {
        const confirmed = window.confirm(`Остановить кампанию «${details?.title}»? Неиспользованный бюджет вернётся на баланс.`);
        if (!confirmed) return;
        setStopping(true);
        try {
            await api.stopOffer(advertiser.id, offerId);
            await load();
            onBalanceChanged?.();
        } catch (err) {
            setLoadError(err.message || 'Не удалось остановить кампанию');
        } finally {
            setStopping(false);
        }
    };

    const backButton = (
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Назад к кампаниям
        </button>
    );

    if (loadError && !details) {
        return (
            <div className="space-y-4">
                {backButton}
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-4 rounded-2xl">{loadError}</div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="space-y-4">
                {backButton}
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка кампании...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {backButton}

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-white leading-snug">{details.title}</h2>
                    {details.isActive ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border uppercase tracking-wide bg-brand-success/10 text-brand-success border-brand-success/20">
                            <CheckCircle2 className="w-3 h-3" /> Активна
                        </span>
                    ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border uppercase tracking-wide bg-slate-500/10 text-slate-400 border-slate-500/20">
                            <PauseCircle className="w-3 h-3" /> Остановлена
                        </span>
                    )}
                </div>

                {details.requirementsDescription && (
                    <p className="text-xs text-slate-400 leading-relaxed">{details.requirementsDescription}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Ставка / Выплата</div>
                        <div className="text-sm font-bold font-mono text-white mt-1">
                            ${Number(details.advertiserCpmRate).toFixed(2)} / ${Number(details.workerCpmRate).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Бюджет</div>
                        <div className="text-sm font-bold font-mono text-brand-success mt-1">
                            ${Number(details.remainingBudget).toFixed(2)} / ${Number(details.totalBudget).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Потрачено</div>
                        <div className="text-sm font-bold font-mono text-brand-accent mt-1">${Number(details.budgetSpent).toFixed(2)}</div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Холд</div>
                        <div className="text-sm font-bold font-mono text-amber-400 mt-1">{details.holdPeriodDays} дн.</div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {details.allowedPlatforms?.map((p) => (
                        <span key={p.id} className="text-[11px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-300 font-medium">
                            {p.displayName ?? p.code}
                        </span>
                    ))}
                    {details.targetGeos?.map((g) => (
                        <span key={g.id} className="text-[11px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-500 font-medium">
                            {g.isoCode ?? g.name}
                        </span>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                        onClick={() => setShowTopUp(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Пополнить бюджет
                    </button>
                    {details.isActive && (
                        <button
                            onClick={handleStop}
                            disabled={stopping}
                            className="flex items-center justify-center gap-1.5 text-brand-danger hover:bg-brand-danger/10 text-xs font-bold py-2.5 px-4 rounded-xl border border-brand-danger/30 transition-colors disabled:opacity-40"
                        >
                            <StopCircle className="w-4 h-4" />
                            {stopping ? 'Останавливаем...' : 'Остановить кампанию'}
                        </button>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-white mb-3">Сводка по кампании</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Users className="w-3 h-3" /> Воркеров в работе
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{details.workersInWorkCount}</div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Film className="w-3 h-3" /> Всего заявок
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{details.totalSubmissionsCount}</div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Одобрено
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-success mt-1">{details.approvedSubmissionsCount}</div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <DollarSign className="w-3 h-3" /> Потрачено
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-accent mt-1">${Number(details.budgetSpent).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-accent" />
                    Воркеры в работе
                </h3>
                {details.activeWorkers?.length ? (
                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden divide-y divide-brand-border">
                        {details.activeWorkers.map((w) => (
                            <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold text-slate-200">{w.username}</div>
                                    <div className="text-[11px] text-brand-accent font-mono">#{w.affiliateTag}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-white">{w.submissionsCount}</div>
                                    <div className="text-[9px] text-slate-500 uppercase">заявок</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center text-slate-500 text-xs">
                        Пока ни один воркер не взял кампанию в работу.
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-accent" />
                    Заявки по кампании
                </h3>
                {submissions === null ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-8">
                        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка заявок...
                    </div>
                ) : submissions.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
                    </div>
                ) : (
                    <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center text-slate-500 text-xs">
                        По этой кампании ещё нет заявок.
                    </div>
                )}
            </div>

            {showTopUp && (
                <TopUpModal
                    advertiser={advertiser}
                    offer={details}
                    onClose={() => setShowTopUp(false)}
                    onToppedUp={() => {
                        setShowTopUp(false);
                        load();
                        onBalanceChanged?.();
                    }}
                />
            )}
        </div>
    );
}
