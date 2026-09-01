import React, { useState } from 'react';
import { X, Send, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../../../api';

/**
 * "Выплатить" action from AdminPayoutsPage — collects the Tron txHash and calls
 * POST /admin/payouts/{id}/complete. Kept as its own small modal (rather than inline in the row)
 * since a payout can't be marked COMPLETED without proof of the on-chain transfer.
 */
export default function PayoutProcessModal({ payout, onClose, onCompleted }) {
    const [txHash, setTxHash] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!txHash.trim()) {
            setError('Укажите хэш транзакции Tronscan');
            return;
        }
        try {
            setBusy(true);
            await api.completePayout(payout.id, txHash.trim());
            onCompleted?.();
        } catch (err) {
            setError(err.message || 'Не удалось подтвердить выплату');
        } finally {
            setBusy(false);
        }
    };

    if (!payout) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
                    <h3 className="text-sm font-bold text-white">Подтвердить выплату</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-semibold">Пользователь</div>
                            <div className="text-xs font-bold text-white mt-0.5">{payout.username || `#${payout.userId}`}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[220px]">{payout.trc20Wallet}</div>
                        </div>
                        <div className="text-lg font-bold font-mono text-brand-success">${Number(payout.amount).toFixed(2)}</div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Хэш транзакции (Tron)</label>
                        <input
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="0x... или base58 txid"
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                        />
                        <a
                            href="https://tronscan.org"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-brand-accent hover:underline"
                        >
                            Открыть Tronscan <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>

                    {error && (
                        <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full bg-brand-success hover:bg-brand-success/85 disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {busy ? 'Подтверждение...' : 'Подтвердить выплату'}
                    </button>
                </form>
            </div>
        </div>
    );
}
