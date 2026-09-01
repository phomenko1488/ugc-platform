import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, X, ZoomIn } from 'lucide-react';
import { api } from '../api';

export default function ModeratorCabinet({ queue, onRefresh }) {
    const [activeItem, setActiveItem] = useState(queue[0] || null);
    const [rejectReason, setRejectReason] = useState('Не обнаружен логотип бренда в видео');
    const [actionLoading, setActionLoading] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState(null);

    const handleApprove = async (id) => {
        try {
            setActionLoading(true);
            await api.approveSubmission(id, 'Одобрено модератором');
            alert('Ролик одобрен! Средства зачислены на баланс воркера.');
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id) => {
        try {
            setActionLoading(true);
            await api.rejectSubmission(id, rejectReason);
            alert('Ролик отклонен. Бюджет возвращен рекламодателю.');
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-accent" />
                    Очередь валидации видео
                    <span className="text-xs bg-brand-border px-2.5 py-0.5 rounded-full text-brand-accent font-mono font-bold">
            {queue.length}
          </span>
                </h2>
            </div>

            {queue.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-12 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-brand-success mx-auto" />
                    <h3 className="font-bold text-slate-200">Очередь чиста</h3>
                    <p className="text-slate-500 text-xs">Все поданные ролики проверены.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div className="lg:col-span-5 space-y-3">
                        {queue.map((item) => {
                            const isSelected = activeItem?.id === item.id;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setActiveItem(item)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-brand-cardHover border-brand-accent ring-1 ring-brand-accent/40'
                                            : 'bg-brand-card border-brand-border hover:bg-brand-cardHover/60'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-200">{item.offerTitle}</span>
                                        <span className="text-[11px] font-mono text-brand-success font-bold">
                      +${Number(item.holdAmount).toFixed(2)}
                    </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                                        {item.sourceUrl}
                                    </div>
                                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 font-mono">
                                        <span>Просмотры: <b className="text-slate-300">{Number(item.recordedViews).toLocaleString()}</b></span>
                                        <span>ER: <b className="text-brand-accent">{item.currentEngagementRate || '4.50'}%</b></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {activeItem && (
                        <div className="lg:col-span-7 bg-brand-card border border-brand-border p-6 rounded-2xl space-y-6 shadow-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-base text-white">{activeItem.offerTitle}</h3>
                                    <a
                                        href={activeItem.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-mono mt-1"
                                    >
                                        {activeItem.sourceUrl}
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">Сумма к выплате:</div>
                                    <div className="text-xl font-bold font-mono text-brand-success">
                                        ${Number(activeItem.holdAmount).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Просмотры</div>
                                    <div className="text-sm font-bold font-mono text-white mt-0.5">
                                        {Number(activeItem.recordedViews).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Лайки</div>
                                    <div className="text-sm font-bold font-mono text-white mt-0.5">
                                        {Number(activeItem.recordedLikes || 4500).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Вовлеченность ER</div>
                                    <div className="text-sm font-bold font-mono text-brand-accent mt-0.5">
                                        {activeItem.currentEngagementRate || '4.50'}%
                                    </div>
                                </div>
                            </div>

                            {activeItem.analyticsProofAssetUrl && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-300 mb-2">Скриншот ГЕО аналитики:</div>
                                    <button
                                        type="button"
                                        onClick={() => setZoomImageUrl(activeItem.analyticsProofAssetUrl)}
                                        className="relative group w-full block"
                                    >
                                        <img
                                            src={activeItem.analyticsProofAssetUrl}
                                            alt="Analytics proof"
                                            className="rounded-xl border border-brand-border max-h-48 w-full object-cover"
                                        />
                                        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-brand-border space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Причина отклонения (при Reject)</label>
                                    <input
                                        type="text"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleApprove(activeItem.id)}
                                        disabled={actionLoading}
                                        className="bg-brand-success hover:bg-brand-success/85 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-success/10 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Одобрить выплату
                                    </button>

                                    <button
                                        onClick={() => handleReject(activeItem.id)}
                                        disabled={actionLoading}
                                        className="bg-brand-danger hover:bg-brand-danger/85 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-danger/10 flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Отклонить
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            )}

            {zoomImageUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setZoomImageUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setZoomImageUrl(null)}
                        className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={zoomImageUrl}
                        alt="Analytics proof (full size)"
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full rounded-xl border border-white/10 object-contain cursor-zoom-out"
                    />
                </div>
            )}

        </div>
    );
}