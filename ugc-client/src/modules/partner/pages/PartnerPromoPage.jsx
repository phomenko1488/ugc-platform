import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Copy, Check, Calculator } from 'lucide-react';
import { api } from '../../../api';

const REFERRAL_BASE_URL = 'http://localhost:5173';

// The calculator estimates PERCENT_OF_PLATFORM_MARGIN / PERCENT_OF_GROSS_TURNOVER commissions
// (both defined off an advertiser's CPM spend) using this representative CPM — it's what
// DataInitializer seeds its example offer with, and there's no single "the" advertiser CPM since
// every brand negotiates its own rate. FIXED_PER_QUALIFIED_MILLION doesn't need this at all: it's
// a flat $/1M regardless of anyone's CPM.
const ASSUMED_ADVERTISER_CPM = 250;
const FALLBACK_MARGIN_PERCENTAGE = 25;

const MIN_VIEWS = 1_000_000;
const MAX_VIEWS = 100_000_000;
const STEP_VIEWS = 1_000_000;

function formatViews(views) {
    return `${(views / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}M`;
}

export default function PartnerPromoPage({ partner, dashboard }) {
    const [copied, setCopied] = useState(false);
    const [terms, setTerms] = useState(dashboard?.currentTerms || null);
    const [marginPercentage, setMarginPercentage] = useState(FALLBACK_MARGIN_PERCENTAGE);
    const [plannedViews, setPlannedViews] = useState(10_000_000);

    useEffect(() => {
        if (dashboard?.currentTerms) {
            setTerms(dashboard.currentTerms);
            return;
        }
        if (!partner?.id) return;
        api.getPartnerTerms(partner.id).then(setTerms).catch(() => {});
    }, [partner?.id, dashboard?.currentTerms]);

    useEffect(() => {
        api.getPlatformSettings().then((data) => {
            if (data?.defaultMarginPercentage != null) setMarginPercentage(Number(data.defaultMarginPercentage));
        }).catch(() => {});
    }, []);

    const referralLink = `${REFERRAL_BASE_URL}/?ref=${partner?.affiliateTag || 'prt_xxx'}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const estimatedEarnings = useMemo(() => {
        if (!terms) return 0;
        const viewsInMillions = plannedViews / 1_000_000;
        const grossTurnover = viewsInMillions * ASSUMED_ADVERTISER_CPM;
        const rate = Number(terms.commissionRate || 0);

        switch (terms.commissionType) {
            case 'PERCENT_OF_GROSS_TURNOVER':
                return grossTurnover * (rate / 100);
            case 'FIXED_PER_QUALIFIED_MILLION':
                return viewsInMillions * rate;
            case 'PERCENT_OF_PLATFORM_MARGIN':
            default: {
                const platformSpread = grossTurnover * (marginPercentage / 100);
                return platformSpread * (rate / 100);
            }
        }
    }, [terms, plannedViews, marginPercentage]);

    return (
        <div className="space-y-6">
            <h2 className="text-base font-bold text-white">Промо и реферальные ссылки</h2>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-brand-accent" />
                    Персональная B2B-ссылка
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Отправьте эту ссылку рекламодателю — при регистрации по ней его аккаунт автоматически привяжется к вам как к партнеру.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        readOnly
                        value={referralLink}
                        className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                    />
                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-1.5 bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Скопировано' : 'Копировать'}
                    </button>
                </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-brand-accent" />
                    Калькулятор доходности
                </h3>

                <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-400">Планируемый объем просмотров клиента</span>
                        <span className="font-mono font-bold text-white">{formatViews(plannedViews)}</span>
                    </div>
                    <input
                        type="range"
                        min={MIN_VIEWS}
                        max={MAX_VIEWS}
                        step={STEP_VIEWS}
                        value={plannedViews}
                        onChange={(e) => setPlannedViews(Number(e.target.value))}
                        className="w-full accent-brand-accent"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>1M</span>
                        <span>100M</span>
                    </div>
                </div>

                <div className="bg-brand-bg border border-brand-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">Ожидаемая прибыль партнера</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                            При среднем CPM клиента ${ASSUMED_ADVERTISER_CPM}/1M{terms?.commissionType === 'PERCENT_OF_PLATFORM_MARGIN' ? ` и марже платформы ${marginPercentage}%` : ''}
                        </div>
                    </div>
                    <div className="text-xl font-bold font-mono text-brand-success">${estimatedEarnings.toFixed(2)}</div>
                </div>
            </div>
        </div>
    );
}
