import React from 'react';
import { Loader2, TrendingUp, Landmark, Wallet2, Clock } from 'lucide-react';

/**
 * Dual-series inline-SVG chart: gross turnover as a filled area, net profit as a line on top of
 * it — same hand-rolled-chart approach as every other cabinet in this codebase (no charting
 * library installed), just with two series instead of one since a P&L view needs both.
 */
function ProfitTimelineChart({ points }) {
    const width = 600;
    const height = 160;
    const padding = 8;

    if (!points?.length) {
        return <div className="text-xs text-slate-500 py-10 text-center">Нет данных за последние 30 дней.</div>;
    }

    const allValues = points.flatMap((p) => [Number(p.grossTurnover), Number(p.netProfit)]);
    const maxValue = Math.max(...allValues, 1);
    const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

    const toCoords = (key) => points.map((p, idx) => {
        const x = padding + idx * stepX;
        const y = height - padding - (Number(p[key]) / maxValue) * (height - padding * 2);
        return [x, y];
    });

    const turnoverCoords = toCoords('grossTurnover');
    const profitCoords = toCoords('netProfit');

    const toLinePath = (coords) => coords.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const turnoverLine = toLinePath(turnoverCoords);
    const turnoverArea = `${turnoverLine} L${turnoverCoords[turnoverCoords.length - 1][0].toFixed(1)},${height - padding} L${turnoverCoords[0][0].toFixed(1)},${height - padding} Z`;
    const profitLine = toLinePath(profitCoords);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
            <defs>
                <linearGradient id="adminTurnoverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={turnoverArea} fill="url(#adminTurnoverGradient)" />
            <path d={turnoverLine} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={profitLine} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
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

export default function AdminDashboardPage({ dashboard, loading, error }) {
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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    icon={TrendingUp}
                    label="Валовый оборот"
                    value={`$${Number(dashboard.platformGrossTurnover).toFixed(2)}`}
                    accent="text-brand-info"
                />
                <KpiCard
                    icon={Landmark}
                    label="Чистая прибыль"
                    value={`$${Number(dashboard.platformNetProfit).toFixed(2)}`}
                    accent="text-brand-success"
                />
                <KpiCard
                    icon={Wallet2}
                    label="Обязательства по холдам"
                    value={`$${Number(dashboard.totalWorkersHoldLiability).toFixed(2)}`}
                    accent="text-amber-400"
                    sub={`Свободные балансы: $${Number(dashboard.totalAvailableUserBalances).toFixed(2)}`}
                />
                <KpiCard
                    icon={Clock}
                    label="Очередь выплат"
                    value={`$${Number(dashboard.pendingPayoutsAmount).toFixed(2)}`}
                    accent={dashboard.pendingPayoutsCount > 0 ? 'text-brand-danger' : 'text-white'}
                    sub={`${dashboard.pendingPayoutsCount} заявок`}
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="bg-brand-card border border-brand-border p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Пользователей</div>
                    <div className="font-mono font-bold text-white mt-1">{dashboard.totalUsersCount}</div>
                </div>
                <div className="bg-brand-card border border-brand-border p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Сабмитов всего</div>
                    <div className="font-mono font-bold text-white mt-1">{dashboard.totalSubmissionsCount}</div>
                </div>
                <div className="bg-brand-card border border-brand-border p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Активных офферов</div>
                    <div className="font-mono font-bold text-white mt-1">{dashboard.activeOffersCount}</div>
                </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Динамика платформы (30 дней)</h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-info inline-block" /> Оборот</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-success inline-block" /> Прибыль</span>
                    </div>
                </div>
                <ProfitTimelineChart points={dashboard.profitTimeline} />
            </div>
        </div>
    );
}
