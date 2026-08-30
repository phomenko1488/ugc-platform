import React, { useEffect, useState } from 'react';
import { ExternalLink, Clock, XCircle, ThumbsUp, Hourglass, ShieldAlert } from 'lucide-react';

// Submission State Machine badges: PENDING_REVIEW (platform hasn't looked at it yet) ->
// TRACKING (passed platform review, sitting in an active hold the advertiser can still dispute)
// -> APPROVED (hold expired without a dispute, or a dispute was resolved in the worker's favor —
// either way HoldSettlementScheduler/SubmissionServiceImpl already paid it out, hence "Выплачено").
const STATUS_META = {
    PENDING_REVIEW: { label: 'На проверке платформой', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20', icon: Clock },
    TRACKING: { label: 'В холде (проверка рекламодателем)', className: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20', icon: Hourglass },
    APPROVED: { label: 'Выплачено', className: 'bg-brand-success/10 text-brand-success border-brand-success/20', icon: ThumbsUp },
    REJECTED: { label: 'Отклонено', className: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20', icon: XCircle },
    // Advertiser Cabinet's Dispute Flow: an advertiser flagged this submission from the Traffic
    // Inspector; it's paused pending a moderator's approve/reject decision.
    DISPUTED: { label: 'Оспорено', className: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20', icon: ShieldAlert },
};

function useCountdown(targetIso) {
    const [remainingMs, setRemainingMs] = useState(() => (targetIso ? new Date(targetIso).getTime() - Date.now() : null));

    useEffect(() => {
        if (!targetIso) return;
        setRemainingMs(new Date(targetIso).getTime() - Date.now());
        const interval = setInterval(() => {
            setRemainingMs(new Date(targetIso).getTime() - Date.now());
        }, 30_000);
        return () => clearInterval(interval);
    }, [targetIso]);

    return remainingMs;
}

function formatRemaining(ms) {
    if (ms === null || ms === undefined) return null;
    if (ms <= 0) return 'Холд истёк, ожидайте проверки';

    const totalMinutes = Math.floor(ms / 60_000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}д ${hours}ч до разморозки`;
    if (hours > 0) return `${hours}ч ${minutes}м до разморозки`;
    return `${minutes}м до разморозки`;
}

export default function SubmissionCard({ submission }) {
    const meta = STATUS_META[submission.status] || STATUS_META.PENDING_REVIEW;
    const StatusIcon = meta.icon;
    const remainingMs = useCountdown(submission.status === 'TRACKING' ? submission.holdExpiresAt : null);
    const remainingLabel = formatRemaining(remainingMs);

    return (
        <div className="bg-brand-card border border-brand-border p-4 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-200">{submission.offerTitle}</span>
                        {submission.platformCode && (
                            <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-400 font-mono">
                                {submission.platformCode}
                            </span>
                        )}
                    </div>
                    {submission.sourceUrl && (
                        <a
                            href={submission.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-mono mt-1 truncate"
                        >
                            <span className="truncate">{submission.sourceUrl}</span>
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
                    <div className="text-xs font-bold font-mono text-white">{Number(submission.recordedViews ?? submission.declaredViews ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border/60">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Лайки</div>
                    <div className="text-xs font-bold font-mono text-white">{Number(submission.recordedLikes ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border/60">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">ER</div>
                    <div className="text-xs font-bold font-mono text-brand-accent">{submission.currentEngagementRate ?? '—'}%</div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <div className={`text-[11px] font-mono font-semibold ${submission.status === 'APPROVED' ? 'text-brand-success' : 'text-amber-400'}`}>
                    {submission.status === 'APPROVED' ? 'Выплачено' : 'Холд'}: +${Number(submission.holdAmount || 0).toFixed(2)}
                </div>
                {remainingLabel && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {remainingLabel}
                    </div>
                )}
            </div>

            {submission.status === 'REJECTED' && (submission.rejectionReason || submission.moderatorComment) && (
                <div className="text-[11px] text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-lg px-3 py-2">
                    Причина отклонения: {submission.rejectionReason || submission.moderatorComment}
                </div>
            )}

            {submission.status === 'DISPUTED' && submission.disputeCategory && (
                <div className="text-[11px] text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-lg px-3 py-2">
                    Оспорено рекламодателем ({submission.disputeCategory}){submission.disputeComment ? `: ${submission.disputeComment}` : ''}
                </div>
            )}
        </div>
    );
}
