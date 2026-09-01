import React from 'react';
import { Loader2, Wallet, TrendingUp, DollarSign, Eye, Workflow, Percent, Activity, Film, ExternalLink } from 'lucide-react';

/**
 * Lightweight hand-rolled inline-SVG area chart for the 30-day views timeline — no charting
 * library is installed in this project (package.json has only @twa-dev/sdk, clsx, lucide-react,
 * react-dom, tailwind-merge), so this avoids pulling in an unverified new dependency for one chart.
 * Stroke/gradient now use the brand terracotta accent instead of a leftover stock sky-blue, so
 * the one chart on this page doesn't read as a different, untouched product.
 */
function ViewsTimelineChart({ points }) {
    const width = 600;
    const height = 140;
    const padding = 8;

    if (!points?.length) {
        return <div className="py-10 text-center text-xs text-slate-500">Нет данных за последние 30 дней.</div>;
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
        <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="advViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e05a33" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#e05a33" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#advViewsGradient)" />
            <path d={linePath} fill="none" stroke="#e05a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

// A hairline grid of stat cells (gap-px bg-brand-border, same device the landing's role/points
// grid uses) instead of eight separate rounded, bordered, shadowed cards — the latter is the
// default any dashboard-generator produces; a single continuous ledger of numbers reads more
// like a real financial instrument panel and scales to eight entries without visual noise.
function StatCell({ icon: Icon, label, value, accent }) {
    return (
        <div className="bg-brand-card p-4">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                <Icon className="h-3 w-3" /> {label}
            </div>
            <div className={`mt-2 font-mono text-lg font-bold ${accent || 'text-ash'}`}>{value}</div>
        </div>
    );
}

export default function AdvertiserDashboardPage({ dashboard, loading, error }) {
    if (loading && !dashboard) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка дашборда...
            </div>
        );
    }

    if (error && !dashboard) {
        return (
            <div className="rounded-xl border border-brand-danger/20 bg-brand-danger/10 p-4 text-xs text-brand-danger">
                {error}
            </div>
        );
    }

    if (!dashboard) return null;

    const timelinePoints = (dashboard.viewsTimeline || []).map((d) => ({ date: d.date, views: d.views }));
    const totalWindowViews = timelinePoints.reduce((sum, p) => sum + Number(p.views || 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl uppercase tracking-tight text-ash">Дашборд</h1>
                <p className="mt-1 text-xs text-slate-500">Сводка по балансу, потокам и просмотрам за последние 30 дней.</p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-brand-border bg-brand-border sm:grid-cols-4">
                <StatCell icon={Wallet} label="Доступно" value={`$${Number(dashboard.availableBalance).toFixed(2)}`} accent="text-brand-success" />
                <StatCell icon={Workflow} label="В потоках" value={`$${Number(dashboard.activeOffersBudgetTotal).toFixed(2)}`} accent="text-brand-accent" />
                <StatCell icon={DollarSign} label="Всего потрачено" value={`$${Number(dashboard.totalSpent).toFixed(2)}`} />
                <StatCell icon={Activity} label="Активных потоков" value={dashboard.activeOffersCount} />
                <StatCell icon={Eye} label="Всего просмотров" value={Number(dashboard.totalRecordedViews).toLocaleString()} accent="text-brand-accent" />
                <StatCell icon={TrendingUp} label="Средний CPM" value={`$${Number(dashboard.averageCpmRate).toFixed(2)}`} />
                <StatCell icon={Percent} label="Средний ER" value={`${Number(dashboard.averageEngagementRate).toFixed(2)}%`} />
                <StatCell icon={Film} label="Просмотров за 30д" value={totalWindowViews.toLocaleString()} accent="text-brand-success" />
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
                <h3 className="mb-3 text-sm font-bold text-ash">Динамика просмотров (30 дней)</h3>
                <ViewsTimelineChart points={timelinePoints} />
            </div>

            <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card">
                <h3 className="px-5 pb-3 pt-5 text-sm font-bold text-ash">Топ-5 роликов по просмотрам</h3>
                {!dashboard.topSubmissions?.length ? (
                    <div className="px-5 pb-5 text-xs text-slate-500">Пока нет данных по роликам.</div>
                ) : (
                    <div className="divide-y divide-brand-border">
                        {dashboard.topSubmissions.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-slate-200">{s.offerTitle}</div>
                                    {s.sourceUrl && (
                                        <a
                                            href={s.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-brand-accent hover:underline"
                                        >
                                            <span className="truncate">{s.sourceUrl}</span>
                                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                        </a>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-xs font-bold text-ash">{Number(s.recordedViews || 0).toLocaleString()}</div>
                                    <div className="font-mono text-[9px] uppercase text-slate-500">просмотров</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
