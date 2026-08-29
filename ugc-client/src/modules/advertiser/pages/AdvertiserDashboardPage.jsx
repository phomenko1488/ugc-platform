import React from 'react';
import { Loader2, Wallet, TrendingUp, DollarSign, Eye, Megaphone, Percent, Activity, Film, ExternalLink } from 'lucide-react';

/**
 * Lightweight hand-rolled inline-SVG area chart for the 30-day views timeline — no charting
 * library is installed in this project (package.json has only @twa-dev/sdk, clsx, lucide-react,
 * react-dom, tailwind-merge), so this avoids pulling in an unverified new dependency for one chart.
 */
function ViewsTimelineChart({ points }) {
    const width = 600;
    const height = 140;
    const padding = 8;

    if (!points?.length) {
        return <div className="text-xs text-slate-500 py-10 text-center">Нет данных за последние 30 дней.</div>;
    }

    const maxViews = Math.max(...points.map((p) => p.views), 1);
    const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

    const coords = points.map((p, idx) => {
        const x = padding + idx * stepX;
        const y = height - padding - (p.views / maxViews) * (height - padding * 2);
        return [x, y];
    });

    const linePath = coords.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height - padding} L${coords[0][0].toFixed(1)},${height - padding} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none">
            <defs>
                <linearGradient id="advViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#advViewsGradient)" />
            <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

function KpiCard({ icon: Icon, label, value, accent }) {
    return (
        <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-semibold tracking-wide">
                <Icon className="w-3 h-3" /> {label}
            </div>
            <div className={`text-lg font-bold font-mono mt-1.5 ${accent || 'text-white'}`}>{value}</div>
        </div>
    );
}

export default function AdvertiserDashboardPage({ dashboard, loading, error }) {
    if (loading && !dashboard) {
        return (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка дашборда...
            </div>
        );
    }

    if (error && !dashboard) {
        return (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-4 rounded-2xl">
                {error}
            </div>
        );
    }

    if (!dashboard) return null;

    const timelinePoints = (dashboard.viewsTimeline || []).map((d) => ({ date: d.date, views: d.views }));
    const totalWindowViews = timelinePoints.reduce((sum, p) => sum + Number(p.views || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard icon={Wallet} label="Доступно" value={`$${Number(dashboard.availableBalance).toFixed(2)}`} accent="text-brand-success" />
                <KpiCard icon={Megaphone} label="В офферах" value={`$${Number(dashboard.activeOffersBudgetTotal).toFixed(2)}`} accent="text-brand-accent" />
                <KpiCard icon={DollarSign} label="Всего потрачено" value={`$${Number(dashboard.totalSpent).toFixed(2)}`} />
                <KpiCard icon={Activity} label="Активных кампаний" value={dashboard.activeOffersCount} />
                <KpiCard icon={Eye} label="Всего просмотров" value={Number(dashboard.totalRecordedViews).toLocaleString()} accent="text-brand-accent" />
                <KpiCard icon={TrendingUp} label="Средний CPM" value={`$${Number(dashboard.averageCpmRate).toFixed(2)}`} />
                <KpiCard icon={Percent} label="Средний ER" value={`${Number(dashboard.averageEngagementRate).toFixed(2)}%`} />
                <KpiCard icon={Film} label="Просмотров за 30д" value={totalWindowViews.toLocaleString()} accent="text-brand-success" />
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">Динамика просмотров (30 дней)</h3>
                <ViewsTimelineChart points={timelinePoints} />
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <h3 className="text-sm font-bold text-white px-5 pt-5 pb-3">Топ-5 роликов по просмотрам</h3>
                {!dashboard.topSubmissions?.length ? (
                    <div className="px-5 pb-5 text-xs text-slate-500">Пока нет данных по роликам.</div>
                ) : (
                    <div className="divide-y divide-brand-border">
                        {dashboard.topSubmissions.map((s) => (
                            <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-200 truncate">{s.offerTitle}</div>
                                    {s.sourceUrl && (
                                        <a
                                            href={s.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] text-brand-accent hover:underline flex items-center gap-1 font-mono mt-0.5 truncate"
                                        >
                                            <span className="truncate">{s.sourceUrl}</span>
                                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-xs font-mono font-bold text-white">{Number(s.recordedViews || 0).toLocaleString()}</div>
                                    <div className="text-[9px] text-slate-500 uppercase">просмотров</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
