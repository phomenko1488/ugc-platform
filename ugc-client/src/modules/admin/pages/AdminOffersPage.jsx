import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone, Pause, Play } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

/**
 * Platform-wide offer monitor — every offer regardless of advertiser, with a force pause/resume
 * toggle that bypasses the advertiser-ownership check the advertiser's own endpoint enforces (an
 * admin isn't impersonating the advertiser, they're overriding them). See AdminService.setOfferStatus.
 */
export default function AdminOffersPage({ onDataChanged }) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [pageData, setPageData] = useState(null);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const offers = pageData?.content || null;

    const load = () => {
        api.getAdminOffers(page, pageSize)
            .then((data) => { setPageData(data); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить офферы'));
    };

    useEffect(load, [page, pageSize]);

    const handleToggle = async (offer) => {
        try {
            setBusyId(offer.id);
            await api.adminSetOfferStatus(offer.id, !offer.isActive);
            load();
            onDataChanged?.();
        } catch (err) {
            alert(err.message || 'Не удалось изменить статус оффера');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Мониторинг офферов</h2>
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {offers === null && !error ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка офферов...
                </div>
            ) : offers.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    На платформе пока нет офферов.
                </div>
            ) : (
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                    <th className="text-left font-semibold px-5 py-3">Оффер</th>
                                    <th className="text-left font-semibold px-3 py-3">Рекламодатель</th>
                                    <th className="text-right font-semibold px-3 py-3">CPM (adv/wrk)</th>
                                    <th className="text-right font-semibold px-3 py-3">Бюджет</th>
                                    <th className="text-center font-semibold px-3 py-3">Статус</th>
                                    <th className="text-right font-semibold px-5 py-3"> </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {offers.map((o) => (
                                    <tr key={o.id} className="hover:bg-brand-cardHover/40">
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-slate-200 truncate max-w-[200px]">{o.title}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">#{o.id}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="text-slate-300 truncate max-w-[160px]">{o.advertiserUsername}</div>
                                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{o.advertiserEmail}</div>
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-slate-300">
                                            ${Number(o.advertiserCpmRate).toFixed(0)} / ${Number(o.workerCpmRate).toFixed(0)}
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-slate-300">
                                            ${Number(o.remainingBudget).toFixed(0)} / ${Number(o.totalBudget).toFixed(0)}
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            {o.isActive ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-brand-success bg-brand-success/10 border-brand-success/20">ACTIVE</span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-slate-400 bg-slate-500/10 border-slate-500/20">PAUSED</span>
                                            )}
                                        </td>
                                        <td className="text-right px-5 py-3">
                                            <button
                                                onClick={() => handleToggle(o)}
                                                disabled={busyId === o.id}
                                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
                                                    o.isActive
                                                        ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/30 hover:bg-brand-danger/20'
                                                        : 'bg-brand-success/10 text-brand-success border-brand-success/30 hover:bg-brand-success/20'
                                                }`}
                                            >
                                                {o.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                {o.isActive ? 'Пауза' : 'Возобновить'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
