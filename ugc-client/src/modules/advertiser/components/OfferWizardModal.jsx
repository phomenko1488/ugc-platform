import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../api';

const STEPS = ['Основное', 'Ставки и бюджет', 'Платформы и ГЕО', 'Проверка'];

// Fallback in case /api/v1/reference/{platforms,geos} can't be reached — matches
// DataInitializer's seed order so the wizard still works rather than showing an empty picker.
const FALLBACK_PLATFORMS = [
    { id: 1, code: 'TIKTOK', displayName: 'TikTok' },
    { id: 2, code: 'YOUTUBE_SHORTS', displayName: 'YouTube Shorts' },
    { id: 3, code: 'INSTAGRAM_REELS', displayName: 'Instagram Reels' },
];
const FALLBACK_GEOS = [
    { id: 1, isoCode: 'RUS', name: 'Россия' },
    { id: 2, isoCode: 'KAZ', name: 'Казахстан' },
    { id: 3, isoCode: 'BLR', name: 'Беларусь' },
];

const DEFAULT_FORM = {
    title: '',
    requirementsDescription: '',
    advertiserCpmRate: 250,
    workerCpmRate: 170,
    minViewsThreshold: 50000,
    minEngagementRate: 2.5,
    totalBudget: 1000,
    holdPeriodDays: 7,
    platformIds: [],
    geoIds: [],
};

/**
 * 4-step campaign creation wizard: basic info -> rates/budget -> platforms/geos (fetched from
 * the reference-data endpoints, falling back to the DataInitializer seed order if that call
 * fails) -> review & confirm. Submits via api.createOffer on the final step.
 */
export default function OfferWizardModal({ advertiser, onClose, onCreated }) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [platforms, setPlatforms] = useState(FALLBACK_PLATFORMS);
    const [geos, setGeos] = useState(FALLBACK_GEOS);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getPlatforms().then((data) => {
            if (Array.isArray(data) && data.length) setPlatforms(data);
        }).catch(() => {});
        api.getGeos().then((data) => {
            if (Array.isArray(data) && data.length) setGeos(data);
        }).catch(() => {});
    }, []);

    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const toggleId = (field, id) => {
        setForm((prev) => {
            const set = new Set(prev[field]);
            if (set.has(id)) set.delete(id); else set.add(id);
            return { ...prev, [field]: Array.from(set) };
        });
    };

    const stepIsValid = () => {
        if (step === 0) return form.title.trim().length > 0;
        if (step === 1) {
            return Number(form.advertiserCpmRate) > Number(form.workerCpmRate)
                && Number(form.totalBudget) > 0
                && Number(form.minViewsThreshold) > 0;
        }
        if (step === 2) return form.platformIds.length > 0 && form.geoIds.length > 0;
        return true;
    };

    const handleNext = () => {
        setError(null);
        if (!stepIsValid()) {
            if (step === 1) setError('Ставка рекламодателя должна быть строго выше выплаты воркеру, бюджет и порог просмотров — больше 0.');
            else if (step === 2) setError('Выберите хотя бы одну платформу и одну ГЕО-локацию.');
            return;
        }
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const handleBack = () => setStep((s) => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            await api.createOffer(advertiser.id, {
                title: form.title.trim(),
                requirementsDescription: form.requirementsDescription.trim() || null,
                advertiserCpmRate: Number(form.advertiserCpmRate),
                workerCpmRate: Number(form.workerCpmRate),
                minViewsThreshold: Number(form.minViewsThreshold),
                minEngagementRate: Number(form.minEngagementRate),
                totalBudget: Number(form.totalBudget),
                holdPeriodDays: Number(form.holdPeriodDays),
                platformIds: form.platformIds,
                geoIds: form.geoIds,
            });
            onCreated?.();
        } catch (err) {
            setError(err.message || 'Не удалось создать кампанию');
        } finally {
            setSubmitting(false);
        }
    };

    const spread = (Number(form.advertiserCpmRate) - Number(form.workerCpmRate)) || 0;

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-brand-card border border-brand-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-brand-card border-b border-brand-border px-5 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="text-xs text-slate-400">Новая кампания</div>
                        <div className="text-sm font-bold text-white">{STEPS[step]}</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1.5 px-5 pt-4">
                    {STEPS.map((label, idx) => (
                        <div
                            key={label}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= step ? 'bg-brand-accent' : 'bg-brand-border'}`}
                        />
                    ))}
                </div>

                <div className="p-5 space-y-4">
                    {step === 0 && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Название кампании</label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Например: Stake Plinko Stream Highlights"
                                    value={form.title}
                                    onChange={(e) => update({ title: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Требования к видео</label>
                                <textarea
                                    rows={4}
                                    placeholder="Разместить водяной знак, тег в описании..."
                                    value={form.requirementsDescription}
                                    onChange={(e) => update({ requirementsDescription: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent resize-none"
                                />
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Списание ($/1M)</label>
                                    <input
                                        type="number" step="0.01"
                                        value={form.advertiserCpmRate}
                                        onChange={(e) => update({ advertiserCpmRate: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Воркеру ($/1M)</label>
                                    <input
                                        type="number" step="0.01"
                                        value={form.workerCpmRate}
                                        onChange={(e) => update({ workerCpmRate: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                            </div>
                            <div className="bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2 text-[11px] font-mono text-slate-400">
                                Спред платформы: <span className={spread > 0 ? 'text-brand-accent font-bold' : 'text-brand-danger font-bold'}>${spread.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Бюджет ($)</label>
                                    <input
                                        type="number" step="10"
                                        value={form.totalBudget}
                                        onChange={(e) => update({ totalBudget: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Мин. просмотров</label>
                                    <input
                                        type="number" step="1000"
                                        value={form.minViewsThreshold}
                                        onChange={(e) => update({ minViewsThreshold: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Мин. ER (%)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={form.minEngagementRate}
                                        onChange={(e) => update({ minEngagementRate: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Холд (дней)</label>
                                    <input
                                        type="number" step="1"
                                        value={form.holdPeriodDays}
                                        onChange={(e) => update({ holdPeriodDays: e.target.value })}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">Платформы</label>
                                <div className="flex flex-wrap gap-2">
                                    {platforms.map((p) => {
                                        const selected = form.platformIds.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => toggleId('platformIds', p.id)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                                                    selected
                                                        ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                                        : 'bg-brand-bg text-slate-400 border-brand-border hover:border-brand-accent/40'
                                                }`}
                                            >
                                                {p.displayName ?? p.code}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">ГЕО-локации</label>
                                <div className="flex flex-wrap gap-2">
                                    {geos.map((g) => {
                                        const selected = form.geoIds.includes(g.id);
                                        return (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => toggleId('geoIds', g.id)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                                                    selected
                                                        ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                                        : 'bg-brand-bg text-slate-400 border-brand-border hover:border-brand-accent/40'
                                                }`}
                                            >
                                                {g.name ?? g.isoCode}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="bg-brand-bg border border-brand-border rounded-xl p-4 space-y-2">
                                <div className="text-sm font-bold text-white">{form.title || '—'}</div>
                                {form.requirementsDescription && (
                                    <div className="text-[11px] text-slate-400">{form.requirementsDescription}</div>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                                    <div className="text-slate-500">Списание: <span className="text-white font-bold">${Number(form.advertiserCpmRate).toFixed(2)}</span></div>
                                    <div className="text-slate-500">Воркеру: <span className="text-white font-bold">${Number(form.workerCpmRate).toFixed(2)}</span></div>
                                    <div className="text-slate-500">Бюджет: <span className="text-brand-success font-bold">${Number(form.totalBudget).toFixed(2)}</span></div>
                                    <div className="text-slate-500">Порог: <span className="text-brand-accent font-bold">{Number(form.minViewsThreshold).toLocaleString()}</span></div>
                                    <div className="text-slate-500">Мин. ER: <span className="text-white font-bold">{form.minEngagementRate}%</span></div>
                                    <div className="text-slate-500">Холд: <span className="text-amber-400 font-bold">{form.holdPeriodDays} дн.</span></div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {platforms.filter((p) => form.platformIds.includes(p.id)).map((p) => (
                                        <span key={p.id} className="text-[10px] bg-brand-card px-2 py-0.5 rounded border border-brand-border text-slate-300">{p.displayName ?? p.code}</span>
                                    ))}
                                    {geos.filter((g) => form.geoIds.includes(g.id)).map((g) => (
                                        <span key={g.id} className="text-[10px] bg-brand-card px-2 py-0.5 rounded border border-brand-border text-slate-500">{g.name ?? g.isoCode}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-3 py-2.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-accent shrink-0 mt-0.5" />
                                Бюджет будет списан с доступного баланса и зарезервирован под кампанию сразу после запуска.
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                        {step > 0 && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold px-3 py-2.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Назад
                            </button>
                        )}
                        <div className="flex-1" />
                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-1.5 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                            >
                                Далее
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                            >
                                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {submitting ? 'Запуск...' : 'Запустить кампанию'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
