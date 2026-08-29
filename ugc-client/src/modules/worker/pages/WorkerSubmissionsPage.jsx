import React, { useMemo, useState } from 'react';
import { Film, ChevronDown } from 'lucide-react';
import SubmissionCard from '../components/SubmissionCard';

const STATUS_TABS = [
    { key: 'ALL', label: 'Все' },
    { key: 'TRACKING', label: 'В холде' },
    { key: 'PENDING_REVIEW', label: 'На проверке' },
    { key: 'APPROVED', label: 'Одобрено' },
    { key: 'REJECTED', label: 'Отклонено' },
];

const ALL_CAMPAIGNS = 'ALL';

export default function WorkerSubmissionsPage({ submissions }) {
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [campaignFilter, setCampaignFilter] = useState(ALL_CAMPAIGNS);

    // Derived straight from the submissions the caller already fetched — no extra request needed,
    // and it self-updates as new submissions (for offers not seen before) come in.
    const campaigns = useMemo(() => {
        const seen = new Map();
        (submissions || []).forEach((s) => {
            const id = s.offerId ?? s.offer?.id;
            const title = s.offerTitle ?? s.offer?.title;
            if (id != null && !seen.has(id)) {
                seen.set(id, title || `Оффер #${id}`);
            }
        });
        return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
    }, [submissions]);

    const filtered = useMemo(() => {
        return (submissions || []).filter((s) => {
            const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
            const submissionOfferId = s.offerId ?? s.offer?.id;
            const matchesCampaign = campaignFilter === ALL_CAMPAIGNS
                || String(submissionOfferId) === String(campaignFilter);
            return matchesStatus && matchesCampaign;
        });
    }, [submissions, statusFilter, campaignFilter]);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Мои ролики</h2>
                <span className="text-xs bg-brand-border px-2 py-0.5 rounded-full text-slate-300 font-normal">
                    {filtered.length}
                </span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {STATUS_TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                            statusFilter === key
                                ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {campaigns.length > 0 && (
                <div className="relative">
                    <select
                        value={campaignFilter}
                        onChange={(e) => setCampaignFilter(e.target.value)}
                        className="w-full appearance-none bg-brand-card border border-brand-border rounded-xl pl-4 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                    >
                        <option value={ALL_CAMPAIGNS}>Все кампании</option>
                        {campaigns.map(({ id, title }) => (
                            <option key={id} value={id}>{title}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    Ничего не найдено в этой категории.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {filtered.map((submission) => (
                        <SubmissionCard key={submission.id} submission={submission} />
                    ))}
                </div>
            )}
        </div>
    );
}
