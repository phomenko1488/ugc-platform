import React from 'react';
import { Menu, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

/**
 * Admin Back-Office top bar: mobile sidebar toggle, super-admin identity, a compact liquidity
 * readout (platform net profit + pending payout queue, from the shared dashboard AdminLayout
 * fetches once) so the number that matters most is visible from every page, refresh and logout.
 */
export default function AdminHeader({ admin, dashboard, onOpenSidebar, onRefresh, onLogout }) {
    const netProfit = dashboard?.platformNetProfit ?? 0;
    const pendingCount = dashboard?.pendingPayoutsCount ?? 0;

    return (
        <header className="border-b border-brand-border bg-brand-card/90 backdrop-blur sticky top-0 z-40">
            <div className="px-4 h-16 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onOpenSidebar}
                        className="lg:hidden p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="h-9 w-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">{admin?.username || 'Администратор'}</div>
                        <div className="text-[10px] font-mono text-brand-accent">SUPER ADMIN</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3 py-1.5">
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold leading-none">Чистая прибыль</div>
                            <div className="text-xs font-mono font-bold text-brand-success leading-tight">
                                ${Number(netProfit).toFixed(2)}
                            </div>
                        </div>
                        <div className="w-px h-6 bg-brand-border" />
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold leading-none">Выплат в очереди</div>
                            <div className={`text-xs font-mono font-bold leading-tight ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                {pendingCount}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onRefresh}
                        title="Обновить"
                        className="p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 bg-brand-bg/50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onLogout}
                        title="Выйти"
                        className="p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-danger hover:border-brand-danger/40 bg-brand-bg/50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="sm:hidden flex items-center gap-2 px-4 pb-3 -mt-1">
                <div className="flex-1 bg-brand-success/10 border border-brand-success/20 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[9px] text-brand-success/80 uppercase font-semibold">Прибыль</div>
                    <div className="text-xs font-mono font-bold text-brand-success">${Number(netProfit).toFixed(2)}</div>
                </div>
                <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[9px] text-amber-400/80 uppercase font-semibold">В очереди</div>
                    <div className="text-xs font-mono font-bold text-amber-400">{pendingCount}</div>
                </div>
            </div>
        </header>
    );
}
