import React, { useEffect, useState } from 'react';
import { Loader2, Globe2, Radio, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../../api';

const EMPTY_PLATFORM = { code: '', displayName: '', urlRegexPattern: '', providerBeanName: 'genericSocialStatsProvider' };
const EMPTY_GEO = { isoCode: '', name: '', tier: 2 };

export default function AdminReferencePage() {
    const [platforms, setPlatforms] = useState(null);
    const [geos, setGeos] = useState(null);
    const [error, setError] = useState(null);

    const [showPlatformForm, setShowPlatformForm] = useState(false);
    const [newPlatform, setNewPlatform] = useState(EMPTY_PLATFORM);
    const [platformBusy, setPlatformBusy] = useState(false);
    const [platformError, setPlatformError] = useState(null);

    const [showGeoForm, setShowGeoForm] = useState(false);
    const [newGeo, setNewGeo] = useState(EMPTY_GEO);
    const [geoBusy, setGeoBusy] = useState(false);
    const [geoError, setGeoError] = useState(null);

    const loadPlatforms = () => api.getAdminPlatforms().then(setPlatforms).catch((err) => setError(err.message));
    const loadGeos = () => api.getAdminGeos().then(setGeos).catch((err) => setError(err.message));

    useEffect(() => { loadPlatforms(); loadGeos(); }, []);

    const handleTogglePlatform = async (id) => {
        try { await api.togglePlatform(id); loadPlatforms(); } catch (err) { alert(err.message); }
    };

    const handleToggleGeo = async (id) => {
        try { await api.toggleGeo(id); loadGeos(); } catch (err) { alert(err.message); }
    };

    const handleCreatePlatform = async (e) => {
        e.preventDefault();
        setPlatformError(null);
        if (!newPlatform.code.trim() || !newPlatform.displayName.trim() || !newPlatform.urlRegexPattern.trim()) {
            setPlatformError('Заполните код, название и regex-паттерн');
            return;
        }
        try {
            setPlatformBusy(true);
            await api.savePlatform(newPlatform);
            setNewPlatform(EMPTY_PLATFORM);
            setShowPlatformForm(false);
            loadPlatforms();
        } catch (err) {
            setPlatformError(err.message || 'Не удалось добавить платформу');
        } finally {
            setPlatformBusy(false);
        }
    };

    const handleCreateGeo = async (e) => {
        e.preventDefault();
        setGeoError(null);
        if (!newGeo.isoCode.trim() || !newGeo.name.trim()) {
            setGeoError('Заполните ISO-код и название страны');
            return;
        }
        try {
            setGeoBusy(true);
            await api.saveGeo({ ...newGeo, tier: Number(newGeo.tier) });
            setNewGeo(EMPTY_GEO);
            setShowGeoForm(false);
            loadGeos();
        } catch (err) {
            setGeoError(err.message || 'Не удалось добавить страну');
        } finally {
            setGeoBusy(false);
        }
    };

    return (
        <div className="space-y-8">
            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Radio className="w-4 h-4 text-brand-accent" /> Платформы
                    </h2>
                    <button
                        onClick={() => setShowPlatformForm((v) => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand-accent hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" /> Добавить платформу
                    </button>
                </div>

                {showPlatformForm && (
                    <form onSubmit={handleCreatePlatform} className="bg-brand-card border border-brand-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input placeholder="Код (TIKTOK)" value={newPlatform.code} onChange={(e) => setNewPlatform((p) => ({ ...p, code: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent" />
                        <input placeholder="Название (TikTok)" value={newPlatform.displayName} onChange={(e) => setNewPlatform((p) => ({ ...p, displayName: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent" />
                        <input placeholder="Regex ссылки" value={newPlatform.urlRegexPattern} onChange={(e) => setNewPlatform((p) => ({ ...p, urlRegexPattern: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent" />
                        <input placeholder="providerBeanName" value={newPlatform.providerBeanName} onChange={(e) => setNewPlatform((p) => ({ ...p, providerBeanName: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent" />
                        {platformError && <div className="sm:col-span-2 text-[11px] text-brand-danger">{platformError}</div>}
                        <button type="submit" disabled={platformBusy} className="sm:col-span-2 bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all">
                            {platformBusy ? 'Добавление...' : 'Добавить платформу'}
                        </button>
                    </form>
                )}

                {platforms === null ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-8"><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>
                ) : (
                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                        <th className="text-left font-semibold px-5 py-3">Название</th>
                                        <th className="text-left font-semibold px-3 py-3">Код</th>
                                        <th className="text-left font-semibold px-3 py-3">Regex</th>
                                        <th className="text-center font-semibold px-5 py-3">Активна</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {platforms.map((p) => (
                                        <tr key={p.id}>
                                            <td className="px-5 py-3 font-semibold text-slate-200">{p.displayName}</td>
                                            <td className="px-3 py-3 font-mono text-slate-400">{p.code}</td>
                                            <td className="px-3 py-3 font-mono text-slate-500 truncate max-w-[220px]">{p.urlRegexPattern}</td>
                                            <td className="text-center px-5 py-3">
                                                <button onClick={() => handleTogglePlatform(p.id)} className={p.isEnabled ? 'text-brand-success' : 'text-slate-600'}>
                                                    {p.isEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-brand-accent" /> ГЕО
                    </h2>
                    <button
                        onClick={() => setShowGeoForm((v) => !v)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand-accent hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" /> Добавить страну
                    </button>
                </div>

                {showGeoForm && (
                    <form onSubmit={handleCreateGeo} className="bg-brand-card border border-brand-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input placeholder="ISO (USA)" value={newGeo.isoCode} onChange={(e) => setNewGeo((g) => ({ ...g, isoCode: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent" />
                        <input placeholder="Название (United States)" value={newGeo.name} onChange={(e) => setNewGeo((g) => ({ ...g, name: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent" />
                        <select value={newGeo.tier} onChange={(e) => setNewGeo((g) => ({ ...g, tier: e.target.value }))}
                            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent">
                            <option value={1}>Tier 1</option>
                            <option value={2}>Tier 2</option>
                            <option value={3}>Tier 3</option>
                        </select>
                        {geoError && <div className="sm:col-span-3 text-[11px] text-brand-danger">{geoError}</div>}
                        <button type="submit" disabled={geoBusy} className="sm:col-span-3 bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-2.5 rounded-xl transition-all">
                            {geoBusy ? 'Добавление...' : 'Добавить страну'}
                        </button>
                    </form>
                )}

                {geos === null ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-8"><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>
                ) : (
                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                        <th className="text-left font-semibold px-5 py-3">Страна</th>
                                        <th className="text-left font-semibold px-3 py-3">ISO</th>
                                        <th className="text-center font-semibold px-3 py-3">Tier</th>
                                        <th className="text-center font-semibold px-5 py-3">Доступна</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {geos.map((g) => (
                                        <tr key={g.id}>
                                            <td className="px-5 py-3 font-semibold text-slate-200">{g.name}</td>
                                            <td className="px-3 py-3 font-mono text-slate-400">{g.isoCode}</td>
                                            <td className="text-center px-3 py-3 font-mono text-slate-300">{g.tier}</td>
                                            <td className="text-center px-5 py-3">
                                                <button onClick={() => handleToggleGeo(g.id)} className={g.isEnabled ? 'text-brand-success' : 'text-slate-600'}>
                                                    {g.isEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
