import React, { useEffect, useState } from 'react';
import { Wallet, Send, ExternalLink, Loader2, CheckCircle2, Clock, XCircle, Eye, Film } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

const LEDGER_TYPE_LABELS = {
    WORKER_HOLD_ACCRUAL: 'Начисление в холд',
    WORKER_PAYOUT_SETTLEMENT: 'Выплата',
    PLATFORM_MARGIN_PROFIT: 'Маржа платформы',
    B2C_REFERRAL_PAYOUT: 'Реферальная выплата',
};

const TRC20_REGEX = /^T[A-Za-z1-9]{33}$/;
const MIN_PAYOUT = 20;

const PAYOUT_STATUS_META = {
    PENDING: { label: 'В очереди', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock },
    PROCESSING: { label: 'В обработке', className: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: Loader2 },
    COMPLETED: { label: 'Выполнено', className: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle2 },
    REJECTED: { label: 'Отклонено', className: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20', icon: XCircle },
};

export default function WorkerWalletPage({ worker, onRefresh }) {
    const [walletInput, setWalletInput] = useState(worker?.trc20Wallet || '');
    const [savingWallet, setSavingWallet] = useState(false);
    const [walletMessage, setWalletMessage] = useState(null);

    const [amount, setAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [payoutError, setPayoutError] = useState(null);
    const [payoutSuccess, setPayoutSuccess] = useState(null);

    // null = loading, undefined = unavailable, PageResponseDTO once loaded (same tri-state
    // convention this page always used, now carrying a page object instead of a bare array).
    const [payoutHistoryPage, setPayoutHistoryPage] = useState(null);
    const [payoutPageNum, setPayoutPageNum] = useState(0);
    const [payoutPageSize, setPayoutPageSize] = useState(10);

    const [ledgerPage, setLedgerPage] = useState(null);
    const [ledgerPageNum, setLedgerPageNum] = useState(0);
    const [ledgerPageSize, setLedgerPageSize] = useState(20);

    const payoutHistory = payoutHistoryPage === null ? null : payoutHistoryPage === undefined ? undefined : payoutHistoryPage.content;
    const ledger = ledgerPage === null ? null : ledgerPage === undefined ? undefined : ledgerPage.content;

    useEffect(() => {
        if (!worker?.id) return;
        api.getPayoutHistory(worker.id, payoutPageNum, payoutPageSize)
            .then(setPayoutHistoryPage)
            .catch(() => setPayoutHistoryPage(undefined)); // Degrade quietly on any fetch failure rather than crashing the page.
    }, [worker?.id, payoutPageNum, payoutPageSize]);

    useEffect(() => {
        if (!worker?.id) return;
        api.getFinancialLedger(worker.id, ledgerPageNum, ledgerPageSize)
            .then(setLedgerPage)
            .catch(() => setLedgerPage(undefined));
    }, [worker?.id, ledgerPageNum, ledgerPageSize]);

    // "Выплачено всего" — now scoped to the currently loaded page of payout history rather than
    // a true lifetime sum: the pagination initiative moved getPayoutHistory off a full flat array,
    // and the User entity has no running total-paid-out counter to sum against instead. A backend
    // aggregate would be needed for a true lifetime figure; flagged as a known trade-off.
    const totalPaidOut = Array.isArray(payoutHistory)
        ? payoutHistory.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : null;

    const walletIsValid = TRC20_REGEX.test(walletInput.trim());

    const handleSaveWallet = async (e) => {
        e.preventDefault();
        setWalletMessage(null);
        if (!walletIsValid) {
            setWalletMessage({ type: 'error', text: 'Адрес должен начинаться с T и содержать 34 символа' });
            return;
        }
        try {
            setSavingWallet(true);
            await api.updateTrc20Wallet(worker.id, walletInput.trim());
            setWalletMessage({ type: 'success', text: 'Адрес кошелька сохранен' });
            onRefresh?.();
        } catch (err) {
            setWalletMessage({ type: 'error', text: err.message || 'Не удалось сохранить адрес' });
        } finally {
            setSavingWallet(false);
        }
    };

    const handleRequestPayout = async (e) => {
        e.preventDefault();
        setPayoutError(null);
        setPayoutSuccess(null);

        const numericAmount = Number(amount);
        if (!walletIsValid) {
            setPayoutError('Сначала сохраните корректный TRC-20 адрес выше');
            return;
        }
        if (!numericAmount || numericAmount < MIN_PAYOUT) {
            setPayoutError(`Минимальная сумма вывода — $${MIN_PAYOUT.toFixed(2)}`);
            return;
        }
        if (numericAmount > Number(worker?.availableBalance || 0)) {
            setPayoutError('Сумма превышает доступный баланс');
            return;
        }

        try {
            setRequesting(true);
            await api.requestPayout(worker.id, numericAmount, walletInput.trim());
            setPayoutSuccess('Заявка на вывод создана и отправлена на обработку');
            setAmount('');
            onRefresh?.();
            setPayoutPageNum(0);
            api.getPayoutHistory(worker.id, 0, payoutPageSize).then(setPayoutHistoryPage).catch(() => {});
        } catch (err) {
            setPayoutError(err.message || 'Не удалось создать заявку на вывод');
        } finally {
            setRequesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Кошелек</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Доступно</div>
                    <div className="text-lg font-bold font-mono text-brand-success mt-1">
                        ${Number(worker?.availableBalance || 0).toFixed(2)}
                    </div>
                </div>
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">В холде</div>
                    <div className="text-lg font-bold font-mono text-brand-warning mt-1">
                        ${Number(worker?.holdBalance || 0).toFixed(2)}
                    </div>
                </div>
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Выплачено всего</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                        {totalPaidOut === null ? '—' : `$${totalPaidOut.toFixed(2)}`}
                    </div>
                </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Адрес USDT (TRC-20)</h3>
                <form onSubmit={handleSaveWallet} className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={walletInput}
                        onChange={(e) => setWalletInput(e.target.value)}
                        placeholder="T..."
                        className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                    />
                    <button
                        type="submit"
                        disabled={savingWallet}
                        className="bg-brand-border hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                    >
                        {savingWallet ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </form>
                {walletInput && !walletIsValid && (
                    <p className="text-[11px] text-amber-400">Формат: начинается с "T", всего 34 символа</p>
                )}
                {walletMessage && (
                    <p className={`text-[11px] ${walletMessage.type === 'error' ? 'text-brand-danger' : 'text-brand-success'}`}>
                        {walletMessage.text}
                    </p>
                )}
            </div>

            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Заказать вывод</h3>
                <form onSubmit={handleRequestPayout} className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Сумма ($)</label>
                        <input
                            type="number"
                            min={MIN_PAYOUT}
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`от $${MIN_PAYOUT.toFixed(2)}`}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                        />
                    </div>

                    {payoutError && (
                        <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                            {payoutError}
                        </div>
                    )}
                    {payoutSuccess && (
                        <div className="text-xs text-brand-success bg-brand-success/10 border border-brand-success/20 rounded-xl px-3 py-2">
                            {payoutSuccess}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={requesting}
                        className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {requesting ? 'Отправка...' : 'Заказать вывод'}
                    </button>
                </form>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">История выводов</h3>
                {payoutHistory === null && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>
                )}
                {payoutHistory === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">
                        История выводов пока недоступна — модуль выплат ещё не подключен на бэкенде.
                    </div>
                )}
                {Array.isArray(payoutHistory) && payoutHistory.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Заявок на вывод пока не было.</div>
                )}
                {Array.isArray(payoutHistory) && payoutHistory.length > 0 && (
                    <div className="divide-y divide-brand-border">
                        {payoutHistory.map((payout) => {
                            const meta = PAYOUT_STATUS_META[payout.status] || PAYOUT_STATUS_META.PENDING;
                            const StatusIcon = meta.icon;
                            return (
                                <div key={payout.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-mono font-bold text-white">${Number(payout.amount).toFixed(2)}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                            {payout.createdAt ? new Date(payout.createdAt).toLocaleString() : ''}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {payout.txHash && (
                                            <a
                                                href={`https://tronscan.org/#/transaction/${payout.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-brand-accent hover:underline flex items-center gap-1 font-mono"
                                            >
                                                Tronscan <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold border uppercase ${meta.className}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {meta.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {payoutHistoryPage && (
                <Pagination
                    currentPage={payoutHistoryPage.pageNumber}
                    totalPages={payoutHistoryPage.totalPages}
                    totalElements={payoutHistoryPage.totalElements}
                    pageSize={payoutPageSize}
                    onPageChange={setPayoutPageNum}
                    onPageSizeChange={(size) => { setPayoutPageSize(size); setPayoutPageNum(0); }}
                />
            )}

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">История начислений</h3>
                {ledger === null && <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>}
                {ledger === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">История начислений пока недоступна.</div>
                )}
                {Array.isArray(ledger) && ledger.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Начислений пока не было.</div>
                )}
                {Array.isArray(ledger) && ledger.length > 0 && (
                    <div className="divide-y divide-brand-border">
                        {ledger.map((entry) => {
                            const typeKey = entry.type || entry.entryType;
                            const typeLabel = LEDGER_TYPE_LABELS[typeKey] || typeKey;
                            const isPositive = Number(entry.amount) >= 0;
                            return (
                                <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs text-slate-200 font-semibold">{typeLabel}</div>
                                        {entry.offerTitle && (
                                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{entry.offerTitle}</div>
                                        )}
                                        <div className="flex items-center flex-wrap gap-2.5 mt-1">
                                            {entry.sourceUrl && (
                                                <a
                                                    href={entry.sourceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 font-mono"
                                                >
                                                    {entry.platformCode && <span className="uppercase">{entry.platformCode}</span>}
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                            {entry.recordedViews != null && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                                    <Eye className="w-2.5 h-2.5" />
                                                    {Number(entry.recordedViews).toLocaleString()}
                                                </span>
                                            )}
                                            {!entry.sourceUrl && entry.submissionId && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                                    <Film className="w-2.5 h-2.5" />
                                                    #{entry.submissionId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-600 font-mono mt-1">
                                            {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                                        </div>
                                    </div>
                                    <div className={`shrink-0 text-xs font-mono font-bold px-2 py-1 rounded-lg border ${
                                        isPositive
                                            ? 'text-brand-success bg-brand-success/10 border-brand-success/20'
                                            : 'text-brand-danger bg-brand-danger/10 border-brand-danger/20'
                                    }`}>
                                        {isPositive ? '+' : ''}${Number(entry.amount).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {ledgerPage && (
                <Pagination
                    currentPage={ledgerPage.pageNumber}
                    totalPages={ledgerPage.totalPages}
                    totalElements={ledgerPage.totalElements}
                    pageSize={ledgerPageSize}
                    onPageChange={setLedgerPageNum}
                    onPageSizeChange={(size) => { setLedgerPageSize(size); setLedgerPageNum(0); }}
                />
            )}
        </div>
    );
}
