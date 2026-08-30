import React, { useEffect, useState } from 'react';
import { Wallet, Send, ExternalLink, Loader2, Eye, Building2 } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

const TRC20_REGEX = /^T[A-Za-z1-9]{33}$/;
const MIN_PAYOUT = 20;

/**
 * Partner wallet — balance, TRC-20 payout address, payout request, and the ledger statement
 * narrowed to this partner's own B2B_PARTNER_COMMISSION rows (a partner's ledger shouldn't
 * realistically contain anything else, but the filter is explicit rather than assumed, same
 * defensiveness as PartnerAnalyticsServiceImpl's own filtering server-side).
 */
export default function PartnerWalletPage({ partner, onBalanceChanged }) {
    const [walletInput, setWalletInput] = useState(partner?.trc20Wallet || '');
    const [savingWallet, setSavingWallet] = useState(false);
    const [walletMessage, setWalletMessage] = useState(null);

    const [amount, setAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [payoutError, setPayoutError] = useState(null);
    const [payoutSuccess, setPayoutSuccess] = useState(null);

    // null = loading, undefined = unavailable, PageResponseDTO once loaded.
    const [ledgerPage, setLedgerPage] = useState(null);
    const [ledgerPageNum, setLedgerPageNum] = useState(0);
    const [ledgerPageSize, setLedgerPageSize] = useState(20);

    const ledger = ledgerPage === null ? null : ledgerPage === undefined ? undefined : ledgerPage.content;

    useEffect(() => {
        if (!partner?.id) return;
        api.getFinancialLedger(partner.id, ledgerPageNum, ledgerPageSize).then(setLedgerPage).catch(() => setLedgerPage(undefined));
    }, [partner?.id, ledgerPageNum, ledgerPageSize]);

    // A partner's ledger rows are already scoped server-side to their own user id, and the only
    // entry type ever recorded against a partner is B2B_PARTNER_COMMISSION — this filter is
    // defensive rather than a real narrowing, so it stays a no-op against the paginated page's
    // totals in practice (see the class comment above).
    const commissionEntries = Array.isArray(ledger)
        ? ledger.filter((entry) => (entry.type || entry.entryType) === 'B2B_PARTNER_COMMISSION')
        : ledger;

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
            await api.updateWallet(partner.id, walletInput.trim());
            setWalletMessage({ type: 'success', text: 'Адрес кошелька сохранен' });
            onBalanceChanged?.();
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
        if (numericAmount > Number(partner?.availableBalance || 0)) {
            setPayoutError('Сумма превышает доступный баланс');
            return;
        }

        try {
            setRequesting(true);
            await api.requestPayout(partner.id, numericAmount, walletInput.trim());
            setPayoutSuccess('Заявка на вывод создана и отправлена на обработку');
            setAmount('');
            onBalanceChanged?.();
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
                <h2 className="text-base font-bold text-white">Кошелек и выплаты</h2>
            </div>

            <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Доступный баланс</div>
                <div className="text-2xl font-bold font-mono text-brand-success mt-1">
                    ${Number(partner?.availableBalance || 0).toFixed(2)}
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
                <h3 className="text-sm font-bold text-white">Заказать выплату</h3>
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
                        {requesting ? 'Отправка...' : 'Заказать выплату'}
                    </button>
                </form>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">Выписка по комиссиям (B2B_PARTNER_COMMISSION)</h3>
                {commissionEntries === null && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>
                )}
                {commissionEntries === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Выписка пока недоступна.</div>
                )}
                {Array.isArray(commissionEntries) && commissionEntries.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Начислений пока не было.</div>
                )}
                {Array.isArray(commissionEntries) && commissionEntries.length > 0 && (
                    <div className="divide-y divide-brand-border">
                        {commissionEntries.map((entry) => (
                            <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3 text-slate-500" />
                                        {entry.offerTitle || 'Комиссия'}
                                    </div>
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
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-mono mt-1">
                                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                                    </div>
                                </div>
                                <div className="shrink-0 text-xs font-mono font-bold px-2 py-1 rounded-lg border text-brand-success bg-brand-success/10 border-brand-success/20">
                                    +${Number(entry.amount).toFixed(2)}
                                </div>
                            </div>
                        ))}
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
