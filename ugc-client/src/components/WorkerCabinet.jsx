import React, { useState } from 'react';
import { Send, Copy, Check, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api';
import FileUploader from './FileUploader';

export default function WorkerCabinet({ worker, offers, submissions, onRefresh }) {
    const [copied, setCopied] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        videoUrl: '',
        platformId: 1,
        declaredViews: 50000,
        screenshotAssetUrl: ''
    });

    const handleCopyTag = () => {
        if (worker?.affiliateTag) {
            navigator.clipboard.writeText(`#${worker.affiliateTag}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSubmitVideo = async (e) => {
        e.preventDefault();
        if (!selectedOffer) {
            alert('Сначала выберите оффер из каталога!');
            return;
        }

        try {
            setSubmitting(true);
            await api.submitVideo({
                workerId: worker.id,
                offerId: selectedOffer.id,
                platformId: Number(form.platformId),
                sourceUrl: form.videoUrl,
                declaredViews: Number(form.declaredViews),
                screenshotAssetUrl: form.screenshotAssetUrl || null
            });

            alert('Видео успешно принято на проверку!');
            setForm({ videoUrl: '', platformId: 1, declaredViews: 50000, screenshotAssetUrl: '' });
            setSelectedOffer(null);
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">

            <div className="bg-gradient-to-r from-brand-card via-brand-cardHover to-brand-card border border-brand-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-brand-accent text-sm font-semibold">
                        <Sparkles className="w-4 h-4" />
                        Ваш авторский маркер для видеороликов
                    </div>
                    <p className="text-slate-400 text-xs max-w-xl">
                        Обязательно вставляйте этот тег в описание ролика. Система сверяет его перед фиксацией выплаты.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-brand-bg px-4 py-2.5 rounded-xl border border-brand-border font-mono text-sm font-bold text-white tracking-wider">
                        #{worker?.affiliateTag || 'wrk_none'}
                    </div>
                    <button
                        onClick={handleCopyTag}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs transition-colors shadow-lg shadow-brand-accent/10"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Скопировано' : 'Копировать'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            Активные офферы рекламодателей
                            <span className="text-xs bg-brand-border px-2 py-0.5 rounded-full text-slate-300 font-normal">
                {offers.length}
              </span>
                        </h2>
                    </div>

                    <div className="grid gap-4">
                        {offers.map((offer) => {
                            const isSelected = selectedOffer?.id === offer.id;
                            return (
                                <div
                                    key={offer.id}
                                    onClick={() => setSelectedOffer(offer)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                        isSelected
                                            ? 'bg-brand-cardHover border-brand-accent ring-1 ring-brand-accent/50 shadow-lg shadow-brand-accent/5'
                                            : 'bg-brand-card border-brand-border hover:border-slate-700 hover:bg-brand-cardHover/60'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="font-bold text-slate-100 text-sm md:text-base">{offer.title}</h3>
                                            <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                                                {offer.requirementsDescription || 'Требования: разместить логотип бренда и ваш #aff_tag.'}
                                            </p>
                                        </div>
                                        <span className="bg-brand-success/10 text-brand-success text-xs font-bold font-mono px-2.5 py-1 rounded-lg border border-brand-success/20 shrink-0">
                      ${Number(offer.workerCpmRate).toFixed(2)} / 1M
                    </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-brand-border/60 text-[11px] text-slate-400">
                                        <span className="font-semibold text-slate-300">Платформы:</span>
                                        {offer.allowedPlatforms?.map((p) => (
                                            <span key={p.id} className="bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-300 font-medium">
                        {p.displayName}
                      </span>
                                        ))}
                                        <span className="text-slate-600">|</span>
                                        <span className="font-semibold text-slate-300">Порог:</span>
                                        <span className="text-brand-accent font-mono font-bold">{Number(offer.minViewsThreshold).toLocaleString()} views</span>
                                        <span className="text-slate-600">|</span>
                                        <span className="font-semibold text-slate-300">Холд:</span>
                                        <span className="text-amber-400 font-medium">{offer.holdPeriodDays} дн.</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        Сдать ролик на выплату
                    </h2>

                    <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-xl">
                        {selectedOffer ? (
                            <div className="mb-5 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] text-brand-accent uppercase font-bold tracking-wider">Выбран оффер</div>
                                    <div className="text-xs font-bold text-slate-200">{selectedOffer.title}</div>
                                </div>
                                <button
                                    onClick={() => setSelectedOffer(null)}
                                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                                >
                                    Сменить
                                </button>
                            </div>
                        ) : (
                            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Выберите оффер из списка слева, чтобы отправить ссылку.
                            </div>
                        )}

                        <form onSubmit={handleSubmitVideo} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Платформа</label>
                                <select
                                    value={form.platformId}
                                    onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                                >
                                    <option value={1}>TikTok</option>
                                    <option value={2}>YouTube Shorts</option>
                                    <option value={3}>Instagram Reels</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ссылка на видео</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://www.tiktok.com/@creator/video/..."
                                    value={form.videoUrl}
                                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent placeholder:text-slate-600 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Количество просмотров</label>
                                <input
                                    type="number"
                                    min={1000}
                                    step={1000}
                                    required
                                    value={form.declaredViews}
                                    onChange={(e) => setForm({ ...form, declaredViews: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Скриншот аналитики ГЕО</label>
                                <FileUploader
                                    value={form.screenshotAssetUrl}
                                    onUploaded={(url) => setForm({ ...form, screenshotAssetUrl: url })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !selectedOffer}
                                className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 disabled:cursor-not-allowed text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-accent/10 flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                {submitting ? 'Проверка...' : 'Отправить на модерацию'}
                            </button>
                        </form>
                    </div>
                </div>

            </div>

            <div className="space-y-4 pt-4 border-t border-brand-border">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Мои сданные ролики
                    <span className="text-xs bg-brand-border px-2 py-0.5 rounded-full text-slate-300 font-normal">
            {submissions.length}
          </span>
                </h2>

                {submissions.length === 0 ? (
                    <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center text-slate-500 text-xs">
                        Вы еще не сдали ни одного видео.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {submissions.map((sub) => (
                            <div
                                key={sub.id}
                                className="bg-brand-card border border-brand-border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-200">{sub.offerTitle}</span>
                                        <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border text-slate-400 font-mono">
                      {sub.platformCode}
                    </span>
                                    </div>
                                    <a
                                        href={sub.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-mono"
                                    >
                                        {sub.sourceUrl}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <div className="flex items-center gap-6 justify-between md:justify-end">
                                    <div className="text-right">
                                        <div className="text-xs font-bold font-mono text-white">
                                            {Number(sub.recordedViews).toLocaleString()} views
                                        </div>
                                        <div className="text-[11px] font-mono text-amber-400 font-semibold">
                                            Заработок: +${Number(sub.holdAmount).toFixed(2)}
                                        </div>
                                    </div>

                                    <span
                                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border uppercase tracking-wider font-mono text-[10px] ${
                                            sub.status === 'APPROVED'
                                                ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                                                : sub.status === 'REJECTED'
                                                    ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'
                                                    : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                                        }`}
                                    >
                    {sub.status}
                  </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}