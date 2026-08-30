import React from 'react';
import { ShieldCheck, RefreshCw, LogOut } from 'lucide-react';

export default function ModeratorHeader({ moderator, onRefresh, onLogout }) {
    return (
        <header className="border-b border-brand-border bg-brand-card/90 backdrop-blur sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">@{moderator?.username || 'Модератор'}</div>
                        <div className="text-[10px] font-mono text-brand-accent">MODERATION DESK</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onRefresh}
                        title="Обновить очередь"
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
        </header>
    );
}