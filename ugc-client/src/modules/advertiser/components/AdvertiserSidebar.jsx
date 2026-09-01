import React from 'react';
import { LayoutDashboard, Megaphone, ShieldAlert, Wallet2, BarChart3, Users, KeyRound, X } from 'lucide-react';

export const ADVERTISER_TABS = [
    { key: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { key: 'campaigns', label: 'Кампании', icon: Megaphone },
    { key: 'creators', label: 'Криэйторы', icon: Users },
    { key: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { key: 'traffic', label: 'Трафик', icon: ShieldAlert },
    { key: 'billing', label: 'Выплаты', icon: Wallet2 },
    { key: 'api', label: 'API', icon: KeyRound },
];

/**
 * Advertiser Cabinet's side nav. Persistent column on desktop; a slide-over drawer on mobile,
 * toggled by AdvertiserHeader's hamburger button (`open`/`onClose`).
 */
export default function AdvertiserSidebar({ activePage, onChangePage, open, onClose }) {
    const nav = (
        <nav className="space-y-1">
            {ADVERTISER_TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activePage === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChangePage(key)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                                ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* Desktop persistent sidebar */}
            <aside className="hidden lg:block w-56 shrink-0 border-r border-brand-border bg-brand-card/40 px-3 py-6">
                <div className="px-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Кабинет рекламодателя
                </div>
                {nav}
            </aside>

            {/* Mobile drawer */}
            {open && (
                <div className="lg:hidden fixed inset-0 z-[90]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-brand-card border-r border-brand-border px-3 py-6 shadow-2xl">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Кабинет рекламодателя
                            </span>
                            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div onClick={onClose}>{nav}</div>
                    </aside>
                </div>
            )}
        </>
    );
}
