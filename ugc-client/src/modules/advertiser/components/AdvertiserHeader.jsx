import React from 'react';
import { Menu, RefreshCw, LogOut, Workflow, PlusCircle } from 'lucide-react';

/**
 * Advertiser Cabinet top bar: mobile sidebar toggle, identity, Available/In-offers balances
 * (from the dashboard summary AdvertiserLayout fetches once and shares with every page), and the
 * "+ Запустить поток" button that opens OfferWizardModal from anywhere in the cabinet.
 */
export default function AdvertiserHeader({ advertiser, dashboard, onOpenSidebar, onRefresh, onLogout, onCreateCampaign }) {
    const available = dashboard?.availableBalance ?? advertiser?.availableBalance ?? 0;
    const inOffers = dashboard?.activeOffersBudgetTotal ?? 0;

    return (
        <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-card/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        onClick={onOpenSidebar}
                        className="-ml-1 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                        <Workflow className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-ash">{advertiser?.username || 'Рекламодатель'}</div>
                        <div className="truncate text-[10px] text-slate-500">{advertiser?.email}</div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden items-center gap-3 rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2 sm:flex">
                        <div className="text-right">
                            <div className="font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.06em] text-slate-500">Доступно</div>
                            <div className="mt-1 font-mono text-xs font-bold leading-none text-brand-success">
                                ${Number(available).toFixed(2)}
                            </div>
                        </div>
                        <div className="h-6 w-px bg-brand-border" />
                        <div className="text-right">
                            <div className="font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.06em] text-slate-500">В потоках</div>
                            <div className="mt-1 font-mono text-xs font-bold leading-none text-brand-accent">
                                ${Number(inOffers).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onCreateCampaign}
                        className="hidden items-center gap-1.5 rounded-lg bg-brand-accent px-3.5 py-2 text-xs font-bold text-brand-bg transition-colors hover:bg-brand-accentHover sm:flex"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Запустить поток
                    </button>
                    <button
                        onClick={onCreateCampaign}
                        title="Запустить поток"
                        className="rounded-lg bg-brand-accent p-2 text-brand-bg sm:hidden"
                    >
                        <PlusCircle className="h-4 w-4" />
                    </button>

                    <button
                        onClick={onRefresh}
                        title="Обновить"
                        className="rounded-lg border border-brand-border bg-brand-bg/50 p-2 text-slate-400 transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onLogout}
                        title="Выйти"
                        className="rounded-lg border border-brand-border bg-brand-bg/50 p-2 text-slate-400 transition-colors hover:border-brand-danger/40 hover:text-brand-danger"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Mobile-only balance strip */}
            <div className="-mt-1 flex items-center gap-2 px-4 pb-3 sm:hidden">
                <div className="flex-1 rounded-lg border border-brand-success/20 bg-brand-success/10 px-3 py-1.5 text-center">
                    <div className="font-mono text-[9px] font-semibold uppercase text-brand-success/80">Доступно</div>
                    <div className="font-mono text-xs font-bold text-brand-success">${Number(available).toFixed(2)}</div>
                </div>
                <div className="flex-1 rounded-lg border border-brand-accent/20 bg-brand-accent/10 px-3 py-1.5 text-center">
                    <div className="font-mono text-[9px] font-semibold uppercase text-brand-accent/80">В потоках</div>
                    <div className="font-mono text-xs font-bold text-brand-accent">${Number(inOffers).toFixed(2)}</div>
                </div>
            </div>
        </header>
    );
}
