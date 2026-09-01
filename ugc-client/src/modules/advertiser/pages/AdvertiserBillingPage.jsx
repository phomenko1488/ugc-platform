import React, { useEffect, useState } from 'react';
import { Wallet2, Send, Loader2, ExternalLink, Eye, Copy, Check, QrCode } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

const LEDGER_TYPE_LABELS = {
    WORKER_PAYOUT: 'Выплата воркеру',
    B2C_REFERRAL_COMMISSION: 'Реферальная комиссия',
    B2B_PARTNER_COMMISSION: 'Партнёрская комиссия',
    PLATFORM_NET_PROFIT: 'Чистая прибыль платформы',
    ADVERTISER_DEPOSIT: 'Пополнение баланса',
    WORKER_WITHDRAWAL: 'Вывод средств воркером',
    ADVERTISER_BUDGET_REFUND: 'Возврат бюджета потока',
};

// No real payment gateway is wired up yet — this is a fixed demo deposit address so the top-up
// flow has something to display/copy, purely for the simulated USDT TRC-20 top-up UX.
const DEMO_DEPOSIT_ADDRESS = 'TDemoUGCFlowEscrowAddr000000000X';

const TABLE_HEAD_CLASS = 'px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500';

/**
 * "Выплаты" — escrow balance, a simulated USDT TRC-20 top-up (no real payment rail exists
 * yet; it just credits availableBalance and records an ADVERTISER_DEPOSIT ledger entry), and the
 * full financial ledger statement as a real table (type, поток, просмотры, дата, сумма) instead
 * of a stacked card list — matching the "финансовые таблицы... с чистой сеткой" requirement, and
 * the same table language AdminPayoutsPage already uses for the platform's other financial view.
 */
export default function AdvertiserBillingPage({ advertiser, onBalanceChanged }) {
    const [amount, setAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [depositError, setDepositError] = useState(null);
    const [depositSuccess, setDepositSuccess] = useState(null);
    const [copied, setCopied] = useState(false);
    // null = loading, undefined = unavailable, PageResponseDTO once loaded (same tri-state
    // convention this page always used, now carrying a page object instead of a bare array).
    const [ledgerPage, setLedgerPage] = useState(null);
    const [ledgerPageNum, setLedgerPageNum] = useState(0);
    const [ledgerPageSize, setLedgerPageSize] = useState(20);

    // Kept as three distinct states (not just `ledgerPage?.content`, which would collapse
    // "loading" and "unavailable" into the same `undefined`) so the tri-state render below
    // still tells them apart.
    const ledger = ledgerPage === null ? null : ledgerPage === undefined ? undefined : ledgerPage.content;

    const loadLedger = () => {
        if (!advertiser?.id) return;
        api.getFinancialLedger(advertiser.id, ledgerPageNum, ledgerPageSize).then(setLedgerPage).catch(() => setLedgerPage(undefined));
    };

    useEffect(loadLedger, [advertiser?.id, ledgerPageNum, ledgerPageSize]);

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(DEMO_DEPOSIT_ADDRESS);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        setDepositError(null);
        setDepositSuccess(null);

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            setDepositError('Укажите сумму больше 0');
            return;
        }

        try {
            setDepositing(true);
            await api.depositToAdvertiserBalance(advertiser.id, numericAmount);
            setDepositSuccess(`Баланс пополнен на $${numericAmount.toFixed(2)}`);
            setAmount('');
            onBalanceChanged?.();
            loadLedger();
        } catch (err) {
            setDepositError(err.message || 'Не удалось пополнить баланс');
        } finally {
            setDepositing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl uppercase tracking-tight text-ash">Выплаты</h1>
                <p className="mt-1 text-xs text-slate-500">Баланс эскроу, пополнение и полная выписка по счёту.</p>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-brand-border bg-brand-border sm:grid-cols-2">
                <div className="bg-brand-card p-5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        <Wallet2 className="h-3 w-3" /> Доступный баланс (Escrow)
                    </div>
                    <div className="mt-2 font-mono text-2xl font-bold text-brand-success">
                        ${Number(advertiser?.availableBalance || 0).toFixed(2)}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 bg-brand-card p-5">
                    <div className="min-w-0">
                        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Адрес для пополнения (USDT TRC-20)</div>
                        <div className="mt-1.5 truncate font-mono text-[11px] text-slate-300">{DEMO_DEPOSIT_ADDRESS}</div>
                    </div>
                    <button
                        onClick={handleCopyAddress}
                        className="shrink-0 rounded-lg border border-brand-border p-2 text-slate-400 transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-brand-border bg-brand-card p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-ash">
                    <QrCode className="h-4 w-4 text-brand-accent" />
                    Пополнить баланс
                </div>
                <p className="text-[11px] text-slate-500">
                    Демо-режим: реальный платёжный шлюз ещё не подключен. Введите сумму ниже, чтобы симулировать поступление средств на баланс.
                </p>

                <form onSubmit={handleDeposit} className="flex flex-col gap-2 sm:flex-row">
                    <input
                        type="number"
                        step="10"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Сумма ($)"
                        className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 font-mono text-xs text-white focus:border-brand-accent focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={depositing}
                        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-accent px-4 py-2.5 text-xs font-bold text-brand-bg transition-colors hover:bg-brand-accentHover disabled:opacity-40"
                    >
                        {depositing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {depositing ? 'Обработка...' : 'Пополнить'}
                    </button>
                </form>
                {depositError && <p className="text-[11px] text-brand-danger">{depositError}</p>}
                {depositSuccess && <p className="text-[11px] text-brand-success">{depositSuccess}</p>}
            </div>

            <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card">
                <h3 className="px-5 pb-3 pt-5 text-sm font-bold text-ash">Выписка по счёту</h3>
                {ledger === null && <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>}
                {ledger === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Выписка пока недоступна.</div>
                )}
                {Array.isArray(ledger) && ledger.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Проводок пока не было.</div>
                )}
                {Array.isArray(ledger) && ledger.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-brand-border">
                                    <th className={TABLE_HEAD_CLASS}>Операция</th>
                                    <th className={TABLE_HEAD_CLASS}>Дата</th>
                                    <th className={`${TABLE_HEAD_CLASS} text-right`}>Просмотры</th>
                                    <th className={`${TABLE_HEAD_CLASS} text-right`}>Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {ledger.map((entry) => {
                                    const typeKey = entry.type || entry.entryType;
                                    const typeLabel = LEDGER_TYPE_LABELS[typeKey] || typeKey;
                                    const isPositive = Number(entry.amount) >= 0;
                                    return (
                                        <tr key={entry.id} className="transition-colors hover:bg-brand-cardHover/60">
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-xs font-semibold text-slate-200">{typeLabel}</div>
                                                {entry.offerTitle && (
                                                    <div className="mt-0.5 truncate text-[11px] text-slate-400">{entry.offerTitle}</div>
                                                )}
                                                {entry.sourceUrl && (
                                                    <a
                                                        href={entry.sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 flex items-center gap-1 font-mono text-[10px] text-brand-accent hover:underline"
                                                    >
                                                        {entry.platformCode && <span className="uppercase">{entry.platformCode}</span>}
                                                        <ExternalLink className="h-2.5 w-2.5" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                {entry.recordedViews != null ? (
                                                    <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                        <Eye className="h-2.5 w-2.5" />
                                                        {Number(entry.recordedViews).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-[11px] text-slate-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <span
                                                    className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 font-mono text-xs font-bold ${
                                                        isPositive
                                                            ? 'border-brand-success/20 bg-brand-success/10 text-brand-success'
                                                            : 'border-brand-danger/20 bg-brand-danger/10 text-brand-danger'
                                                    }`}
                                                >
                                                    {isPositive ? '+' : ''}${Number(entry.amount).toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {ledgerPage && (
                    <div className="border-t border-brand-border px-2">
                        <Pagination
                            currentPage={ledgerPage.pageNumber}
                            totalPages={ledgerPage.totalPages}
                            totalElements={ledgerPage.totalElements}
                            pageSize={ledgerPageSize}
                            onPageChange={setLedgerPageNum}
                            onPageSizeChange={(size) => { setLedgerPageSize(size); setLedgerPageNum(0); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
