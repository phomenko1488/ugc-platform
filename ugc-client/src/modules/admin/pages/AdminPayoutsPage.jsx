import React, { useEffect, useState } from 'react';
import { Loader2, Clock, RotateCw, CheckCircle2, XCircle, ExternalLink, Send, X } from 'lucide-react';
import { api } from '../../../api';
import PayoutProcessModal from '../components/PayoutProcessModal';
import Pagination from '../../../components/Pagination';

const STATUS_TABS = [
    { key: null, label: 'Все' },
    { key: 'PENDING', label: 'Ожидают обработки' },
    { key: 'PROCESSING', label: 'В процессе' },
    { key: 'COMPLETED', label: 'Выплачено' },
    { key: 'REJECTED', label: 'Отклонено' },
];

const STATUS_META = {
    PENDING: { label: 'PENDING', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock },
    PROCESSING: { label: 'PROCESSING', className: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: RotateCw },
    COMPLETED: { label: 'COMPLETED', className: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle2 },
    REJECTED: { label: 'REJECTED', className: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20', icon: XCircle },
};

export default function AdminPayoutsPage({ onDataChanged }) {
    const [statusTab, setStatusTab] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [pageData, setPageData] = useState(null);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [completingPayout, setCompletingPayout] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('Не прошла проверка');

    const payouts = pageData?.content || null;

    const load = () => {
        api.getAdminPayouts(statusTab, page, pageSize)
            .then((data) => { setPageData(data); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить заявки на выплату'));
    };

    useEffect(load, [statusTab, page, pageSize]);

    const handleStatusTabChange = (key) => {
        setStatusTab(key);
        setPage(0);
    };

    const handleProcess = async (payout) => {
        try {
            setBusyId(payout.id);
            await api.processPayout(payout.id);
            load();
            onDataChanged?.();
        } catch (err) {
            alert(err.message || 'Не удалось перевести заявку в обработку');
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (payoutId) => {
        try {
            setBusyId(payoutId);
            await api.rejectPayout(payoutId, rejectReason);
            setRejectingId(null);
            load();
            onDataChanged?.();
        } catch (err) {
            alert(err.message || 'Не удалось отклонить заявку');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.label}
                        onClick={() => handleStatusTabChange(tab.key)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${
                            statusTab === tab.key
                                ? 'bg-brand-accent text-brand-bg border-brand-accent shadow-md shadow-brand-accent/20'
                                : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {payouts === null && !error ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка заявок...
                </div>
            ) : payouts.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    Заявок не найдено.
                </div>
            ) : (
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden divide-y divide-brand-border">
                    {payouts.map((p) => {
                        const meta = STATUS_META[p.status] || STATUS_META.PENDING;
                        const StatusIcon = meta.icon;
                        const isBusy = busyId === p.id;
                        return (
                            <div key={p.id} className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white">{p.username || `#${p.userId}`}</div>
                                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[220px]">{p.trc20Wallet}</div>
                                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                                        </div>
                                    </div>
                                    <div className="text-base font-bold font-mono text-white">${Number(p.amount).toFixed(2)}</div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold border uppercase ${meta.className}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {meta.label}
                                        </span>
                                        {p.txHash && (
                                            <a
                                                href={`https://tronscan.org/#/transaction/${p.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-brand-accent hover:underline flex items-center gap-1 font-mono"
                                            >
                                                Tx <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {p.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleProcess(p)}
                                                disabled={isBusy}
                                                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40"
                                            >
                                                В обработку
                                            </button>
                                        )}
                                        {(p.status === 'PENDING' || p.status === 'PROCESSING') && (
                                            <>
                                                <button
                                                    onClick={() => setCompletingPayout(p)}
                                                    disabled={isBusy}
                                                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand-success/10 text-brand-success border border-brand-success/30 hover:bg-brand-success/20 disabled:opacity-40"
                                                >
                                                    <Send className="w-3 h-3" /> Выплатить
                                                </button>
                                                <button
                                                    onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                                                    disabled={isBusy}
                                                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand-danger/10 text-brand-danger border border-brand-danger/30 hover:bg-brand-danger/20 disabled:opacity-40"
                                                >
                                                    <X className="w-3 h-3" /> Отклонить
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {rejectingId === p.id && (
                                    <div className="mt-3 flex flex-col sm:flex-row gap-2 bg-brand-bg border border-brand-border rounded-xl p-3">
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            className="flex-1 bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                                        />
                                        <button
                                            onClick={() => handleReject(p.id)}
                                            disabled={isBusy}
                                            className="bg-brand-danger hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap"
                                        >
                                            {isBusy ? 'Отклонение...' : 'Отклонить и вернуть на баланс'}
                                        </button>
                                    </div>
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

            {completingPayout && (
                <PayoutProcessModal
                    payout={completingPayout}
                    onClose={() => setCompletingPayout(null)}
                    onCompleted={() => { setCompletingPayout(null); load(); onDataChanged?.(); }}
                />
            )}
        </div>
    );
}
