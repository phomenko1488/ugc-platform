import React, { useEffect, useState } from 'react';
import { Loader2, Clock, RotateCw, CheckCircle2, XCircle, ExternalLink, Send, X } from 'lucide-react';
import { api } from '../../../api';
import PayoutProcessModal from '../components/PayoutProcessModal';
import Pagination from '../../../components/Pagination';
import { maskHash, maskWallet } from '../../../utils/mask';

const STATUS_TABS = [
    { key: null, label: 'Все' },
    { key: 'PENDING', label: 'Ожидают обработки' },
    { key: 'PROCESSING', label: 'В процессе' },
    { key: 'COMPLETED', label: 'Выплачено' },
    { key: 'REJECTED', label: 'Отклонено' },
];

const STATUS_META = {
    PENDING: { label: 'PENDING', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock },
    PROCESSING: { label: 'PROCESSING', className: 'text-brand-info bg-brand-info/10 border-brand-info/20', icon: RotateCw },
    COMPLETED: { label: 'COMPLETED', className: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle2 },
    REJECTED: { label: 'REJECTED', className: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20', icon: XCircle },
};

const TABLE_HEAD_CLASS = 'px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500';

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
                <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card">
                    <table className="w-full min-w-[860px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-brand-border">
                                <th className={TABLE_HEAD_CLASS}>Пользователь</th>
                                <th className={TABLE_HEAD_CLASS}>Кошелёк</th>
                                <th className={TABLE_HEAD_CLASS}>Создана</th>
                                <th className={`${TABLE_HEAD_CLASS} text-right`}>Сумма</th>
                                <th className={TABLE_HEAD_CLASS}>Статус</th>
                                <th className={TABLE_HEAD_CLASS}>TxID</th>
                                <th className={`${TABLE_HEAD_CLASS} text-right`}>Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {payouts.map((p) => {
                                const meta = STATUS_META[p.status] || STATUS_META.PENDING;
                                const StatusIcon = meta.icon;
                                const isBusy = busyId === p.id;
                                return (
                                    <React.Fragment key={p.id}>
                                        <tr className="transition-colors hover:bg-brand-cardHover/60">
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-xs font-bold text-ash">{p.username || `#${p.userId}`}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div
                                                    title="Адрес кошелька замаскирован"
                                                    className="whitespace-nowrap font-mono text-[11px] text-slate-400"
                                                >
                                                    {maskWallet(p.trc20Wallet)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <div className="whitespace-nowrap font-mono text-sm font-bold text-ash">
                                                    ${Number(p.amount).toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${meta.className}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {p.txHash ? (
                                                    <a
                                                        href={`https://tronscan.org/#/transaction/${p.txHash}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Хэш транзакции замаскирован — полный адрес открывается по ссылке"
                                                        className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] text-brand-accent hover:underline"
                                                    >
                                                        {maskHash(p.txHash)}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span className="font-mono text-[11px] text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    {p.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleProcess(p)}
                                                            disabled={isBusy}
                                                            className="whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand-info/10 text-brand-info border border-brand-info/30 hover:bg-brand-info/20 disabled:opacity-40"
                                                        >
                                                            В обработку
                                                        </button>
                                                    )}
                                                    {(p.status === 'PENDING' || p.status === 'PROCESSING') && (
                                                        <>
                                                            <button
                                                                onClick={() => setCompletingPayout(p)}
                                                                disabled={isBusy}
                                                                className="flex items-center gap-1 whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand-success/10 text-brand-success border border-brand-success/30 hover:bg-brand-success/20 disabled:opacity-40"
                                                            >
                                                                <Send className="w-3 h-3" /> Выплатить
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                                                                disabled={isBusy}
                                                                className="flex items-center gap-1 whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-lg bg-brand-danger/10 text-brand-danger border border-brand-danger/30 hover:bg-brand-danger/20 disabled:opacity-40"
                                                            >
                                                                <X className="w-3 h-3" /> Отклонить
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {rejectingId === p.id && (
                                            <tr>
                                                <td colSpan={7} className="bg-brand-bg/60 px-4 py-3">
                                                    <div className="flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-bg p-3 sm:flex-row">
                                                        <input
                                                            type="text"
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                            className="flex-1 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                                                        />
                                                        <button
                                                            onClick={() => handleReject(p.id)}
                                                            disabled={isBusy}
                                                            className="whitespace-nowrap rounded-lg bg-brand-danger px-4 py-2 text-xs font-bold text-white hover:bg-brand-danger/85 disabled:opacity-40"
                                                        >
                                                            {isBusy ? 'Отклонение...' : 'Отклонить и вернуть на баланс'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
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
