import React, {useState, useMemo} from 'react';
import {X, Send, AlertCircle, Sparkles, Loader2} from 'lucide-react';
import {api} from '../../../api';
import FileUploader from '../../../components/FileUploader';
import WebApp from '@twa-dev/sdk';

const PLATFORM_OPTIONS = [
    {id: 1, code: 'TIKTOK', label: 'TikTok'},
    {id: 2, code: 'YOUTUBE_SHORTS', label: 'YouTube Shorts'},
    {id: 3, code: 'INSTAGRAM_REELS', label: 'Instagram Reels'},
];

function triggerHaptic(type = 'success') {
    try {
        WebApp.HapticFeedback?.notificationOccurred(type);
    } catch {
        // Not running inside Telegram — no-op.
    }
}

export default function SubmissionModal({worker, offer, onClose, onSubmitted}) {
    const [platformId, setPlatformId] = useState(
        offer.allowedPlatforms?.[0]?.id ?? PLATFORM_OPTIONS[0].id
    );
    const [sourceUrl, setSourceUrl] = useState('');
    // Храним строкой для свободного ввода и удаления
    const [declaredViews, setDeclaredViews] = useState(
        offer.minViewsThreshold ? String(offer.minViewsThreshold) : ''
    );
    const [screenshotAssetUrl, setScreenshotAssetUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const availablePlatforms = offer.allowedPlatforms?.length
        ? offer.allowedPlatforms.map((p) => ({id: p.id, code: p.code, label: p.displayName ?? p.code}))
        : PLATFORM_OPTIONS;

    // Безопасный парсинг числа
    const numericDeclaredViews = parseInt(declaredViews, 10) || 0;
    const viewsCap = offer.maxViewsCapPerVideo ? Number(offer.maxViewsCapPerVideo) : null;
    const isCapped = viewsCap != null && numericDeclaredViews > viewsCap;
    const payableViews = viewsCap != null ? Math.min(numericDeclaredViews, viewsCap) : numericDeclaredViews;

    const estimatedHold = useMemo(() => {
        const rate = Number(offer.workerCpmRate) || 0;
        return (payableViews * rate) / 1_000_000;
    }, [payableViews, offer.workerCpmRate]);

    const meetsThreshold = numericDeclaredViews >= Number(offer.minViewsThreshold || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!sourceUrl.trim()) {
            setError('Укажите ссылку на видео');
            return;
        }
        if (numericDeclaredViews <= 0) {
            setError('Укажите количество просмотров');
            return;
        }
        if (!meetsThreshold) {
            setError(`Минимальный порог оффера: ${Number(offer.minViewsThreshold).toLocaleString()} просмотров`);
            return;
        }

        try {
            setSubmitting(true);
            await api.submitVideo({
                workerId: worker.id,
                offerId: offer.id,
                platformId: Number(platformId),
                sourceUrl: sourceUrl.trim(),
                declaredViews: numericDeclaredViews,
                screenshotAssetUrl: screenshotAssetUrl || null,
            });
            triggerHaptic('success');
            onSubmitted();
        } catch (err) {
            triggerHaptic('error');
            setError(err.message || 'Не удалось отправить видео');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div
                className="bg-brand-card border border-brand-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
                <div
                    className="sticky top-0 bg-brand-card border-b border-brand-border px-5 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="text-xs text-slate-400">Сдать видео</div>
                        <div className="text-sm font-bold text-white truncate max-w-[240px]">{offer.title}</div>
                    </div>
                    <button onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div
                        className="p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20 flex items-start gap-2.5 text-xs text-brand-accent">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5"/>
                        <span>
                            Обязательно вставьте тег{' '}
                            <b className="font-mono">#{worker?.affiliateTag || 'wrk_none'}</b>{' '}
                            в описание ролика — без него система не сможет подтвердить авторство.
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Платформа</label>
                            <select
                                value={platformId}
                                onChange={(e) => setPlatformId(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                            >
                                {availablePlatforms.map((p) => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ссылка на видео</label>
                            <input
                                type="url"
                                required
                                placeholder="https://www.tiktok.com/@creator/video/..."
                                value={sourceUrl}
                                onChange={(e) => setSourceUrl(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Текущие
                                просмотры</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step="1"
                                required
                                placeholder="Например: 75000"
                                value={declaredViews}
                                onChange={(e) => setDeclaredViews(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                            />
                            {!meetsThreshold && numericDeclaredViews > 0 && (
                                <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 shrink-0"/>
                                    Минимальный порог
                                    оффера: {Number(offer.minViewsThreshold).toLocaleString()} просмотров
                                </p>
                            )}
                            {isCapped && (
                                <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 shrink-0"/>
                                    Кампания оплачивает максимум {viewsCap.toLocaleString()} просмотров. Ваш расчетный
                                    холд ограничен.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Скриншот аналитики
                                ГЕО</label>
                            <FileUploader value={screenshotAssetUrl} onUploaded={setScreenshotAssetUrl}/>
                        </div>

                        <div
                            className="bg-brand-bg border border-brand-border rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <div
                                    className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Расчетный
                                    холд
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    {payableViews.toLocaleString()}{isCapped ? ' (капа)' : ''} ×
                                    ${Number(offer.workerCpmRate).toFixed(2)} / 1M
                                </div>
                            </div>
                            <div className="text-xl font-bold font-mono text-brand-success">
                                ${estimatedHold.toFixed(2)}
                            </div>
                        </div>

                        {error && (
                            <div
                                className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                            {submitting ? 'Отправка...' : 'Отправить на модерацию'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}