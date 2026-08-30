import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Building2, Eye, DollarSign, Megaphone } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

const DEFAULT_PAGE_SIZE = 10;

/**
 * CRM view of every brand/casino attached to this partner (User.b2bPartner == this partner) —
 * server-side search by name/email (debounced) and server-side pagination via
 * api.getPartnerAdvertisers(partnerId, search, page, size), matching AdminUsersPage's pattern.
 */
export default function PartnerAdvertisersPage({ partner }) {
    const [advertisers, setAdvertisers] = useState(null); // null = loading
    const [page, setPage] = useState({ pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0 });
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');

    // No default params referencing `query`/`page` here — every call site passes them
    // explicitly, read live from state, to avoid the stale-closure pitfall.
    const load = useCallback((search, pageNumber, pageSize) => {
        if (!partner?.id) return;
        api.getPartnerAdvertisers(partner.id, search, pageNumber, pageSize)
            .then((result) => {
                setAdvertisers(result?.content || []);
                setPage({
                    pageNumber: result?.pageNumber ?? 0,
                    pageSize: result?.pageSize ?? pageSize,
                    totalElements: result?.totalElements ?? 0,
                    totalPages: result?.totalPages ?? 0,
                });
                setError(null);
            })
            .catch((err) => setError(err.message || 'Не удалось загрузить список брендов'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partner?.id]);

    useEffect(() => { load('', 0, DEFAULT_PAGE_SIZE); }, [partner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced server-side search — resets to page 0 on every query change, mirroring
    // AdminUsersPage.jsx's setTimeout(load, search ? 300 : 0) pattern.
    useEffect(() => {
        if (!partner?.id) return;
        const delay = query ? 300 : 0;
        const timer = setTimeout(() => load(query, 0, page.pageSize), delay);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, partner?.id]);

    const handlePageChange = (nextPage) => load(query, nextPage, page.pageSize);
    const handlePageSizeChange = (nextSize) => load(query, 0, nextSize);

    if (advertisers === null && !error) {
        return (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка брендов...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Мои бренды</h2>
                <div className="relative w-full max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по названию или email..."
                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {advertisers?.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    {query ? `Ничего не найдено по запросу «${query}».` : 'К вам пока не привязано ни одного бренда.'}
                </div>
            ) : (
                <>
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                    <th className="text-left font-semibold px-5 py-3">Бренд</th>
                                    <th className="text-right font-semibold px-3 py-3">Офферов</th>
                                    <th className="text-right font-semibold px-3 py-3">Просмотров</th>
                                    <th className="text-right font-semibold px-3 py-3">Расход бренда</th>
                                    <th className="text-right font-semibold px-5 py-3">Профит партнера</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {advertisers?.map((a) => (
                                    <tr key={a.id}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-slate-500 shrink-0">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-200 truncate">{a.username}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{a.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-slate-300">
                                            <span className="inline-flex items-center gap-1">
                                                <Megaphone className="w-3 h-3 text-slate-500" />
                                                {a.activeOffersCount}
                                            </span>
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-brand-accent">
                                            <span className="inline-flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {Number(a.totalDeliveredViews).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-slate-300">
                                            ${Number(a.totalSpent).toFixed(2)}
                                        </td>
                                        <td className="text-right px-5 py-3 font-mono font-bold text-brand-success">
                                            <span className="inline-flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                {Number(a.partnerEarnedFromThisAdvertiser).toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <Pagination
                    currentPage={page.pageNumber}
                    totalPages={page.totalPages}
                    totalElements={page.totalElements}
                    pageSize={page.pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
                </>
            )}
        </div>
    );
}
