import React, { useEffect, useState } from 'react';
import { Film, ChevronDown, Loader2 } from 'lucide-react';
import SubmissionCard from '../components/SubmissionCard';
import Pagination from '../../../components/Pagination';
import { api } from '../../../api';

const STATUS_TABS = [
    { key: 'ALL', label: 'Все' },
    { key: 'TRACKING', label: 'В холде' },
    { key: 'PENDING_REVIEW', label: 'На проверке' },
    { key: 'APPROVED', label: 'Одобрено' },
    { key: 'REJECTED', label: 'Отклонено' },
];

const ALL_CAMPAIGNS = 'ALL';

/**
 * Pagination initiative — this page used to derive both the visible list AND the campaign
 * dropdown's option list from one client-side-filtered array the caller fetched in full. Now that
 * getWorkerSubmissions is server-side paginated, the dropdown is sourced independently via
 * getMyOffers(workerId) (the same call WorkerOffersPage already makes) so it stays fully populated
 * regardless of which page of submissions is currently loaded.
 */
export default function WorkerSubmissionsPage({ worker }) {
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [campaignFilter, setCampaignFilter] = useState(ALL_CAMPAIGNS);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [pageData, setPageData] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

    const submissions = pageData?.content || [];

    useEffect(() => {
        if (!worker?.id) return;
        api.getMyOffers(worker.id)
            .then((offers) => setCampaigns((offers || []).map((o) => ({ id: o.id, title: o.title }))))
            .catch(() => setCampaigns([]));
    }, [worker?.id]);

    useEffect(() => {
        if (!worker?.id) return;
        const status = statusFilter === 'ALL' ? undefined : statusFilter;
        const campaignId = campaignFilter === ALL_CAMPAIGNS ? undefined : campaignFilter;
        api.getWorkerSubmissions(worker.id, status, campaignId, page, pageSize)
            .then((data) => { setPageData(data); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить ролики'));
    }, [worker?.id, statusFilter, campaignFilter, page, pageSize]);

    const handleStatusFilterChange = (key) => {
        setStatusFilter(key);
        setPage(0);
    };

    const handleCampaignFilterChange = (value) => {
        setCampaignFilter(value);
        setPage(0);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Мои ролики</h2>
                {pageData && (
                    <span className="text-xs bg-brand-border px-2 py-0.5 rounded-full text-slate-300 font-normal">
                        {pageData.totalElements}
                    </span>
                )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {STATUS_TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handleStatusFilterChange(key)}
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
                        onChange={(e) => handleCampaignFilterChange(e.target.value)}
                        className="w-full appearance-none bg-brand-card border border-brand-border rounded-xl pl-4 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                    >
                        <option value={ALL_CAMPAIGNS}>Все кампании</option>
                        {campaigns.map(({ id, title }) => (
                            <option key={id} value={id}>{title || `Оффер #${id}`}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            )}

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {pageData === null && !error ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка роликов...
                </div>
            ) : submissions.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    Ничего не найдено в этой категории.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {submissions.map((submission) => (
                        <SubmissionCard key={submission.id} submission={submission} />
                    ))}
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
        </div>
    );
}
