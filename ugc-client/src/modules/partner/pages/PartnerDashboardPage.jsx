import React from 'react';
import { Loader2, Wallet, TrendingUp, Building2, BarChart3, FileText } from 'lucide-react';

const COMMISSION_TYPE_LABELS = {
    PERCENT_OF_PLATFORM_MARGIN: 'от маржи платформы',
    PERCENT_OF_GROSS_TURNOVER: 'от оборота клиентов',
    FIXED_PER_QUALIFIED_MILLION: 'за 1M просмотров',
};

/**
 * Dual-series (earnings + views) inline-SVG chart for the 30-day earnings timeline — same
 * no-charting-library approach as AdvertiserDashboardPage/AdvertiserAnalyticsPage: this project
 * has no chart library installed, so a hand-rolled area chart avoids an unverified new dependency.
 */
function EarningsTimelineChart({ points }) {
    const width = 600;
    const height = 140;
    const padding = 8;

    if (!points?.length) {
        return <div className="text-xs text-slate-500 py-10 text-center">Нет начислений за последние 30 дней.</div>;
    }

    const maxEarnings = Math.max(...points.map((p) => Number(p.earnings)), 1);
    const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

    const coords = points.map((p, idx) => {
        const x = padding + idx * stepX;
        const y = height - padding - (Number(p.earnings) / maxEarnings) * (height - padding * 2);
        return [x, y];
    });

    const linePath = coords.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height - padding} L${coords[0][0].toFixed(1)},${height - padding} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none">
            <defs>
                <linearGradient id="partnerEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#partnerEarningsGradient)" />
            <path d={linePath} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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

function describeTerms(terms) {
    if (!terms) return null;
    const typeLabel = COMMISSION_TYPE_LABELS[terms.commissionType] || terms.commissionType;
    if (terms.commissionType === 'FIXED_PER_QUALIFIED_MILLION') {
        return `$${Number(terms.commissionRate).toFixed(2)} ${typeLabel}`;
    }
    return `${Number(terms.commissionRate).toFixed(2)}% ${typeLabel}`;
}

export default function PartnerDashboardPage({ dashboard, loading, error }) {
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

    const terms = dashboard.currentTerms;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard icon={Wallet} label="Доступно к выводу" value={`$${Number(dashboard.availableBalance).toFixed(2)}`} accent="text-brand-success" />
                <KpiCard icon={TrendingUp} label="Всего заработано" value={`$${Number(dashboard.totalEarned).toFixed(2)}`} accent="text-brand-accent" />
                <KpiCard
                    icon={Building2}
                    label="Привлечено брендов"
                    value={dashboard.referredAdvertisersCount}
                    sub={`${dashboard.activeOffersCount} активных офферов`}
                />
                <KpiCard icon={BarChart3} label="Оборот клиентов" value={`$${Number(dashboard.totalGrossTurnover).toFixed(2)}`} />
            </div>

            {terms && (
                <div className="bg-brand-card border border-brand-border rounded-2xl p-5 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Текущие условия контракта</div>
                        <div className="text-sm font-bold text-white mt-1">{describeTerms(terms)}</div>
                        {!terms.isActive && (
                            <div className="text-[11px] text-brand-danger mt-1">Контракт временно неактивен — начисления приостановлены.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">Динамика дохода (30 дней)</h3>
                <EarningsTimelineChart points={dashboard.earningsTimeline} />
            </div>
        </div>
    );
}
