import React from 'react';
import { LayoutDashboard, Users, Wallet2, Megaphone, Globe2, Settings, X } from 'lucide-react';

export const ADMIN_TABS = [
    { key: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { key: 'users', label: 'Пользователи', icon: Users },
    { key: 'payouts', label: 'Выплаты', icon: Wallet2 },
    { key: 'offers', label: 'Офферы', icon: Megaphone },
    { key: 'reference', label: 'Справочники', icon: Globe2 },
    { key: 'settings', label: 'Настройки', icon: Settings },
];

/**
 * Admin Back-Office side nav — same persistent-column/mobile-drawer shell as
 * AdvertiserSidebar/PartnerSidebar, just with the Back-Office's own six tabs.
 */
export default function AdminSidebar({ activePage, onChangePage, open, onClose }) {
    const nav = (
        <nav className="space-y-1">
            {ADMIN_TABS.map(({ key, label, icon: Icon }) => {
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
            <aside className="hidden lg:block w-56 shrink-0 border-r border-brand-border bg-brand-card/40 px-3 py-6">
                <div className="px-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Back-Office
                </div>
                {nav}
            </aside>

            {open && (
                <div className="lg:hidden fixed inset-0 z-[90]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-brand-card border-r border-brand-border px-3 py-6 shadow-2xl">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Back-Office</span>
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
