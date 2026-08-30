import React, { useState } from 'react';
import { Menu, RefreshCw, LogOut, Building2, Copy, Check } from 'lucide-react';

/**
 * Partner Cabinet top bar: mobile sidebar toggle, identity, the partner's own affiliate tag
 * (copy-to-clipboard in one click — this is the tag brands attach to when they sign up through
 * the partner's referral link), available balance, refresh and logout.
 */
export default function PartnerHeader({ partner, dashboard, onOpenSidebar, onRefresh, onLogout }) {
    const [copied, setCopied] = useState(false);
    const available = dashboard?.availableBalance ?? partner?.availableBalance ?? 0;

    const handleCopyTag = () => {
        if (!partner?.affiliateTag) return;
        navigator.clipboard.writeText(`#${partner.affiliateTag}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">{partner?.username || 'Партнер'}</div>
                        <button
                            onClick={handleCopyTag}
                            className="flex items-center gap-1 text-[10px] text-brand-accent hover:underline font-mono"
                        >
                            #{partner?.affiliateTag || 'prt_none'}
                            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3 py-1.5">
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold leading-none">Доступно</div>
                            <div className="text-xs font-mono font-bold text-brand-success leading-tight">
                                ${Number(available).toFixed(2)}
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

            {/* Mobile-only balance strip */}
            <div className="sm:hidden flex items-center gap-2 px-4 pb-3 -mt-1">
                <div className="flex-1 bg-brand-success/10 border border-brand-success/20 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[9px] text-brand-success/80 uppercase font-semibold">Доступно</div>
                    <div className="text-xs font-mono font-bold text-brand-success">${Number(available).toFixed(2)}</div>
                </div>
            </div>
        </header>
    );
}
