import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, DollarSign, Eye, Gauge, Heart, Trophy, Globe2, Layers } from 'lucide-react';
import { api } from '../../../api';
import Pagination from '../../../components/Pagination';

const CAMPAIGN_PAGE_SIZE = 10;

const PRESETS = [
    { key: 'today', label: 'Сегодня' },
    { key: '7d', label: '7 дней' },
    { key: '30d', label: '30 дней' },
    { key: '90d', label: '90 дней' },
    { key: 'all', label: 'Все время' },
];

function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

// "Все время" has no real lower bound on the backend, so we just reach far enough back to
// predate any realistic account (the backend clamps/validates the range itself either way).
const ALL_TIME_FROM = '2000-01-01';

function rangeForPreset(key) {
    const today = new Date();
    const to = toIsoDate(today);
    if (key === 'all') return { from: ALL_TIME_FROM, to };
    const days = { today: 0, '7d': 6, '30d': 29, '90d': 89 }[key] ?? 29;
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    return { from: toIsoDate(from), to };
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold tracking-wide">
                <Icon className="w-3 h-3" /> {label}
            </div>
            <div className={`text-lg font-bold font-mono mt-1.5 ${accent || 'text-white'}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
    );
}

/**
 * Dual-series inline-SVG chart for dailyTrends — views (line/area) and spend (line), each
 * normalized to its own max since the two series live on very different scales. Same
 * no-charting-library approach as AdvertiserDashboardPage's ViewsTimelineChart.
 */
function TrendsChart({ points }) {
    const width = 640;
    const height = 160;
    const padding = 8;

    if (!points?.length) {
        return <div className="text-xs text-slate-500 py-10 text-center">Нет данных за выбранный период.</div>;
    }

    const maxViews = Math.max(...points.map((p) => p.views), 1);
    const maxSpend = Math.max(...points.map((p) => Number(p.spend)), 1);
    const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

    const buildPath = (accessor, max) => points.map((p, idx) => {
        const x = padding + idx * stepX;
        const y = height - padding - (accessor(p) / max) * (height - padding * 2);
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const viewsLine = buildPath((p) => p.views, maxViews);
    const spendLine = buildPath((p) => Number(p.spend), maxSpend);
    const viewsArea = `${viewsLine} L${(padding + (points.length - 1) * stepX).toFixed(1)},${height - padding} L${padding},${height - padding} Z`;

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="analyticsViewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={viewsArea} fill="url(#analyticsViewsGradient)" />
                <path d={viewsLine} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d={spendLine} fill="none" stroke="#34d399" strokeWidth="1.75" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 rounded-full bg-sky-400 inline-block" /> Просмотры</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 rounded-full bg-emerald-400 inline-block" /> Расход, $</span>
            </div>
        </div>
    );
}

function ShareBar({ label, sublabel, views, sharePercentage, colorClass }) {
    return (
        <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-semibold truncate">{label}</span>
                <span className="text-slate-500 font-mono shrink-0 ml-2">{Number(views).toLocaleString()} ({Number(sharePercentage).toFixed(1)}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(Number(sharePercentage), 100)}%` }} />
            </div>
            {sublabel}
        </div>
    );
}

const PLATFORM_COLORS = ['bg-sky-400', 'bg-fuchsia-400', 'bg-amber-400', 'bg-emerald-400'];
const GEO_COLORS = ['bg-brand-accent', 'bg-indigo-400', 'bg-rose-400', 'bg-teal-400'];

export default function AdvertiserAnalyticsPage({ advertiser }) {
    const [preset, setPreset] = useState('30d');
    const [{ from, to }, setRange] = useState(() => rangeForPreset('30d'));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Campaign-comparison table — decoupled from the main analytics fetch above (the payload no
    // longer carries campaignComparison; it's its own paginated endpoint now) with its own
    // pagination state, re-fetched on page/size changes and reset to page 0 whenever the
    // from/to range changes.
    const [campaigns, setCampaigns] = useState(null);
    const [campaignPage, setCampaignPage] = useState({ pageNumber: 0, pageSize: CAMPAIGN_PAGE_SIZE, totalElements: 0, totalPages: 0 });
    const [campaignError, setCampaignError] = useState(null);

    useEffect(() => {
        if (!advertiser?.id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.getAdvertiserDeepAnalytics(advertiser.id, from, to)
            .then((result) => { if (!cancelled) setData(result); })
            .catch((err) => { if (!cancelled) setError(err.message || 'Не удалось загрузить аналитику'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [advertiser?.id, from, to]);

    const loadCampaignComparison = useCallback((pageNumber, pageSize) => {
        if (!advertiser?.id) return;
        api.getAdvertiserCampaignComparison(advertiser.id, from, to, pageNumber, pageSize)
            .then((result) => {
                setCampaigns(result?.content || []);
                setCampaignPage({
                    pageNumber: result?.pageNumber ?? 0,
                    pageSize: result?.pageSize ?? pageSize,
                    totalElements: result?.totalElements ?? 0,
                    totalPages: result?.totalPages ?? 0,
                });
                setCampaignError(null);
            })
            .catch((err) => setCampaignError(err.message || 'Не удалось загрузить сравнение кампаний'));
    }, [advertiser?.id, from, to]);

    // Reset to page 0 whenever the advertiser or date range changes (a new range invalidates
    // whatever page of the old range's results was showing).
    useEffect(() => {
        loadCampaignComparison(0, campaignPage.pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [advertiser?.id, from, to]);

    const handleCampaignPageChange = (nextPage) => loadCampaignComparison(nextPage, campaignPage.pageSize);
    const handleCampaignPageSizeChange = (nextSize) => loadCampaignComparison(0, nextSize);

    const handlePreset = (key) => {
        setPreset(key);
        setRange(rangeForPreset(key));
    };

    const handleCustomDate = (field, value) => {
        setPreset('custom');
        setRange((prev) => ({ ...prev, [field]: value }));
    };

    const totalInteractionsLabel = useMemo(() => {
        if (!data) return '';
        return `${Number(data.totalInteractions).toLocaleString()} лайков + комментариев`;
    }, [data]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-sm font-bold text-white mb-3">Analytics Hub</h2>
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handlePreset(key)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                                preset === key
                                    ? 'bg-brand-accent text-brand-bg border-brand-accent'
                                    : 'bg-brand-bg text-slate-400 border-brand-border hover:border-brand-accent/40'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                        <input
                            type="date"
                            value={from}
                            max={to}
                            onChange={(e) => handleCustomDate('from', e.target.value)}
                            className="bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-brand-accent"
                        />
                        <span className="text-slate-600 text-xs">—</span>
                        <input
                            type="date"
                            value={to}
                            min={from}
                            onChange={(e) => handleCustomDate('to', e.target.value)}
                            className="bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-brand-accent"
                        />
                    </div>
                </div>
            </div>

            {loading && !data && (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка аналитики...
                </div>
            )}

            {error && !data && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-4 rounded-2xl">
                    {error}
                </div>
            )}

            {data && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard icon={DollarSign} label="Расход за период" value={`$${Number(data.totalGrossSpent).toFixed(2)}`} accent="text-brand-success" />
                        <KpiCard icon={Eye} label="Подтверждено просмотров" value={Number(data.totalDeliveredViews).toLocaleString()} accent="text-brand-accent" />
                        <KpiCard icon={Gauge} label="Средний eCPM" value={`$${Number(data.effectiveCpm).toFixed(2)}`} sub="за 1M просмотров" />
                        <KpiCard icon={Heart} label="Средний ER" value={`${Number(data.averageEngagementRate).toFixed(2)}%`} sub={totalInteractionsLabel} />
                    </div>

                    <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-3">Просмотры и расход по дням</h3>
                        <TrendsChart points={data.dailyTrends} />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-slate-500" /> По платформам</h3>
                            {!data.platformBreakdown?.length ? (
                                <div className="text-xs text-slate-500">Нет подтверждённых просмотров за период.</div>
                            ) : (
                                <div className="space-y-3">
                                    {data.platformBreakdown.map((p, idx) => (
                                        <ShareBar
                                            key={p.platformCode}
                                            label={p.displayName}
                                            views={p.views}
                                            sharePercentage={p.sharePercentage}
                                            colorClass={PLATFORM_COLORS[idx % PLATFORM_COLORS.length]}
                                            sublabel={<div className="text-[10px] text-slate-500 mt-0.5">Расход: ${Number(p.spend).toFixed(2)}</div>}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-slate-500" /> По ГЕО</h3>
                            {!data.geoBreakdown?.length ? (
                                <div className="text-xs text-slate-500">Нет подтверждённых просмотров за период.</div>
                            ) : (
                                <div className="space-y-3">
                                    {data.geoBreakdown.map((g, idx) => (
                                        <ShareBar
                                            key={g.isoCode}
                                            label={g.name}
                                            views={g.views}
                                            sharePercentage={g.sharePercentage}
                                            colorClass={GEO_COLORS[idx % GEO_COLORS.length]}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                        <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> Топ-10 воркеров</h3>
                        {!data.topCreators?.length ? (
                            <div className="px-5 pb-5 text-xs text-slate-500">Пока нет данных по воркерам.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                            <th className="text-left font-semibold px-5 py-2">Воркер</th>
                                            <th className="text-right font-semibold px-3 py-2">Просмотры</th>
                                            <th className="text-right font-semibold px-3 py-2">Заработано</th>
                                            <th className="text-right font-semibold px-5 py-2">Роликов</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {data.topCreators.map((c) => (
                                            <tr key={c.workerId}>
                                                <td className="px-5 py-2.5">
                                                    <div className="font-semibold text-slate-200">{c.username}</div>
                                                    {c.affiliateTag && <div className="text-[10px] text-slate-500 font-mono">{c.affiliateTag}</div>}
                                                </td>
                                                <td className="text-right px-3 py-2.5 font-mono text-brand-accent">{Number(c.viewsDelivered).toLocaleString()}</td>
                                                <td className="text-right px-3 py-2.5 font-mono text-brand-success">${Number(c.earningsEarned).toFixed(2)}</td>
                                                <td className="text-right px-5 py-2.5 font-mono text-slate-400">{c.approvedCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                        <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">Сравнение кампаний</h3>
                        {campaignError && (
                            <div className="mx-5 mb-3 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">
                                {campaignError}
                            </div>
                        )}
                        {!campaigns?.length ? (
                            <div className="px-5 pb-5 text-xs text-slate-500">Ещё нет ни одной кампании.</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                                <th className="text-left font-semibold px-5 py-2">Кампания</th>
                                                <th className="text-right font-semibold px-3 py-2">Расход</th>
                                                <th className="text-right font-semibold px-3 py-2">Просмотры</th>
                                                <th className="text-right font-semibold px-3 py-2">Роликов</th>
                                                <th className="text-right font-semibold px-5 py-2">Спорных, %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-border">
                                            {campaigns.map((c) => (
                                                <tr key={c.offerId}>
                                                    <td className="px-5 py-2.5 font-semibold text-slate-200 truncate max-w-[220px]">{c.title}</td>
                                                    <td className="text-right px-3 py-2.5 font-mono text-brand-success">${Number(c.spend).toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2.5 font-mono text-brand-accent">{Number(c.views).toLocaleString()}</td>
                                                    <td className="text-right px-3 py-2.5 font-mono text-slate-400">{c.submissionsCount}</td>
                                                    <td className={`text-right px-5 py-2.5 font-mono font-bold ${Number(c.disputeRatePercentage) > 10 ? 'text-brand-danger' : 'text-slate-400'}`}>
                                                        {Number(c.disputeRatePercentage).toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-5 pb-4">
                                    <Pagination
                                        currentPage={campaignPage.pageNumber}
                                        totalPages={campaignPage.totalPages}
                                        totalElements={campaignPage.totalElements}
                                        pageSize={campaignPage.pageSize}
                                        onPageChange={handleCampaignPageChange}
                                        onPageSizeChange={handleCampaignPageSizeChange}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
