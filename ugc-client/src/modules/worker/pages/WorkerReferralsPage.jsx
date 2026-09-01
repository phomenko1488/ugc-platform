import React, { useEffect, useState } from 'react';
import { Users, Copy, Check, Gift, Eye, DollarSign } from 'lucide-react';
import { api } from '../../../api';
import WebApp from '@twa-dev/sdk';

// TODO: replace with the real bot username once it's known — this delivery only received the
// bot token, not its @username, so the referral link can't be generated for real yet.
const BOT_USERNAME = 'selika_bot';

function triggerHaptic() {
    try {
        WebApp.HapticFeedback?.notificationOccurred('success');
    } catch {
        // Not running inside Telegram — no-op.
    }
}

export default function WorkerReferralsPage({ worker }) {
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState(null); // null = loading, undefined = backend not available yet

    const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${worker?.affiliateTag || ''}`;

    useEffect(() => {
        if (!worker?.id) return;
        api.getReferralStats(worker.id)
            .then(setStats)
            .catch(() => setStats(undefined)); // Module 7 B2C hub backend not deployed yet.
    }, [worker?.id]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        triggerHaptic();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Реферальный хаб</h2>
            </div>

            <div className="bg-gradient-to-r from-brand-card via-brand-cardHover to-brand-card border border-brand-border p-5 rounded-2xl flex items-start gap-3">
                <Gift className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                    Получайте <b className="text-brand-accent">3% пожизненно</b> от всех выплат приглашенных вами клипперов.
                </p>
            </div>

            <div className="bg-brand-card border border-brand-border p-4 rounded-2xl space-y-2.5">
                <label className="block text-xs font-semibold text-slate-300">Ваша реферальная ссылка</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono truncate">
                        {referralLink}
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs transition-colors shrink-0"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Готово' : 'Копировать'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl text-center">
                    <Users className="w-4 h-4 text-brand-accent mx-auto mb-1.5" />
                    <div className="text-lg font-bold font-mono text-white">
                        {stats === null || stats === undefined ? '—' : stats.referralCount ?? 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">Рефералов</div>
                </div>
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl text-center">
                    <Eye className="w-4 h-4 text-brand-accent mx-auto mb-1.5" />
                    <div className="text-lg font-bold font-mono text-white">
                        {stats === null || stats === undefined ? '—' : Number(stats.totalReferredViews ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">Просмотров</div>
                </div>
                <div className="bg-brand-card border border-brand-border p-4 rounded-2xl text-center">
                    <DollarSign className="w-4 h-4 text-brand-success mx-auto mb-1.5" />
                    <div className="text-lg font-bold font-mono text-brand-success">
                        {stats === null || stats === undefined ? '—' : `$${Number(stats.totalReferralEarnings ?? 0).toFixed(2)}`}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">Заработано</div>
                </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">Приглашенные пользователи</h3>
                {stats === null && <div className="px-5 pb-5 text-xs text-slate-500">Загрузка...</div>}
                {stats === undefined && (
                    <div className="px-5 pb-5 text-xs text-slate-500">
                        Раздел рефералов пока недоступен — модуль партнерской программы ещё не подключен на бэкенде.
                    </div>
                )}
                {stats?.referrals?.length === 0 && (
                    <div className="px-5 pb-5 text-xs text-slate-500">Вы еще никого не пригласили.</div>
                )}
                {stats?.referrals?.length > 0 && (
                    <div className="divide-y divide-brand-border">
                        {stats.referrals.map((ref, idx) => (
                            <div key={ref.id ?? idx} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="text-xs font-semibold text-slate-200">@{ref.username}</div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString() : ''}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border uppercase ${
                                        ref.isActive
                                            ? 'text-brand-success bg-brand-success/10 border-brand-success/20'
                                            : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                                    }`}>
                                        {ref.isActive ? 'Активен' : 'Неактивен'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
