import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Users, Eye, Wallet2, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

// No dedicated "creators roster" endpoint exists on the backend yet, so this page builds one
// client-side from the same Traffic Inspector data AdvertiserTrafficPage already fetches
// (real SubmissionResponseDTO rows — workerId, authorChannelName, payableViews, holdAmount,
// status, createdAt), grouped by workerId. A single large page covers realistic traffic volumes
// for now; if an advertiser's submission count grows well past this, the honest next step is a
// dedicated GROUP BY workerId aggregation query on the backend rather than pulling more pages
// here — noted so this simplification isn't mistaken for the final scale-tested shape.
const AGGREGATION_FETCH_SIZE = 500;

const STATUS_BADGE = {
    dispute: { label: 'Есть спор', className: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20', icon: ShieldAlert },
    pending: { label: 'На проверке', className: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20', icon: Clock },
    active: { label: 'Активен', className: 'bg-brand-success/10 text-brand-success border-brand-success/20', icon: CheckCircle2 },
};

function deriveCreatorStatus(statuses) {
    if (statuses.has('DISPUTED')) return 'dispute';
    if (statuses.has('PENDING_REVIEW') || statuses.has('TRACKING')) return 'pending';
    return 'active';
}

function aggregateByCreator(submissions) {
    const byWorker = new Map();

    for (const s of submissions) {
        const key = s.workerId;
        if (!byWorker.has(key)) {
            byWorker.set(key, {
                workerId: key,
                label: s.authorChannelName || `Криэйтор #${key}`,
                submissionsCount: 0,
                payableViewsTotal: 0,
                holdAmountTotal: 0,
                lastActivity: s.createdAt,
                statuses: new Set(),
            });
        }
        const row = byWorker.get(key);
        row.submissionsCount += 1;
        row.payableViewsTotal += Number(s.payableViews || 0);
        row.holdAmountTotal += Number(s.holdAmount || 0);
        row.statuses.add(s.status);
        if (new Date(s.createdAt) > new Date(row.lastActivity)) {
            row.lastActivity = s.createdAt;
        }
        // A creator's display name can arrive blank on their very first (still-processing)
        // submission — backfill it the moment a later row of theirs carries one.
        if (s.authorChannelName) {
            row.label = s.authorChannelName;
        }
    }

    return Array.from(byWorker.values()).sort((a, b) => b.payableViewsTotal - a.payableViewsTotal);
}

function formatViews(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
}

function formatUsd(n) {
    return `$${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`;
}

/**
 * "Криэйторы" — a roster of every content creator who has submitted traffic against this
 * advertiser's campaigns, aggregated from real submission data (views delivered, amount held/
 * earned, last activity, and a status derived from their most recent review outcomes).
 */
export default function AdvertiserCreatorsPage({ advertiser }) {
    const [rawSubmissions, setRawSubmissions] = useState(null);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        if (!advertiser?.id) return;
        setRawSubmissions(null);
        setError(null);
        api.getAdvertiserTraffic(advertiser.id, null, 0, AGGREGATION_FETCH_SIZE)
            .then((data) => setRawSubmissions(data?.content || []))
            .catch((err) => setError(err.message || 'Не удалось загрузить данные о криэйторах'));
    }, [advertiser?.id]);

    const creators = useMemo(() => (rawSubmissions ? aggregateByCreator(rawSubmissions) : []), [rawSubmissions]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return creators;
        return creators.filter((c) => c.label.toLowerCase().includes(q) || String(c.workerId).includes(q));
    }, [creators, search]);

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

    if (error) {
        return (
            <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/5 p-6 text-center text-xs text-brand-danger">
                {error}
            </div>
        );
    }

    if (rawSubmissions === null) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-lg font-bold text-white">Криэйторы</h1>
                    <p className="mt-1 text-xs text-slate-500">
                        Все авторы контента, приносившие трафик по вашим кампаниям — {creators.length}{' '}
                        {creators.length === 1 ? 'криэйтор' : 'криэйторов'}.
                    </p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Поиск по имени или ID"
                        className="w-full rounded-xl border border-brand-border bg-brand-card/40 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
                    />
                </div>
            </div>

            {creators.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-card/40 py-16 text-center">
                    <Users className="h-8 w-8 text-slate-700" />
                    <p className="text-xs text-slate-500">Пока никто не приносил трафик по вашим кампаниям.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card/40">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-brand-border text-[10px] uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-3 font-semibold">Криэйтор</th>
                                    <th className="px-4 py-3 font-semibold">Статус</th>
                                    <th className="px-4 py-3 font-semibold text-right">Заливов</th>
                                    <th className="px-4 py-3 font-semibold text-right">Просмотры</th>
                                    <th className="px-4 py-3 font-semibold text-right">Начислено</th>
                                    <th className="px-4 py-3 font-semibold text-right">Активность</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((c) => {
                                    const statusKey = deriveCreatorStatus(c.statuses);
                                    const meta = STATUS_BADGE[statusKey];
                                    const StatusIcon = meta.icon;
                                    return (
                                        <tr key={c.workerId} className="border-b border-brand-border/60 last:border-0 hover:bg-white/[0.02]">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-200">{c.label}</div>
                                                <div className="text-[10px] text-slate-600">ID: {c.workerId}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold ${meta.className}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-300">{c.submissionsCount}</td>
                                            <td className="px-4 py-3 text-right text-slate-300">
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    <Eye className="h-3 w-3 text-slate-600" />
                                                    {formatViews(c.payableViewsTotal)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-brand-success">
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    <Wallet2 className="h-3 w-3" />
                                                    {formatUsd(c.holdAmountTotal)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500">
                                                {new Date(c.lastActivity).toLocaleDateString('ru-RU')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-brand-border px-2">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
