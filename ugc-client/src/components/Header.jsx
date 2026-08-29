import React from 'react';
import { Video, ShieldCheck, UserCheck, Briefcase, RefreshCw, LogOut } from 'lucide-react';

export default function Header({ activeUser, onRefresh, activeRole, onChangeRole, onLogout }) {
    return (
        <header className="border-b border-brand-border bg-brand-card/90 backdrop-blur sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-lg shadow-brand-accent/10">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-lg leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            UGC Flow
                        </div>
                        <div className="text-[11px] text-slate-400 tracking-wide font-medium">VIEW ESCROW ENGINE</div>
                    </div>
                </div>

                <div className="flex bg-brand-bg/80 border border-brand-border p-1 rounded-xl gap-1">
                    <button
                        onClick={() => onChangeRole('WORKER')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeRole === 'WORKER'
                                ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        Воркер (Нарезчик)
                    </button>

                    <button
                        onClick={() => onChangeRole('ADVERTISER')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeRole === 'ADVERTISER'
                                ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Briefcase className="w-3.5 h-3.5" />
                        Рекламодатель
                    </button>

                    <button
                        onClick={() => onChangeRole('MODERATOR')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeRole === 'MODERATOR'
                                ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Модератор
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        title="Обновить данные"
                        className="p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 bg-brand-bg/50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    {onLogout && (
                        <button
                            onClick={onLogout}
                            title="Выйти"
                            className="p-2 rounded-lg border border-brand-border text-slate-400 hover:text-brand-danger hover:border-brand-danger/40 bg-brand-bg/50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}

                    {activeUser && (
                        <div className="flex items-center gap-3 pl-3 border-l border-brand-border">
                            <div className="text-right">
                                <div className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1.5">
                                    {activeUser.username}
                                    {activeUser.affiliateTag && (
                                        <span className="text-[10px] bg-brand-accent/10 border border-brand-accent/30 text-brand-accent px-1.5 py-0.5 rounded font-mono font-bold">
                      #{activeUser.affiliateTag}
                    </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-brand-success font-semibold font-mono">
                    ${Number(activeUser.availableBalance || 0).toFixed(2)}
                  </span>
                                    {Number(activeUser.holdBalance) > 0 && (
                                        <span className="text-[10px] text-brand-warning bg-brand-warning/10 px-1 rounded font-mono">
                      Hold: ${Number(activeUser.holdBalance).toFixed(2)}
                    </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}