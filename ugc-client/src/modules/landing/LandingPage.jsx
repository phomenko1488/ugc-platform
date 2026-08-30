import React, { useMemo, useState } from 'react';
import {
    Rocket,
    ArrowRight,
    ArrowDown,
    Video,
    Megaphone,
    Handshake,
    Wallet,
    ShieldCheck,
    Gauge,
    Eye,
    DollarSign,
    Sparkles,
    TrendingUp,
    Lock,
    Percent,
    BarChart3,
    Zap,
    Send,
    ChevronRight,
    CheckCircle2,
    Users,
    Timer,
    Activity,
    LifeBuoy,
} from 'lucide-react';

/**
 * UGC Flow — маркетинговый лендинг для новых пользователей.
 *
 * Полностью самостоятельный компонент: не импортирует и не зависит ни от одного модуля
 * существующего кабинета (App.jsx, api/index.js, LoginModal.jsx и т.д.) и ничего в них не меняет.
 * Использует только React + lucide-react + Tailwind (оба уже входят в зависимости ugc-client)
 * и фирменную палитру, уже объявленную в tailwind.config.js (brand-bg/card/border/accent/success).
 *
 * Встраивание: импортируйте и отрендерьте компонент там, где считаете нужным (например, как
 * отдельный публичный роут `/` до экрана логина/WebApp) — сам файл ничего не регистрирует и
 * ни на что не подписывается автоматически.
 *
 * Метрики в Hero-блоке и в блоке доверия — иллюстративные плейсхолдеры для демонстрации верстки;
 * перед запуском в прод замените их на реальные цифры платформы.
 */

const TELEGRAM_BASE_URL = 'https://t.me/';

// Иллюстративные CPM-ставки для калькулятора — согласованы с дефолтами визарда оффера в
// кабинете рекламодателя (advertiserCpmRate по умолчанию $250 / 1M просмотров, маржа платформы
// по умолчанию 25% => workerCpmRate ≈ $187.5 / 1M). Округлены для наглядности демонстрации.
const CALCULATOR_RATES = {
    worker: { cpmPerMillion: 180, label: 'Ваш потенциальный доход', unit: 'доход' },
    advertiser: { cpmPerMillion: 250, label: 'Необходимый бюджет кампании', unit: 'бюджет' },
    partner: { cpmPerMillion: 38, label: 'Ваш пассивный доход (RevShare)', unit: 'доход' },
};

const AUDIENCES = [
    {
        key: 'worker',
        label: 'Авторам',
        shortLabel: 'Воркер',
        icon: Video,
        headline: 'Снимайте видео — получайте USDT',
        description:
            'Берите готовые офферы брендов, заливайте ролики в TikTok, Reels и YouTube Shorts и получайте оплату за реальные просмотры — без портфолио и испытательного срока.',
        points: [
            {
                icon: Zap,
                title: 'Низкий порог входа',
                text: 'Начните за 2 минуты через Telegram — без резюме, кастинга и минимальных требований к подписчикам.',
            },
            {
                icon: Video,
                title: 'Залив в любой формат',
                text: 'TikTok, Instagram Reels, YouTube Shorts — берите оффер под свою площадку и аудиторию.',
            },
            {
                icon: Gauge,
                title: 'Прозрачный CPM',
                text: 'Точная ставка за 1 000 000 просмотров видна ещё до того, как вы взяли оффер в работу.',
            },
            {
                icon: Wallet,
                title: 'Мгновенные выплаты',
                text: 'USDT в сети TRC-20 — без банков, конвертации и задержек в несколько дней.',
            },
        ],
    },
    {
        key: 'advertiser',
        label: 'Рекламодателям',
        shortLabel: 'Рекламодатель',
        icon: Megaphone,
        headline: 'Масштабируйте трафик без агентских наценок',
        description:
            'Запускайте офферы и получайте вирусный трафик от сети проверенных авторов — с полной прозрачностью по каждому просмотру и защитой бюджета от фрода.',
        points: [
            {
                icon: TrendingUp,
                title: 'Масштабирование трафика',
                text: 'Сотни авторов заливают ролики параллельно — трафик растёт без ручного поиска блогеров.',
            },
            {
                icon: Eye,
                title: 'Traffic Inspector',
                text: 'Полная прозрачность по каждому ролику: воркер, платформа, динамика просмотров, статус холда.',
            },
            {
                icon: ShieldCheck,
                title: 'Защита от фрода',
                text: 'Двухуровневая модерация и лимит выплаты на одно видео (капа) исключают накрутку и переплату.',
            },
            {
                icon: Lock,
                title: 'Полный контроль бюджета',
                text: 'Останавливайте кампанию в любой момент — неизрасходованный остаток бюджета возвращается мгновенно.',
            },
        ],
    },
    {
        key: 'partner',
        label: 'B2B-Партнерам',
        shortLabel: 'Партнер',
        icon: Handshake,
        headline: 'Приводите бренды — зарабатывайте на обороте',
        description:
            'Подключайте рекламодателей к платформе и получайте RevShare с их активности — с гибкими условиями и полной прозрачностью в собственной CRM.',
        points: [
            {
                icon: Users,
                title: 'Привлечение брендов',
                text: 'Каждый приведённый рекламодатель закрепляется за вами на всё время работы на платформе.',
            },
            {
                icon: Percent,
                title: 'Гибкий RevShare',
                text: 'На выбор — процент от маржи платформы или процент от валового оборота приведённого бренда.',
            },
            {
                icon: BarChart3,
                title: 'Прозрачная CRM',
                text: 'Видите каждого рекламодателя, его кампании и оборот в реальном времени в личном кабинете.',
            },
            {
                icon: DollarSign,
                title: 'Пассивный доход',
                text: 'Комиссия начисляется автоматически на каждой транзакции — без ручных сверок и напоминаний.',
            },
        ],
    },
];

const STEPS = [
    {
        icon: Send,
        title: 'Откройте Telegram-бота',
        text: 'Нажмите «Запустить бота» — регистрация занимает меньше двух минут, без анкет и звонков.',
    },
    {
        icon: Users,
        title: 'Выберите роль',
        text: 'Автор, Рекламодатель или Партнер — интерфейс и сценарий сразу подстроятся под вашу задачу.',
    },
    {
        icon: Rocket,
        title: 'Начните работать',
        text: 'Возьмите оффер и снимите видео, запустите кампанию или пригласите бренд — что бы ни было вашей целью.',
    },
    {
        icon: Wallet,
        title: 'Получите результат',
        text: 'Деньги на балансе в USDT TRC-20, кампания в трекинге, комиссия начислена — автоматически, без ожидания.',
    },
];

const TRUST_POINTS = [
    {
        icon: Lock,
        title: 'Смарт-контрактная логика холдов',
        text: 'Средства блокируются и размораживаются по алгоритму — без ручного вмешательства и человеческого фактора.',
    },
    {
        icon: Percent,
        title: '0% комиссии на вывод',
        text: 'Вы получаете полную начисленную сумму — платформа не берёт долю с вашего вывода средств.',
    },
    {
        icon: Activity,
        title: 'Живая статистика 24/7',
        text: 'Просмотры, холды и выплаты обновляются в реальном времени — никаких отчётов раз в неделю.',
    },
    {
        icon: ShieldCheck,
        title: 'Двухуровневая защита от фрода',
        text: 'Автоматическая модерация плюс ручная проверка спорных случаев перед каждой крупной выплатой.',
    },
    {
        icon: Zap,
        title: 'Мгновенные выплаты USDT TRC-20',
        text: 'Без банков, конвертации валют и посредников — деньги приходят напрямую на ваш кошелёк.',
    },
    {
        icon: LifeBuoy,
        title: 'Поддержка на связи',
        text: 'Модераторы и техподдержка отвечают в течение часа — в самом Telegram-боте, без тикет-систем.',
    },
];

const HERO_METRICS = [
    { icon: DollarSign, value: '$2.4M+', label: 'выплачено авторам' },
    { icon: Users, value: '12 400+', label: 'активных авторов' },
    { icon: Timer, value: '< 15 мин', label: 'средняя модерация' },
];

function formatUsd(value) {
    return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function GlowBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-brand-accent/20 blur-[120px]" />
            <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-brand-success/10 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 h-[24rem] w-[24rem] rounded-full bg-brand-accent/10 blur-[100px]" />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-card/60 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            {children}
        </div>
    );
}

export default function LandingPage({ botUsername = 'ugc_flow_bot' }) {
    const [activeAudience, setActiveAudience] = useState('worker');
    const [viewsMillions, setViewsMillions] = useState(10);

    const botUrl = `${TELEGRAM_BASE_URL}${botUsername}`;
    const audience = AUDIENCES.find((a) => a.key === activeAudience) ?? AUDIENCES[0];
    const rate = CALCULATOR_RATES[activeAudience] ?? CALCULATOR_RATES.worker;

    const calculatedAmount = useMemo(
        () => viewsMillions * rate.cpmPerMillion,
        [viewsMillions, rate.cpmPerMillion]
    );

    const scrollToId = (id) => (e) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-brand-bg font-sans text-slate-100 antialiased">
            {/* --- Top nav --------------------------------------------------------------------- */}
            <header className="sticky top-0 z-50 border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-lg">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                            <Video className="h-[1.125rem] w-[1.125rem]" />
                        </div>
                        <span className="text-base font-extrabold tracking-tight text-white">
                            UGC <span className="text-brand-accent">Flow</span>
                        </span>
                    </div>

                    <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
                        <a href="#audiences" onClick={scrollToId('audiences')} className="transition-colors hover:text-white">
                            Аудитории
                        </a>
                        <a href="#calculator" onClick={scrollToId('calculator')} className="transition-colors hover:text-white">
                            Калькулятор
                        </a>
                        <a href="#how-it-works" onClick={scrollToId('how-it-works')} className="transition-colors hover:text-white">
                            Как это работает
                        </a>
                        <a href="#trust" onClick={scrollToId('trust')} className="transition-colors hover:text-white">
                            Надежность
                        </a>
                    </nav>

                    <a
                        href={botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1.5 rounded-xl bg-brand-accent px-4 py-2.5 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover"
                    >
                        <Send className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Открыть бота</span>
                        <span className="sm:hidden">Бот</span>
                    </a>
                </div>
            </header>

            {/* --- Hero -------------------------------------------------------------------------- */}
            <section className="relative isolate">
                <GlowBackdrop />
                <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-28 sm:pt-28">
                    <div className="mx-auto mb-6 flex justify-center">
                        <SectionLabel>Платформа №1 для UGC-монетизации в Telegram</SectionLabel>
                    </div>

                    <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Заливай видео.{' '}
                        <span className="bg-gradient-to-r from-brand-accent to-brand-success bg-clip-text text-transparent">
                            Масштабируй трафик.
                        </span>{' '}
                        Зарабатывай в USDT.
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        UGC Flow соединяет авторов контента, рекламодателей и B2B-партнёров в одной прозрачной
                        экосистеме — с честным CPM, защитой от фрода и мгновенными выплатами прямо в Telegram.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                        <a
                            href={botUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent px-7 py-4 text-sm font-bold text-brand-bg shadow-[0_0_40px_-10px_rgba(56,189,248,0.6)] transition-all hover:bg-brand-accentHover hover:shadow-[0_0_50px_-8px_rgba(56,189,248,0.8)] sm:w-auto"
                        >
                            <Rocket className="h-4 w-4" />
                            Запустить бота
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                        <a
                            href="#audiences"
                            onClick={scrollToId('audiences')}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-card/60 px-7 py-4 text-sm font-bold text-slate-200 backdrop-blur-sm transition-all hover:border-brand-accent/40 hover:text-white sm:w-auto"
                        >
                            Узнать больше
                            <ArrowDown className="h-4 w-4" />
                        </a>
                    </div>

                    <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                        {HERO_METRICS.map((metric) => (
                            <div
                                key={metric.label}
                                className="rounded-2xl border border-brand-border bg-brand-card/50 px-5 py-5 backdrop-blur-sm transition-colors hover:border-brand-accent/30"
                            >
                                <div className="mb-2 flex items-center justify-center gap-1.5 text-brand-accent">
                                    <metric.icon className="h-4 w-4" />
                                </div>
                                <div className="text-2xl font-extrabold text-white sm:text-3xl">{metric.value}</div>
                                <div className="mt-1 text-xs text-slate-500">{metric.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Audience switcher -------------------------------------------------------------- */}
            <section id="audiences" className="relative border-t border-brand-border/60 py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <SectionLabel>Экосистема</SectionLabel>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Для каждого своя выгода
                        </h2>
                        <p className="mt-4 text-sm text-slate-400 sm:text-base">
                            UGC Flow построен как единая экосистема — выберите свою роль, чтобы увидеть, что платформа
                            предлагает именно вам.
                        </p>
                    </div>

                    <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2 rounded-2xl border border-brand-border bg-brand-card/40 p-1.5 backdrop-blur-sm">
                        {AUDIENCES.map((a) => (
                            <button
                                key={a.key}
                                type="button"
                                onClick={() => setActiveAudience(a.key)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all sm:text-sm ${
                                    activeAudience === a.key
                                        ? 'bg-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <a.icon className="h-4 w-4" />
                                {a.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
                        <div className="lg:col-span-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                                <audience.icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-5 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                                {audience.headline}
                            </h3>
                            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                                {audience.description}
                            </p>
                            <a
                                href={botUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-accent transition-colors hover:text-brand-accentHover"
                            >
                                Начать как {audience.shortLabel.toLowerCase()}
                                <ChevronRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
                            {audience.points.map((point) => (
                                <div
                                    key={point.title}
                                    className="group rounded-2xl border border-brand-border bg-brand-card/50 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-accent/40 hover:bg-brand-card"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-border bg-brand-bg text-brand-accent transition-colors group-hover:border-brand-accent/40">
                                        <point.icon className="h-4 w-4" />
                                    </div>
                                    <h4 className="mt-3.5 text-sm font-bold text-white">{point.title}</h4>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{point.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Calculator ---------------------------------------------------------------------- */}
            <section id="calculator" className="relative border-t border-brand-border/60 py-20 sm:py-28">
                <div className="mx-auto max-w-4xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <SectionLabel>Калькулятор</SectionLabel>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Рассчитайте свой потенциал
                        </h2>
                        <p className="mt-4 text-sm text-slate-400 sm:text-base">
                            Передвиньте ползунок — цифра ниже пересчитывается мгновенно, в зависимости от выбранной
                            роли.
                        </p>
                    </div>

                    <div className="relative mt-12 overflow-hidden rounded-3xl border border-brand-border bg-brand-card/60 p-6 backdrop-blur-sm sm:p-10">
                        <div
                            className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-[100px]"
                            style={{ background: activeAudience === 'advertiser' ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.15)' }}
                        />

                        <div className="relative flex flex-wrap justify-center gap-2">
                            {AUDIENCES.map((a) => (
                                <button
                                    key={a.key}
                                    type="button"
                                    onClick={() => setActiveAudience(a.key)}
                                    className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                                        activeAudience === a.key
                                            ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                                            : 'border-brand-border text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {a.shortLabel}
                                </button>
                            ))}
                        </div>

                        <div className="relative mt-10 text-center">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {rate.label}
                            </div>
                            <div className="mt-3 flex items-baseline justify-center gap-1">
                                <span className="text-2xl font-extrabold text-slate-500">$</span>
                                <span className="bg-gradient-to-r from-brand-accent to-brand-success bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                                    {formatUsd(calculatedAmount)}
                                </span>
                            </div>
                            <div className="mt-3 font-mono text-[11px] text-slate-500">
                                {viewsMillions.toLocaleString('ru-RU')}
                                {viewsMillions >= 50 ? '+' : ''} 000 000 просмотров × ${rate.cpmPerMillion} / 1 000 000 = $
                                {formatUsd(calculatedAmount)}
                            </div>
                        </div>

                        <div className="relative mt-10">
                            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>Объём просмотров</span>
                                <span className="rounded-lg border border-brand-border bg-brand-bg px-2.5 py-1 font-mono text-brand-accent">
                                    {viewsMillions.toLocaleString('ru-RU')}
                                    {viewsMillions >= 50 ? '+' : ''}M
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={50}
                                step={1}
                                value={viewsMillions}
                                onChange={(e) => setViewsMillions(Number(e.target.value))}
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-border accent-brand-accent"
                                aria-label="Объём просмотров в миллионах"
                            />
                            <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-600">
                                <span>1M</span>
                                <span>50M+</span>
                            </div>
                        </div>

                        <p className="relative mt-8 text-center text-[11px] leading-relaxed text-slate-600">
                            Расчёт ориентировочный и основан на средних ставках платформы — точные условия зависят от
                            конкретного оффера, кампании или партнёрского соглашения.
                        </p>
                    </div>
                </div>
            </section>

            {/* --- How it works ---------------------------------------------------------------------- */}
            <section id="how-it-works" className="relative border-t border-brand-border/60 py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <SectionLabel>Процесс</SectionLabel>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Как это работает
                        </h2>
                        <p className="mt-4 text-sm text-slate-400 sm:text-base">
                            От первого сообщения боту до первой выплаты — четыре простых шага, без анкет и ожидания
                            одобрения службой безопасности.
                        </p>
                    </div>

                    <div className="relative mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="pointer-events-none absolute left-0 right-0 top-11 hidden h-px bg-gradient-to-r from-transparent via-brand-border to-transparent lg:block" />
                        {STEPS.map((step, index) => (
                            <div key={step.title} className="relative">
                                <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-0">
                                    <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/30 bg-brand-bg text-brand-accent ring-4 ring-brand-bg">
                                        <step.icon className="h-[1.125rem] w-[1.125rem]" />
                                    </div>
                                    <div className="font-mono text-xs font-bold text-slate-600 lg:mt-4">
                                        Шаг {index + 1}
                                    </div>
                                </div>
                                <h4 className="mt-3 text-base font-bold text-white">{step.title}</h4>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Trust / advantages ------------------------------------------------------------------ */}
            <section id="trust" className="relative border-t border-brand-border/60 py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <SectionLabel>Надежность</SectionLabel>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Платформе можно доверять
                        </h2>
                        <p className="mt-4 text-sm text-slate-400 sm:text-base">
                            Прозрачность и безопасность — не лозунг, а то, как устроена каждая транзакция внутри UGC
                            Flow.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {TRUST_POINTS.map((point) => (
                            <div
                                key={point.title}
                                className="group relative overflow-hidden rounded-2xl border border-brand-border bg-brand-card/50 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-success/40"
                            >
                                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-success/0 blur-2xl transition-colors group-hover:bg-brand-success/10" />
                                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-brand-success/30 bg-brand-success/10 text-brand-success">
                                    <point.icon className="h-[1.125rem] w-[1.125rem]" />
                                </div>
                                <h4 className="relative mt-4 text-sm font-bold text-white">{point.title}</h4>
                                <p className="relative mt-2 text-xs leading-relaxed text-slate-400">{point.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Footer CTA ---------------------------------------------------------------------------- */}
            <section className="relative border-t border-brand-border/60 py-20 sm:py-28">
                <div className="mx-auto max-w-4xl px-5 sm:px-8">
                    <div className="relative overflow-hidden rounded-3xl border border-brand-accent/30 bg-gradient-to-br from-brand-card via-brand-card to-brand-bg p-10 text-center sm:p-16">
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-accent/20 blur-[100px]" />
                        </div>

                        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                            <Rocket className="h-6 w-6" />
                        </div>

                        <h2 className="relative mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Готовы начать зарабатывать?
                        </h2>
                        <p className="relative mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
                            Присоединяйтесь к UGC Flow прямо сейчас — регистрация занимает меньше двух минут и
                            проходит полностью внутри Telegram.
                        </p>

                        <div className="relative mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                            <a
                                href={botUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent px-8 py-4 text-sm font-bold text-brand-bg shadow-[0_0_40px_-10px_rgba(56,189,248,0.6)] transition-all hover:bg-brand-accentHover sm:w-auto"
                            >
                                <Send className="h-4 w-4" />
                                Открыть бота в Telegram
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                        </div>

                        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-success" />
                                Без комиссии на вывод
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-success" />
                                Выплаты в USDT TRC-20
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-success" />
                                Поддержка 24/7
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Footer ------------------------------------------------------------------------------- */}
            <footer className="relative border-t border-brand-border/60 py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Video className="h-4 w-4 text-brand-accent" />
                        UGC Flow
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
                        <a href="#audiences" onClick={scrollToId('audiences')} className="transition-colors hover:text-slate-300">
                            О платформе
                        </a>
                        <a href={botUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-slate-300">
                            Telegram
                        </a>
                        <span>Поддержка — в боте, 24/7</span>
                    </div>
                    <div className="text-xs text-slate-600">© {new Date().getFullYear()} UGC Flow</div>
                </div>
            </footer>
        </div>
    );
}
