import React, { useState } from 'react';
import { X, Ban, ShieldCheck, DollarSign, Percent, Loader2 } from 'lucide-react';
import { api } from '../../../api';

const COMMISSION_TYPE_LABELS = {
    PERCENT_OF_PLATFORM_MARGIN: '% от маржи платформы',
    PERCENT_OF_GROSS_TURNOVER: '% от оборота клиентов',
    FIXED_PER_QUALIFIED_MILLION: '$ за 1M просмотров',
};

/**
 * Edit-user drawer opened from AdminUsersPage — ban/unban, a manual balance correction
 * (POST .../balance-adjust, recorded as an ADMIN_BALANCE_ADJUSTMENT ledger row server-side), and,
 * only for a ROLE_PARTNER row, the B2B RevShare contract editor (PUT .../b2b-terms).
 */
export default function UserEditModal({ user, onClose, onSaved }) {
    const isPartner = user?.roles?.includes('ROLE_PARTNER');
    const isBanned = Boolean(user?.isBanned);

    const [banBusy, setBanBusy] = useState(false);
    const [banError, setBanError] = useState(null);

    const [amount, setAmount] = useState('');
    const [comment, setComment] = useState('');
    const [balanceBusy, setBalanceBusy] = useState(false);
    const [balanceError, setBalanceError] = useState(null);
    const [balanceSuccess, setBalanceSuccess] = useState(null);

    const [terms, setTerms] = useState(user?.b2bPartnerTerms || {
        commissionType: 'PERCENT_OF_PLATFORM_MARGIN',
        commissionRate: 20,
        isActive: true,
    });
    const [termsBusy, setTermsBusy] = useState(false);
    const [termsError, setTermsError] = useState(null);
    const [termsSuccess, setTermsSuccess] = useState(null);

    const handleToggleBan = async () => {
        setBanError(null);
        try {
            setBanBusy(true);
            await api.toggleUserBan(user.id, !isBanned);
            onSaved?.();
        } catch (err) {
            setBanError(err.message || 'Не удалось изменить статус блокировки');
        } finally {
            setBanBusy(false);
        }
    };

    const handleAdjustBalance = async (e) => {
        e.preventDefault();
        setBalanceError(null);
        setBalanceSuccess(null);
        const numericAmount = Number(amount);
        if (!numericAmount) {
            setBalanceError('Укажите ненулевую сумму (можно отрицательную)');
            return;
        }
        try {
            setBalanceBusy(true);
            await api.adjustUserBalance(user.id, numericAmount, comment);
            setBalanceSuccess('Баланс скорректирован');
            setAmount('');
            setComment('');
            onSaved?.();
        } catch (err) {
            setBalanceError(err.message || 'Не удалось скорректировать баланс');
        } finally {
            setBalanceBusy(false);
        }
    };

    const handleSaveTerms = async (e) => {
        e.preventDefault();
        setTermsError(null);
        setTermsSuccess(null);
        try {
            setTermsBusy(true);
            await api.updatePartnerTerms(user.id, {
                commissionType: terms.commissionType,
                commissionRate: Number(terms.commissionRate),
                isActive: Boolean(terms.isActive),
            });
            setTermsSuccess('Условия партнера обновлены');
            onSaved?.();
        } catch (err) {
            setTermsError(err.message || 'Не удалось обновить условия');
        } finally {
            setTermsBusy(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-brand-card">
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{user.username || `Пользователь #${user.id}`}</div>
                        <div className="text-[11px] text-slate-500 truncate">{user.email || user.affiliateTag}</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-bold text-white">{isBanned ? 'Аккаунт заблокирован' : 'Аккаунт активен'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                                {isBanned ? 'Разблокируйте, чтобы вернуть доступ.' : 'При бане воркера его активные холды аннулируются в пользу офферов.'}
                            </div>
                        </div>
                        <button
                            onClick={handleToggleBan}
                            disabled={banBusy}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 transition-colors ${
                                isBanned
                                    ? 'bg-brand-success/10 text-brand-success border border-brand-success/30 hover:bg-brand-success/20'
                                    : 'bg-brand-danger/10 text-brand-danger border border-brand-danger/30 hover:bg-brand-danger/20'
                            }`}
                        >
                            {banBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isBanned ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {isBanned ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                    </div>
                    {banError && <p className="text-[11px] text-brand-danger">{banError}</p>}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold">Баланс</div>
                            <div className="font-mono font-bold text-brand-success mt-1">${Number(user.availableBalance || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-brand-bg border border-brand-border rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold">В холде</div>
                            <div className="font-mono font-bold text-amber-400 mt-1">${Number(user.holdBalance || 0).toFixed(2)}</div>
                        </div>
                    </div>

                    <form onSubmit={handleAdjustBalance} className="space-y-2.5 border-t border-brand-border pt-4">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-brand-accent" />
                            Ручная корректировка баланса
                        </h4>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="+10.00 или -10.00"
                                className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                            />
                        </div>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Комментарий (необязательно)"
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                        />
                        {balanceError && <p className="text-[11px] text-brand-danger">{balanceError}</p>}
                        {balanceSuccess && <p className="text-[11px] text-brand-success">{balanceSuccess}</p>}
                        <button
                            type="submit"
                            disabled={balanceBusy}
                            className="w-full bg-brand-border hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                        >
                            {balanceBusy ? 'Применение...' : 'Применить корректировку'}
                        </button>
                    </form>

                    {isPartner && (
                        <form onSubmit={handleSaveTerms} className="space-y-2.5 border-t border-brand-border pt-4">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-brand-accent" />
                                Условия B2B RevShare
                            </h4>
                            <select
                                value={terms.commissionType}
                                onChange={(e) => setTerms((t) => ({ ...t, commissionType: e.target.value }))}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                            >
                                {Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                step="0.01"
                                value={terms.commissionRate}
                                onChange={(e) => setTerms((t) => ({ ...t, commissionRate: e.target.value }))}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                            />
                            <label className="flex items-center gap-2 text-[11px] text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={Boolean(terms.isActive)}
                                    onChange={(e) => setTerms((t) => ({ ...t, isActive: e.target.checked }))}
                                    className="accent-brand-accent"
                                />
                                Контракт активен (начисления идут)
                            </label>
                            {termsError && <p className="text-[11px] text-brand-danger">{termsError}</p>}
                            {termsSuccess && <p className="text-[11px] text-brand-success">{termsSuccess}</p>}
                            <button
                                type="submit"
                                disabled={termsBusy}
                                className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all"
                            >
                                {termsBusy ? 'Сохранение...' : 'Сохранить условия'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
