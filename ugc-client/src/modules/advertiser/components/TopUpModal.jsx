import React, { useState } from 'react';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import { api } from '../../../api';

/**
 * Quick campaign budget top-up — Campaign Detail Hub and the Campaigns table both open this for
 * a specific offer. Debits the advertiser's available balance and adds straight to the offer's
 * total/remaining budget via the existing OfferService.topUpOfferBudget.
 */
export default function TopUpModal({ advertiser, offer, onClose, onToppedUp }) {
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const numericAmount = Number(amount);
    const availableBalance = Number(advertiser?.availableBalance || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!numericAmount || numericAmount <= 0) {
            setError('Укажите сумму больше 0');
            return;
        }
        if (numericAmount > availableBalance) {
            setError('Сумма превышает доступный баланс');
            return;
        }

        try {
            setSubmitting(true);
            await api.topUpOfferBudget(offer.id, advertiser.id, numericAmount);
            onToppedUp?.();
        } catch (err) {
            setError(err.message || 'Не удалось пополнить бюджет кампании');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-brand-card border border-brand-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
                <div className="px-5 py-4 flex items-center justify-between border-b border-brand-border">
                    <div>
                        <div className="text-xs text-slate-400">Пополнить бюджет</div>
                        <div className="text-sm font-bold text-white truncate max-w-[240px]">{offer?.title}</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500">Доступно на балансе:</span>
                        <span className="text-brand-success font-bold">${availableBalance.toFixed(2)}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Сумма пополнения ($)</label>
                        <input
                            type="number"
                            autoFocus
                            step="10"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100.00"
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                        />
                    </div>

                    {error && (
                        <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        {submitting ? 'Пополнение...' : 'Пополнить'}
                    </button>
                </form>
            </div>
        </div>
    );
}
