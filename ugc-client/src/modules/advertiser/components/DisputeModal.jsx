import React, { useState } from 'react';
import { X, ShieldAlert, Loader2 } from 'lucide-react';
import { api } from '../../../api';

const DISPUTE_CATEGORIES = [
    'Фрод/Накрутка',
    'Нарушение ТЗ',
    'Нецелевое ГЕО',
    'Другое',
];

/**
 * Traffic Inspector's "Оспорить" flow — an advertiser flags a submission as suspicious instead
 * of waiting on the normal moderation queue. Moves the submission to DISPUTED on the backend,
 * pending a moderator's approve/reject decision.
 */
export default function DisputeModal({ advertiser, submission, onClose, onDisputed }) {
    const [category, setCategory] = useState(DISPUTE_CATEGORIES[0]);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            setSubmitting(true);
            await api.disputeSubmission(submission.id, advertiser.id, category, comment.trim() || null);
            onDisputed?.();
        } catch (err) {
            setError(err.message || 'Не удалось отправить спор');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-brand-card border border-brand-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
                <div className="px-5 py-4 flex items-center justify-between border-b border-brand-border">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-brand-danger" />
                        <div>
                            <div className="text-xs text-slate-400">Оспорить заявку</div>
                            <div className="text-sm font-bold text-white truncate max-w-[220px]">{submission?.offerTitle}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {submission?.sourceUrl && (
                        <a
                            href={submission.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-brand-accent hover:underline font-mono truncate"
                        >
                            {submission.sourceUrl}
                        </a>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Причина спора</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DISPUTE_CATEGORIES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCategory(c)}
                                    className={`text-xs px-3 py-2 rounded-lg border font-semibold transition-colors ${
                                        category === c
                                            ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/40'
                                            : 'bg-brand-bg text-slate-400 border-brand-border hover:border-brand-danger/30'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Комментарий (необязательно)</label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Опишите, что именно вызывает подозрение..."
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-danger/40 resize-none"
                        />
                    </div>

                    <p className="text-[11px] text-slate-500">
                        Заявка будет переведена в статус «Оспорено» и приостановлена до решения модератора.
                    </p>

                    {error && (
                        <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-brand-danger hover:bg-red-600 disabled:opacity-40 text-white font-bold text-xs py-3 rounded-xl transition-all"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        {submitting ? 'Отправка...' : 'Отправить на пересмотр'}
                    </button>
                </form>
            </div>
        </div>
    );
}
