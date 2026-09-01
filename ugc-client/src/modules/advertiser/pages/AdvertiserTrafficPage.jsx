import React, { useEffect, useState } from 'react';
import {
    Loader2, ExternalLink, ZoomIn, X, ShieldAlert, Clock,
    ThumbsUp, XCircle, Hourglass,
} from 'lucide-react';
import { api } from '../../../api';
import DisputeModal from '../components/DisputeModal';
import Pagination from '../../../components/Pagination';

const STATUS_TABS = [
    { key: null, label: 'Все' },
    { key: 'PENDING_REVIEW', label: 'На проверке платформой' },
    { key: 'TRACKING', label: 'В холде' },
    { key: 'APPROVED', label: 'Одобрено' },
    { key: 'DISPUTED', label: 'Оспорено' },
    { key: 'REJECTED', label: 'Отклонено' },
];

const STATUS_META = {
    TRACKING: { label: 'В холде', className: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20', icon: Hourglass },
    PENDING_REVIEW: { label: 'На проверке', className: 'bg-brand-info/10 text-brand-info border-brand-info/20', icon: Clock },
    APPROVED: { label: 'Одобрено', className: 'bg-brand-success/10 text-brand-success border-brand-success/20', icon: ThumbsUp },
    REJECTED: { label: 'Отклонено', className: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20', icon: XCircle },
    DISPUTED: { label: 'Оспорено', className: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20', icon: ShieldAlert },
    PAID: { label: 'Выплачено', className: 'bg-brand-success/10 text-brand-success border-brand-success/20', icon: ThumbsUp },
};

// Only a submission that has passed platform review and is sitting in its active hold (TRACKING)
// can be disputed — PENDING_REVIEW hasn't been reviewed by the platform yet, and everything past
// TRACKING (APPROVED/PAID) has already settled. Mirrors SubmissionServiceImpl.disputeSubmission's
// server-side check exactly, so the button here never offers an action the backend would reject.
const DISPUTABLE_STATUSES = new Set(['TRACKING']);

// "Осталось на проверку: X дн. Y ч." next to a TRACKING submission — how much longer the
// advertiser has to dispute it before HoldSettlementScheduler auto-settles it.
function formatHoldRemaining(holdExpiresAt) {
    if (!holdExpiresAt) return null;
    const remainingMs = new Date(holdExpiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Холд истёк, ожидает авторазморозки';

    const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `Осталось на проверку: ${days} дн. ${hours} ч.`;
}

/**
 * Traffic Inspector — every submission across the advertiser's campaigns, filterable by status,
 * with a screenshot viewer and the "Оспорить" (Dispute) action that flags fraud/ToS/GEO issues
 * straight from here instead of waiting on the moderation queue.
 */
export default function AdvertiserTrafficPage({ advertiser, refreshKey }) {
    const [statusFilter, setStatusFilter] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [pageData, setPageData] = useState(null);
    const [error, setError] = useState(null);
    const [zoomImageUrl, setZoomImageUrl] = useState(null);
    const [disputeTarget, setDisputeTarget] = useState(null);
    // Ticks once a minute purely to force the "Осталось на проверку" labels below to recompute —
    // no refetch, holdExpiresAt itself doesn't change between polls.
    const [, setNowTick] = useState(0);

    const submissions = pageData?.content || null;

    useEffect(() => {
        const interval = setInterval(() => setNowTick((n) => n + 1), 60_000);
        return () => clearInterval(interval);
    }, []);

    const load = () => {
        if (!advertiser?.id) return;
        api.getAdvertiserTraffic(advertiser.id, statusFilter, page, pageSize)
            .then((data) => { setPageData(data); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить трафик'));
    };

    useEffect(load, [advertiser?.id, statusFilter, page, pageSize, refreshKey]);

    const handleStatusFilterChange = (key) => {
        setStatusFilter(key);
        setPage(0);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Инспектор трафика</h2>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {STATUS_TABS.map((tab) => {
                    const isActive = statusFilter === tab.key;
                    return (
                        <button
                            key={tab.label}
                            onClick={() => handleStatusFilterChange(tab.key)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                isActive
                                    ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                    : 'bg-brand-card text-slate-400 border-brand-border hover:border-brand-accent/30'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {submissions === null && !error ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" /> Загрузка трафика...
                </div>
            ) : submissions?.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    Заявок с таким статусом не найдено.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {submissions?.map((s) => {
                        const meta = STATUS_META[s.status] || STATUS_META.PENDING_REVIEW;
                        const StatusIcon = meta.icon;
                        return (
                            <div key={s.id} className="bg-brand-card border border-brand-border p-4 rounded-xl space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-200 truncate">{s.offerTitle}</span>
                                            {s.platformCode && (
                                                <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-400 font-mono">
                                                    {s.platformCode}
                                                </span>
                                            )}
                                        </div>
                                        {s.sourceUrl && (
                                            <a
                                                href={s.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-mono mt-1 truncate"
                                            >
                                                <span className="truncate">{s.sourceUrl}</span>
                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                            </a>
                                        )}
                                    </div>
                                    <span className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold border uppercase tracking-wide ${meta.className}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {meta.label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border/60">
                                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Просмотры</div>
                                        <div className="text-xs font-bold font-mono text-white">{Number(s.recordedViews || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border/60">
                                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Лайки</div>
                                        <div className="text-xs font-bold font-mono text-white">{Number(s.recordedLikes || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border/60">
                                        <div className="text-[9px] text-slate-500 uppercase font-semibold">ER</div>
                                        <div className="text-xs font-bold font-mono text-brand-accent">{s.currentEngagementRate ?? '—'}%</div>
                                    </div>
                                </div>

                                {s.analyticsProofAssetUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setZoomImageUrl(s.analyticsProofAssetUrl)}
                                        className="relative group w-full block"
                                    >
                                        <img
                                            src={s.analyticsProofAssetUrl}
                                            alt="Скриншот аналитики"
                                            className="rounded-lg border border-brand-border max-h-32 w-full object-cover"
                                        />
                                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                )}

                                {s.status === 'DISPUTED' && s.disputeCategory && (
                                    <div className="text-[11px] text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-lg px-3 py-2">
                                        {s.disputeCategory}{s.disputeComment ? `: ${s.disputeComment}` : ''}
                                    </div>
                                )}

                                {s.status === 'TRACKING' && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono bg-brand-warning/5 border border-brand-warning/20 rounded-lg px-3 py-1.5">
                                        <Hourglass className="w-3 h-3 shrink-0" />
                                        {formatHoldRemaining(s.holdExpiresAt)}
                                    </div>
                                )}

                                {DISPUTABLE_STATUSES.has(s.status) && (
                                    <button
                                        onClick={() => setDisputeTarget(s)}
                                        className="w-full flex items-center justify-center gap-1.5 text-brand-danger hover:bg-brand-danger/10 text-xs font-bold py-2 rounded-lg border border-brand-danger/30 transition-colors"
                                    >
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        Оспорить
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {pageData && (
                <Pagination
                    currentPage={pageData.pageNumber}
                    totalPages={pageData.totalPages}
                    totalElements={pageData.totalElements}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
                />
            )}

            {zoomImageUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setZoomImageUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setZoomImageUrl(null)}
                        className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={zoomImageUrl}
                        alt="Скриншот аналитики (полный размер)"
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full rounded-xl border border-white/10 object-contain cursor-zoom-out"
                    />
                </div>
            )}

            {disputeTarget && (
                <DisputeModal
                    advertiser={advertiser}
                    submission={disputeTarget}
                    onClose={() => setDisputeTarget(null)}
                    onDisputed={() => {
                        setDisputeTarget(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}
