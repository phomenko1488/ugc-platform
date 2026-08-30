import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeft, Loader2, Ban, Eye, Clock, Copy, Check, PlusCircle,
    Send, XCircle, Film, Wallet, CheckCircle2, PauseCircle, DollarSign,
    Download, Image as ImageIcon, FolderArchive,
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { api } from '../../../api';
import SubmissionCard from '../components/SubmissionCard';
import SubmissionModal from '../components/SubmissionModal';

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
 * Offer Details Hub — the worker's full-page view of one campaign: rates/requirements, their
 * personal take/leave/submit actions, aggregate progress, and their entire submission history for
 * it. Mounted by WorkerLayout whenever a card in WorkerOffersPage is opened; `onBack` returns to
 * the catalog/my-offers tabs.
 */
export default function WorkerOfferDetailPage({ worker, offerId, onBack }) {
    const [details, setDetails] = useState(null); // null = loading
    const [loadError, setLoadError] = useState(null);
    const [actionPending, setActionPending] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        if (!worker?.id || !offerId) return;
        try {
            setLoadError(null);
            const data = await api.getOfferDetails(offerId, worker.id);
            setDetails(data);
        } catch (err) {
            console.error('Не удалось загрузить оффер:', err);
            setLoadError(err.message || 'Не удалось загрузить оффер');
        }
    }, [worker?.id, offerId]);

    useEffect(() => {
        setDetails(null);
        load();
    }, [load]);

    const handleCopyTag = () => {
        if (!worker?.affiliateTag) return;
        navigator.clipboard.writeText(`#${worker.affiliateTag}`);
        triggerHaptic('success');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTake = async () => {
        setActionPending(true);
        setActionError(null);
        try {
            await api.takeOffer(offerId, worker.id);
            triggerImpact('medium');
            await load();
        } catch (err) {
            setActionError(err.message || 'Не удалось взять оффер в работу');
        } finally {
            setActionPending(false);
        }
    };

    const handleLeave = async () => {
        const confirmed = window.confirm(`Отказаться от оффера «${details?.title}»? Уже сданные ролики останутся в истории.`);
        if (!confirmed) return;
        setActionPending(true);
        setActionError(null);
        try {
            await api.leaveOffer(offerId, worker.id);
            triggerHaptic('warning');
            await load();
        } catch (err) {
            setActionError(err.message || 'Не удалось отказаться от оффера');
        } finally {
            setActionPending(false);
        }
    };

    const backButton = (
        <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
        >
            <ArrowLeft className="w-4 h-4" />
            Назад к офферам
        </button>
    );

    if (loadError) {
        return (
            <div className="space-y-4">
                {backButton}
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-4 rounded-2xl">
                    {loadError}
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="space-y-4">
                {backButton}
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка оффера...
                </div>
            </div>
        );
    }

    const stopWords = Array.isArray(details.stopWords)
        ? details.stopWords
        : (typeof details.stopWords === 'string' && details.stopWords.trim() ? details.stopWords.split(',').map(w => w.trim()) : []);

    return (
        <div className="space-y-5 pb-4">
            {backButton}

            {/* Campaign info */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-white leading-snug">{details.title}</h2>
                    {details.isActive ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border uppercase tracking-wide bg-brand-success/10 text-brand-success border-brand-success/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Активен
                        </span>
                    ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-bold border uppercase tracking-wide bg-slate-500/10 text-slate-400 border-slate-500/20">
                            <PauseCircle className="w-3 h-3" />
                            Завершен
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <DollarSign className="w-3 h-3" /> Ставка
                        </div>
                        <div className="text-sm font-bold font-mono text-brand-success mt-1">
                            ${Number(details.workerCpmRate).toFixed(2)}/1M
                        </div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Eye className="w-3 h-3" /> Порог
                        </div>
                        <div className="text-sm font-bold font-mono text-brand-accent mt-1">
                            {Number(details.minViewsThreshold).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Clock className="w-3 h-3" /> Холд
                        </div>
                        <div className="text-sm font-bold font-mono text-amber-400 mt-1">
                            {details.holdPeriodDays} дн.
                        </div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Бюджет остаток</div>
                        <div className="text-sm font-bold font-mono text-white mt-1">
                            ${Number(details.remainingBudget).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {details.allowedPlatforms?.map((p) => (
                        <span key={p.id ?? p.code} className="text-[11px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-300 font-medium">
                            {p.displayName ?? p.code}
                        </span>
                    ))}
                    {details.targetGeos?.map((g) => (
                        <span key={g.id ?? g.isoCode} className="text-[11px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-500 font-medium">
                            {g.isoCode ?? g.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Requirements & promo tag */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Требования к ролику</h3>
                {details.requirementsDescription && (
                    <p className="text-xs text-slate-400 leading-relaxed">{details.requirementsDescription}</p>
                )}
                {stopWords.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-brand-danger shrink-0" />
                        {stopWords.map((word) => (
                            <span key={word} className="text-[10px] bg-brand-danger/10 text-brand-danger border border-brand-danger/20 px-1.5 py-0.5 rounded font-mono">
                                {word}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between gap-3 bg-brand-bg border border-brand-border rounded-xl px-4 py-3">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Ваш тег для описания ролика</div>
                        <div className="text-sm font-mono font-bold text-brand-accent mt-0.5">#{worker?.affiliateTag || 'wrk_none'}</div>
                    </div>
                    <button
                        onClick={handleCopyTag}
                        className="p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors shrink-0"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Media Kit & Assets — исходники, звуки, бриф и брендовые ассеты рекламодателя */}
            {(details.mediaKitUrl || details.brandAssetUrls?.length > 0) && (
                <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-brand-accent" />
                        Материалы для креативов
                    </h3>
                    {details.mediaKitUrl && (
                        <a
                            href={details.mediaKitUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Скачать пак исходников и звуков
                        </a>
                    )}
                    {details.brandAssetUrls?.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold">Брендовые ассеты</div>
                            {details.brandAssetUrls.map((url) => (
                                <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2 text-[11px] text-slate-300 hover:text-brand-accent hover:border-brand-accent/40 transition-colors truncate"
                                >
                                    <ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                    <span className="truncate font-mono">{url}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {actionError && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">
                    {actionError}
                </div>
            )}

            {/* Actions */}
            {!details.isActive ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-4 rounded-2xl flex items-center gap-2.5">
                    <PauseCircle className="w-4 h-4 shrink-0" />
                    Прием видео по офферу завершен рекламодателем.
                </div>
            ) : details.isTaken ? (
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => { triggerImpact('light'); setSubmitting(true); }}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-accent/10"
                    >
                        <Send className="w-4 h-4" />
                        Сдать видео
                    </button>
                    <button
                        onClick={handleLeave}
                        disabled={actionPending}
                        className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-brand-danger text-xs font-medium py-3 px-4 rounded-xl border border-transparent hover:border-brand-danger/20 transition-colors disabled:opacity-40"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        {actionPending ? 'Обработка...' : 'Отказаться от оффера'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleTake}
                    disabled={actionPending}
                    className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-accent/10 disabled:opacity-50"
                >
                    <PlusCircle className="w-4 h-4" />
                    {actionPending ? 'Беру в работу...' : 'Взять оффер в работу'}
                </button>
            )}

            {/* Worker summary */}
            <div>
                <h3 className="text-sm font-bold text-white mb-3">Ваша сводка по офферу</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Film className="w-3 h-3" /> Сдано роликов
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{details.mySubmissionsCount ?? 0}</div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Eye className="w-3 h-3" /> Просмотров
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-accent mt-1">
                            {Number(details.myTotalViews ?? 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Clock className="w-3 h-3" /> В холде
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-warning mt-1">
                            ${Number(details.myHoldAmountTotal ?? 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold">
                            <Wallet className="w-3 h-3" /> Выплачено
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-success mt-1">
                            ${Number(details.myEarnedAmountTotal ?? 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission history */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-brand-accent" />
                    Сданные ролики по этой кампании
                </h3>
                {details.mySubmissions?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {details.mySubmissions.map((submission) => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center text-slate-500 text-xs">
                        Вы еще не сдавали ролики по этому офферу.
                    </div>
                )}
            </div>

            {submitting && (
                <SubmissionModal
                    worker={worker}
                    offer={details}
                    onClose={() => setSubmitting(false)}
                    onSubmitted={() => {
                        setSubmitting(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}
