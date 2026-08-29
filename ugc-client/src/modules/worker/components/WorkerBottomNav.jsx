import React from 'react';
import { Flame, Film, Wallet, Users } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export const WORKER_TABS = [
    { key: 'offers', label: 'Офферы', icon: Flame },
    { key: 'submissions', label: 'Мои ролики', icon: Film },
    { key: 'wallet', label: 'Кошелек', icon: Wallet },
    { key: 'referrals', label: 'Рефералы', icon: Users },
];

function triggerHaptic() {
    try {
        WebApp.HapticFeedback?.selectionChanged();
    } catch {
        // Not running inside Telegram — no-op.
    }
}

/**
 * Fixed bottom tab bar for mobile / Telegram Mini App. Hidden on desktop, where
 * WorkerLayout renders the same 4 tabs inline instead.
 */
export default function WorkerBottomNav({ activePage, onChangePage }) {
    return (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-card/95 backdrop-blur border-t border-brand-border pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-4">
                {WORKER_TABS.map(({ key, label, icon: Icon }) => {
                    const isActive = activePage === key;
                    return (
                        <button
                            key={key}
                            onClick={() => { triggerHaptic(); onChangePage(key); }}
                            className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                                isActive ? 'text-brand-accent' : 'text-slate-500'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'fill-brand-accent/10' : ''}`} />
                            <span className="text-[10px] font-semibold">{label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
