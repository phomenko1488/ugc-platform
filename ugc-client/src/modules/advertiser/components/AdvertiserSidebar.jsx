import React from 'react';
import { LayoutDashboard, Workflow, ShieldAlert, Wallet2, BarChart3, Users, SlidersHorizontal, X } from 'lucide-react';

// "Кампании" -> "Потоки" and "API" -> "Настройки" (access keys + webhooks live there, but the
// tab itself is never named after the word "API" per the product's terminology rule — see
// AdvertiserApiPage). Keys unchanged so nothing downstream (AdvertiserLayout's activePage
// switch) needs touching.
export const ADVERTISER_TABS = [
    { key: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { key: 'campaigns', label: 'Потоки', icon: Workflow },
    { key: 'creators', label: 'Криэйторы', icon: Users },
    { key: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { key: 'traffic', label: 'Трафик', icon: ShieldAlert },
    { key: 'billing', label: 'Выплаты', icon: Wallet2 },
    { key: 'api', label: 'Настройки', icon: SlidersHorizontal },
];

/**
 * Advertiser Cabinet's side nav. Persistent column on desktop; a slide-over drawer on mobile,
 * toggled by AdvertiserHeader's hamburger button (`open`/`onClose`).
 *
 * Active state reads as a left accent rule + tinted label rather than a filled pill — the
 * pill-button nav is the one pattern every generic dashboard template reaches for, and a quiet
 * rule in the margin fits the architectural-panel language ("Slate & Raw Terracotta") better
 * than another rounded, drop-shadowed block competing with the terracotta accent buttons above it.
 */
export default function AdvertiserSidebar({ activePage, onChangePage, open, onClose }) {
    const nav = (
        <nav className="space-y-0.5">
            {ADVERTISER_TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activePage === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChangePage(key)}
                        className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2.5 pl-3.5 pr-3 text-xs font-semibold transition-colors ${
                            isActive ? 'text-white' : 'text-slate-500 hover:text-slate-200'
                        }`}
                    >
                        <span
                            className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition-colors ${
                                isActive ? 'bg-brand-accent' : 'bg-transparent group-hover:bg-brand-border'
                            }`}
                        />
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-accent' : 'text-slate-600 group-hover:text-slate-400'}`} />
                        {label}
                    </button>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* Desktop persistent sidebar */}
            <aside className="hidden w-56 shrink-0 border-r border-brand-border bg-brand-card/40 px-3 py-6 lg:block">
                <div className="mb-5 px-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Кабинет рекламодателя
                </div>
                {nav}
            </aside>

            {/* Mobile drawer */}
            {open && (
                <div className="fixed inset-0 z-[90] lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <aside className="absolute inset-y-0 left-0 w-64 border-r border-brand-border bg-brand-card px-3 py-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between px-3.5">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                                Кабинет рекламодателя
                            </span>
                            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div onClick={onClose}>{nav}</div>
                    </aside>
                </div>
            )}
        </>
    );
}
