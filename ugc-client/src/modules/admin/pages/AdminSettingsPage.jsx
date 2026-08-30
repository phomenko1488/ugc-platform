import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Percent, Loader2 } from 'lucide-react';
import { api } from '../../../api';

const SAMPLE_ADVERTISER_CPM = 250;

export default function AdminSettingsPage({ onDataChanged }) {
    const [margin, setMargin] = useState(null); // null = loading
    const [inputValue, setInputValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        api.getPlatformSettings()
            .then((data) => {
                const value = data?.defaultMarginPercentage ?? 25;
                setMargin(Number(value));
                setInputValue(String(value));
            })
            .catch((err) => setError(err.message || 'Не удалось загрузить настройки'));
    }, []);

    const previewMargin = Number(inputValue) || 0;
    const preview = useMemo(() => {
        const platformSpread = SAMPLE_ADVERTISER_CPM * (previewMargin / 100);
        return {
            workerCpm: SAMPLE_ADVERTISER_CPM - platformSpread,
            platformCpm: platformSpread,
        };
    }, [previewMargin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const numeric = Number(inputValue);
        if (!(numeric >= 0 && numeric < 100)) {
            setError('Маржа должна быть в диапазоне 0–99.99%');
            return;
        }
        try {
            setBusy(true);
            await api.updatePlatformMargin(numeric);
            setMargin(numeric);
            setSuccess('Маржа платформы по умолчанию обновлена');
            onDataChanged?.();
        } catch (err) {
            setError(err.message || 'Не удалось обновить маржу');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-accent" />
                <h2 className="text-base font-bold text-white">Настройки платформы</h2>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Percent className="w-4 h-4 text-brand-accent" />
                    Маржа платформы по умолчанию
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    Применяется к новым офферам при их создании: {'workerCpmRate = advertiserCpmRate × (1 − маржа / 100)'}.
                    Уже созданные офферы сохраняют свою исходную ставку.
                </p>

                {margin === null && !error ? (
                    <div className="flex items-center gap-2 text-slate-500 text-xs py-4"><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="99.99"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand-accent"
                            />
                            <span className="text-sm font-bold text-slate-400">%</span>
                        </div>

                        {error && <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">{error}</div>}
                        {success && <div className="text-xs text-brand-success bg-brand-success/10 border border-brand-success/20 rounded-xl px-3 py-2">{success}</div>}

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all"
                        >
                            {busy ? 'Сохранение...' : 'Сохранить маржу'}
                        </button>
                    </form>
                )}
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Калькулятор спреда</h3>
                <p className="text-[11px] text-slate-500">
                    Пример: при ставке рекламодателя ${SAMPLE_ADVERTISER_CPM}/1M и марже {previewMargin || 0}%:
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3 text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Получает воркер</div>
                        <div className="text-lg font-bold font-mono text-brand-success mt-1">${preview.workerCpm.toFixed(2)}</div>
                    </div>
                    <div className="bg-brand-bg border border-brand-border rounded-xl p-3 text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Получает платформа</div>
                        <div className="text-lg font-bold font-mono text-brand-accent mt-1">${preview.platformCpm.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
