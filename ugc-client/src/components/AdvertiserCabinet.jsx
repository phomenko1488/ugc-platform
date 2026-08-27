import React, { useState } from 'react';
import { PlusCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { api } from '../api';

export default function AdvertiserCabinet({ advertiser, offers, onRefresh }) {
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        title: '',
        requirementsDescription: '',
        advertiserCpmRate: 250.00,
        workerCpmRate: 170.00,
        minViewsThreshold: 50000,
        minEngagementRate: 2.50,
        totalBudget: 1000.00,
        holdPeriodDays: 7,
        platformIds: [1, 2, 3],
        geoIds: [1, 2, 3]
    });

    const handleCreateOffer = async (e) => {
        e.preventDefault();
        try {
            setCreating(true);
            await api.createOffer(advertiser.id, {
                ...form,
                advertiserCpmRate: Number(form.advertiserCpmRate),
                workerCpmRate: Number(form.workerCpmRate),
                minViewsThreshold: Number(form.minViewsThreshold),
                minEngagementRate: Number(form.minEngagementRate),
                totalBudget: Number(form.totalBudget),
                holdPeriodDays: Number(form.holdPeriodDays)
            });

            alert('Оффер успешно запущен и бюджет зарезервирован!');
            setForm({
                title: '',
                requirementsDescription: '',
                advertiserCpmRate: 250.00,
                workerCpmRate: 170.00,
                minViewsThreshold: 50000,
                minEngagementRate: 2.50,
                totalBudget: 1000.00,
                holdPeriodDays: 7,
                platformIds: [1, 2, 3],
                geoIds: [1, 2, 3]
            });
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (offerId, currentStatus) => {
        try {
            await api.setOfferStatus(offerId, advertiser.id, !currentStatus);
            onRefresh();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Баланс депозита</div>
                    <div className="text-2xl font-bold font-mono text-brand-success mt-2">
                        ${Number(advertiser?.availableBalance || 0).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Доступно для запуска офферов</div>
                </div>

                <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Активных офферов</div>
                    <div className="text-2xl font-bold font-mono text-white mt-2">
                        {offers.filter(o => o.isActive).length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Принимают трафик от воркеров</div>
                </div>

                <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Остаток в кампаниях</div>
                    <div className="text-2xl font-bold font-mono text-brand-accent mt-2">
                        ${offers.reduce((acc, o) => acc + Number(o.remainingBudget || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Заблокировано в Escrow бюджетах</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                <div className="lg:col-span-5 space-y-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-brand-accent" />
                        Создать рекламную кампанию
                    </h2>

                    <form onSubmit={handleCreateOffer} className="bg-brand-card border border-brand-border p-6 rounded-2xl space-y-4 shadow-xl">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Название оффера</label>
                            <input
                                type="text"
                                required
                                placeholder="Например: Stake Plinko Stream Highlights"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Требования к видео</label>
                            <textarea
                                rows={3}
                                placeholder="Разместить водяной знак, тег в описании..."
                                value={form.requirementsDescription}
                                onChange={(e) => setForm({ ...form, requirementsDescription: e.target.value })}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Списание ($/1M)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={form.advertiserCpmRate}
                                    onChange={(e) => setForm({ ...form, advertiserCpmRate: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Воркеру ($/1M)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={form.workerCpmRate}
                                    onChange={(e) => setForm({ ...form, workerCpmRate: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Бюджет ($)</label>
                                <input
                                    type="number"
                                    step="10"
                                    required
                                    value={form.totalBudget}
                                    onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Мин. порог</label>
                                <input
                                    type="number"
                                    step="1000"
                                    required
                                    value={form.minViewsThreshold}
                                    onChange={(e) => setForm({ ...form, minViewsThreshold: e.target.value })}
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-accent/10 mt-2"
                        >
                            {creating ? 'Резервирование...' : 'Запустить оффер'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-7 space-y-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        Кампании рекламодателя
                    </h2>

                    <div className="grid gap-4">
                        {offers.map((offer) => (
                            <div
                                key={offer.id}
                                className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-3"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-100 text-sm">{offer.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                            <span>Ставка: <b>${offer.advertiserCpmRate}</b></span>
                                            <span>Выплата: <b>${offer.workerCpmRate}</b></span>
                                            <span>Спред: <b className="text-brand-accent">${(offer.advertiserCpmRate - offer.workerCpmRate).toFixed(2)}</b></span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleToggleStatus(offer.id, offer.isActive)}
                                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                            offer.isActive
                                                ? 'bg-brand-success/10 text-brand-success border border-brand-success/20 hover:bg-brand-success/20'
                                                : 'bg-slate-800 text-slate-400 border border-brand-border hover:bg-slate-700'
                                        }`}
                                    >
                                        {offer.isActive ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                                        {offer.isActive ? 'Активен' : 'Пауза'}
                                    </button>
                                </div>

                                <div className="bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center justify-between font-mono text-xs">
                                    <span className="text-slate-400">Остаток бюджета:</span>
                                    <span className="font-bold text-brand-success text-sm">${Number(offer.remainingBudget).toFixed(2)} / ${Number(offer.totalBudget).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}