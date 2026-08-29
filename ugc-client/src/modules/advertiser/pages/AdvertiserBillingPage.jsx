import React, { useEffect, useState } from 'react';
import { Wallet2, Send, Loader2, ExternalLink, Eye, Copy, Check, QrCode } from 'lucide-react';
import { api } from '../../../api';

const LEDGER_TYPE_LABELS = {
    WORKER_PAYOUT: 'Выплата воркеру',
    B2C_REFERRAL_COMMISSION: 'Реферальная комиссия',
    B2B_PARTNER_COMMISSION: 'Партнёрская комиссия',
    PLATFORM_NET_PROFIT: 'Чистая прибыль платформы',
    ADVERTISER_DEPOSIT: 'Пополнение баланса',
    WORKER_WITHDRAWAL: 'Вывод средств воркером',
    ADVERTISER_BUDGET_REFUND: 'Возврат бюджета кампании',
};

// No real payment gateway is wired up yet — this is a fixed demo deposit address so the top-up
// flow has something to display/copy, purely for the simulated USDT TRC-20 top-up UX.
const DEMO_DEPOSIT_ADDRESS = 'TDemoUGCFlowEscrowAddr000000000X';

/**
 * Billing page — escrow balance, a simulated USDT TRC-20 top-up (no real payment rail exists
 * yet; it just credits availableBalance and records an ADVERTISER_DEPOSIT ledger entry), and the
 * full financial ledger statement (deposits, campaign refunds, etc.).
 */
export default function AdvertiserBillingPage({ advertiser, onBalanceChanged }) {
    const [amount, setAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [depositError, setDepositError] = useState(null);
    const [depositSuccess, setDepositSuccess] = useState(null);
    const [copied, setCopied] = useState(false);
    const [ledger, setLedger] = useState(null);

    const loadLedger = () => {
        if (!advertiser?.id) return;
        api.getFinancialLedger(advertiser.id).then(setLedger).catch(() => setLedger(undefined));
    };

    useEffect(loadLedger, [advertiser?.id]);

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
            <div className="flex items-center gap-2">
                <Wallet2 className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Биллинг</h2>
            </div>

            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Доступный баланс (Escrow)</div>
                <div className="text-2xl font-bold font-mono text-brand-success mt-1.5">
                    ${Number(advertiser?.availableBalance || 0).toFixed(2)}
                </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Пополнить баланс (USDT TRC-20)</h3>

                <div className="bg-brand-bg border border-brand-border rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                        <QrCode className="w-8 h-8 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold">Адрес для пополнения</div>
                            <div className="text-[11px] font-mono text-slate-300 truncate">{DEMO_DEPOSIT_ADDRESS}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleCopyAddress}
                        className="shrink-0 p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    Демо-режим: реальный платёжный шлюз ещё не подключен. Введите сумму ниже, чтобы симулировать поступление средств на баланс.
                </p>

                <form onSubmit={handleDeposit} className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="number"
                        step="10"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Сумма ($)"
                        className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                    />
                    <button
                        type="submit"
                        disabled={depositing}
                        className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
                    >
                        {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {depositing ? 'Обработка...' : 'Пополнить'}
                    </button>
                </form>
                {depositError && <p className="text-[11px] text-brand-danger">{depositError}</p>}
                {depositSuccess && <p className="text-[11px] text-brand-success">{depositSuccess}</p>}
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">Выписка по счёту</h3>
                {ledger === null && <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>}
                {ledger === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Выписка пока недоступна.</div>
                )}
                {Array.isArray(ledger) && ledger.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Проводок пока не было.</div>
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
                                        {entry.sourceUrl && (
                                            <a
                                                href={entry.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 font-mono mt-1"
                                            >
                                                {entry.platformCode && <span className="uppercase">{entry.platformCode}</span>}
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                        {entry.recordedViews != null && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-1">
                                                <Eye className="w-2.5 h-2.5" />
                                                {Number(entry.recordedViews).toLocaleString()}
                                            </span>
                                        )}
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
        </div>
    );
}
