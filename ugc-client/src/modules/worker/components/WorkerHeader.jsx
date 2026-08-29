import React, { useState } from 'react';
import { Copy, Check, RefreshCw, LogOut, Video } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

function triggerHaptic(type = 'success') {
    try {
        WebApp.HapticFeedback?.notificationOccurred(type);
    } catch {
        // Not running inside Telegram — no-op.
    }
}

/**
 * Worker cabinet header: identity + affiliate tag (1-click copy) + Available/Hold balances.
 * Shared across desktop (renders the top nav tabs alongside it) and mobile (nav lives in
 * WorkerBottomNav instead, this header stays pinned above the page content).
 */
export default function WorkerHeader({ worker, onRefresh, onLogout }) {
    const [copied, setCopied] = useState(false);

    const handleCopyTag = () => {
        if (!worker?.affiliateTag) return;
        navigator.clipboard.writeText(`#${worker.affiliateTag}`);
        triggerHaptic('success');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <header className="border-b border-brand-border bg-brand-card/90 backdrop-blur sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                        <Video className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">@{worker?.username || 'worker'}</div>
                        <button
                            onClick={handleCopyTag}
                            className="flex items-center gap-1 text-[11px] font-mono font-bold text-brand-accent hover:text-brand-accentHover transition-colors"
                        >
                            #{worker?.affiliateTag || 'wrk_none'}
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3 py-1.5">
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold leading-none">Доступно</div>
                            <div className="text-xs font-mono font-bold text-brand-success leading-tight">
                                ${Number(worker?.availableBalance || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="w-px h-6 bg-brand-border" />
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase font-semibold leading-none">В холде</div>
                            <div className="text-xs font-mono font-bold text-brand-warning leading-tight">
                                ${Number(worker?.holdBalance || 0).toFixed(2)}
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

            {/* Mobile-only balance strip — desktop shows it inline above instead. */}
            <div className="sm:hidden flex items-center gap-2 px-4 pb-3 -mt-1">
                <div className="flex-1 bg-brand-success/10 border border-brand-success/20 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[9px] text-brand-success/80 uppercase font-semibold">Доступно</div>
                    <div className="text-xs font-mono font-bold text-brand-success">
                        ${Number(worker?.availableBalance || 0).toFixed(2)}
                    </div>
                </div>
                <div className="flex-1 bg-brand-warning/10 border border-brand-warning/20 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-[9px] text-brand-warning/80 uppercase font-semibold">В холде</div>
                    <div className="text-xs font-mono font-bold text-brand-warning">
                        ${Number(worker?.holdBalance || 0).toFixed(2)}
                    </div>
                </div>
            </div>
        </header>
    );
}
