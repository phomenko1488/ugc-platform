import React, {useEffect, useMemo, useRef, useState} from 'react';
import {motion, useReducedMotion} from 'framer-motion';
import {
    Workflow,
    ArrowRight,
    ArrowUpRight,
    Megaphone,
    Handshake,
    Wallet2,
    ShieldCheck,
    Gauge,
    Eye,
    Percent,
    BarChart3,
    Zap,
    Send,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Users,
    LayoutDashboard,
    KeyRound,
    Video,
    Dices,
    LogIn,
    Activity,
    Lock,
    RefreshCcw,
    Menu,
    X,
    Cpu,
    Film,
    PlaySquare,
    Tv,
    Share2,
    Layers,
    CheckSquare,
    ShieldAlert,
    HelpCircle,
    ChevronDown,
} from 'lucide-react';
import HeroTrafficConverter from './HeroTrafficConverter';

const TELEGRAM_BASE_URL = 'https://t.me/';
const BRAND_NAME = 'Selika';
const BRAND_DOMAIN = 'selika.net';

const MARGIN_PERCENT = 25;
const PARTNER_REVSHARE_PERCENT = 15;

function ratesForCpm(advertiserCpm) {
    return {
        worker: {cpmPerMillion: advertiserCpm * (1 - MARGIN_PERCENT / 100), label: 'Доход криэйтора'},
        advertiser: {cpmPerMillion: advertiserCpm, label: 'Бюджет кампании'},
        partner: {cpmPerMillion: advertiserCpm * (PARTNER_REVSHARE_PERCENT / 100), label: 'Доход по RevShare'},
    };
}

const NAV_ITEMS = [
    {id: 'overview', label: 'Обзор'},
    {id: 'problem', label: 'Проблема и решение'},
    {id: 'roles', label: 'Роли'},
    {id: 'calculator', label: 'Калькулятор'},
    {id: 'telemetry', label: 'Видео-потоки'},
    {id: 'lifecycle', label: 'Пайплайн'},
    {id: 'inspector', label: 'Live-инспектор'},
    {id: 'faq', label: 'FAQ'},
];

const ROLES = [
    {
        key: 'worker',
        label: 'Криэйторам',
        shortLabel: 'Криэйтор',
        icon: Video,
        headline: 'Ставка известна заранее — оплата приходит без переговоров',
        description:
            'Берите готовые офферы, публикуйте ролики в TikTok, Reels и YouTube Shorts и получайте оплату за подтверждённые просмотры по ставке, зафиксированной ещё до старта.',
        points: [
            {
                icon: Zap,
                title: 'Старт за 2 минуты',
                text: 'Регистрация через Telegram, без анкет и порогов входа по аудитории.'
            },
            {
                icon: Gauge,
                title: 'Фиксированный CPM',
                text: 'Ставка за 1 000 000 просмотров зафиксирована в оффере — не меняется задним числом.'
            },
            {
                icon: Wallet2,
                title: 'Крипто-выплаты',
                text: 'USDT в сети TRC-20 — без банков, конвертации и ожидания в несколько дней.'
            },
        ],
    },
    {
        key: 'advertiser',
        label: 'Рекламодателям',
        shortLabel: 'Рекламодатель',
        icon: Megaphone,
        headline: 'Закупайте трафик, не теряя контроль над бюджетом',
        description:
            'Запускайте кампании и получайте трафик от сети проверенных криэйторов — с полной видимостью по каждому просмотру, лимитами на выплату и защитой от накрутки.',
        points: [
            {
                icon: Eye,
                title: 'Traffic Inspector',
                text: 'Автор, платформа, динамика просмотров, статус холда — по каждому ролику отдельно.'
            },
            {
                icon: ShieldCheck,
                title: 'Лимиты и модерация',
                text: 'Капа на выплату за один ролик и двухуровневая проверка исключают переплату.'
            },
            {
                icon: Dices,
                title: 'Интеграция с казино',
                text: 'Ключи доступа и вебхуки передают события трафика прямо в вашу инфраструктуру.'
            },
        ],
    },
    {
        key: 'partner',
        label: 'B2B-партнёрам',
        shortLabel: 'Партнёр',
        icon: Handshake,
        headline: 'Приводите рекламодателей — получайте процент с оборота',
        description:
            'Подключайте рекламодателей к платформе и получайте RevShare с их активности — комиссия начисляется автоматически на каждой транзакции.',
        points: [
            {
                icon: Users,
                title: 'Закреплённые бренды',
                text: 'Приведённый рекламодатель остаётся за вами на всё время работы на платформе.'
            },
            {
                icon: Percent,
                title: 'Гибкая ставка',
                text: 'Процент от маржи платформы или от валового оборота — на выбор при подключении.'
            },
            {
                icon: BarChart3,
                title: 'CRM в реальном времени',
                text: 'Каждый рекламодатель, его кампании и оборот — в одном личном кабинете.'
            },
        ],
    },
];

const PROBLEM_SOLUTION = [
    {
        problem: 'Трафик закупается вручную — через десятки чатов, таблиц и личных договорённостей',
        solution: 'Офферы, криэйторы и бюджеты кампаний — в единой инфраструктуре с историей по каждой сделке',
    },
    {
        problem: 'Выплаты идут через посредников без единого источника правды о том, что кому причитается',
        solution: 'Прямые крипто-выплаты по фиксированному алгоритму холдов — без ручных сверок',
    },
    {
        problem: 'Накрутка просмотров и приписки съедают часть бюджета незаметно для рекламодателя',
        solution: 'Двухуровневая модерация и лимит выплаты на один ролик — до, а не после списания бюджета',
    },
    {
        problem: 'Бэкенд казино узнаёт о конверсии постфактум, из ручного отчёта раз в неделю',
        solution: 'Вебхуки и уведомления доставляют события трафика в вашу систему в момент, когда они произошли',
    },
];

const VIDEO_PLATFORM_STATS = [
    {
        platform: 'TikTok Video / Spark',
        share: '48% трафика',
        avgCheck: '$240 CPM',
        status: 'АКТИВНО',
        icon: Film,
        speed: 'Авто-аппрув за 4 мин'
    },
    {
        platform: 'YouTube Shorts',
        share: '32% трафика',
        avgCheck: '$280 CPM',
        status: 'АКТИВНО',
        icon: PlaySquare,
        speed: 'Авто-аппрув за 6 мин'
    },
    {
        platform: 'Instagram Reels',
        share: '20% трафика',
        avgCheck: '$220 CPM',
        status: 'АКТИВНО',
        icon: Tv,
        speed: 'Авто-аппрув за 5 мин'
    },
];

const LIFECYCLE_STEPS = [
    {
        step: '01',
        title: 'Отправка ссылки',
        desc: 'Криэйтор скидывает ссылку на ролик (TikTok, Reels, Shorts) в Telegram-бот платформы.',
        icon: Send
    },
    {
        step: '02',
        title: 'Антифрод проверка',
        desc: 'ИИ-фильтр анализирует гео-распределение, удержание и отсутствие накрутки ботов.',
        icon: ShieldCheck
    },
    {
        step: '03',
        title: 'Фиксация просмотров',
        desc: 'Система фиксирует целевые просмотры и автоматически рассчитывает выплату по фиксированному CPM.',
        icon: BarChart3
    },
    {
        step: '04',
        title: 'Выплата в USDT',
        desc: 'Средства мгновенно уходят на кошелек криэйтора в сети TRC-20 без комиссий системы.',
        icon: Wallet2
    },
];

const FAQ_ITEMS = [
    {
        q: 'Как быстро происходит выплата после подтверждения просмотров?',
        a: 'Выплаты обрабатываются автоматически в сети USDT TRC-20 сразу после прохождения холдового периода и антифрод-проверки ролика. Обычно весь процесс занимает от нескольких минут до часа.',
    },
    {
        q: 'Нужно ли устанавливать сторонние приложения или регистрироваться на сайте?',
        a: 'Нет. Вся экосистема платформы интегрирована в Telegram-бот. Регистрация, выбор офферов, отправка ссылок на ролики и трекинг баланса происходят прямо в мессенджере за пару кликов.',
    },
    {
        q: 'Как защищены рекламодатели от накрутки ботов и просмотров?',
        a: 'Система Traffic Inspector анализирует удержание аудитории, географию просмотров и динамику набора охватов. На подозрительный трафик автоматически накладывается холд или блок до ручной проверки модератором.',
    },
    {
        q: 'Какие требования к аккаунтам криэйторов и минимальному порогу входа?',
        a: 'Никаких жестких требований по количеству подписчиков нет. Вы можете заливать ролики с новых или прогретых аккаунтов TikTok, Instagram Reels и YouTube Shorts — оплата идет строго за целевые просмотры по зафиксированному CPM.',
    }
];

const LIVE_STREAM_EVENTS = [
    {
        tx: '8f2c••••e91a',
        author: 'cr••••ip',
        geo: 'LATAM',
        views: '1.4M',
        amount: 350.00,
        status: 'SETTLED',
        node: 'TikTok · Spark',
        time: 'сек назад'
    },
    {
        tx: '4a0d••••c220',
        author: 're••••ng',
        geo: 'T1',
        views: '850K',
        amount: 212.50,
        status: 'SETTLED',
        node: 'Shorts · Stream',
        time: '3 сек назад'
    },
    {
        tx: 'e91f••••0a8c',
        author: 'sl••••er',
        geo: 'CIS',
        views: '2.1M',
        amount: 525.00,
        status: 'HOLD',
        node: 'Reels · Check',
        time: '8 сек назад'
    },
    {
        tx: '02bb••••44f1',
        author: 'ti••••ow',
        geo: 'APAC',
        views: '620K',
        amount: 155.00,
        status: 'SETTLED',
        node: 'TikTok · Spark',
        time: '14 сек назад'
    },
    {
        tx: 'c77a••••9de3',
        author: 'be••••er',
        geo: 'LATAM',
        views: '3.4M',
        amount: 850.00,
        status: 'VERIFY',
        node: 'Shorts · AntiBot',
        time: '22 сек назад'
    },
];

const METRICS_TAPE_ROWS = [
    {views: '+1.4M просмотров', amount: 350.00, geo: 'LATAM', status: 'SETTLED'},
    {views: '+850K просмотров', amount: 212.50, geo: 'T1', status: 'SETTLED'},
    {views: '+2.1M просмотров', amount: 525.00, geo: 'CIS', status: 'HOLD'},
    {views: '+620K просмотров', amount: 155.00, geo: 'APAC', status: 'SETTLED'},
    {views: '+3.4M просмотров', amount: 850.00, status: 'VERIFY'},
    {views: '+1.9M просмотров', amount: 475.00, geo: 'MENA', status: 'SETTLED'},
];

const LEDGER_STATUS_META = {
    SETTLED: 'text-brand-success',
    HOLD: 'text-brand-warning',
    VERIFY: 'text-brand-accent',
};

function formatUsd(value) {
    return value.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function SectionLabel({children}) {
    return (
        <div
            className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-brand-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse"/>
            {children}
        </div>
    );
}

function MetricsTape({dense = false}) {
    const rows = [...METRICS_TAPE_ROWS, ...METRICS_TAPE_ROWS];
    return (
        <div className={`overflow-hidden border-y border-brand-border/70 ${dense ? 'py-2.5' : 'py-4'}`}>
            <div className="animate-ledger-tape flex w-max items-center gap-8 font-mono text-xs">
                {rows.map((row, i) => (
                    <div key={i} className="flex shrink-0 items-center gap-3 whitespace-nowrap">
                        <span className="text-brand-accent font-semibold">{row.views}</span>
                        <span className="text-[#f1eee6]">${formatUsd(row.amount)} заработано</span>
                        <span className="text-ash/60">{row.geo}</span>
                        <span className={`font-semibold ${LEDGER_STATUS_META[row.status]}`}>{row.status}</span>
                        <span className="text-brand-border">/</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const HERO_CONTAINER_VARIANTS = {
    hidden: {},
    show: {transition: {staggerChildren: 0.1, delayChildren: 0.05}},
};

function heroItemVariants(prefersReducedMotion) {
    return {
        hidden: {opacity: 0, y: prefersReducedMotion ? 0 : 22},
        show: {
            opacity: 1,
            y: 0,
            transition: prefersReducedMotion
                ? {duration: 0.4}
                : {type: 'spring', stiffness: 300, damping: 30, mass: 0.9},
        },
    };
}

export default function LandingPage({botUsername = 'selika_bot', onLoginClick}) {
    const prefersReducedMotion = useReducedMotion();
    const heroItem = useMemo(() => heroItemVariants(prefersReducedMotion), [prefersReducedMotion]);
    const [activeRole, setActiveRole] = useState('worker');
    const [viewsMillions, setViewsMillions] = useState(10);
    const [cpmBase, setCpmBase] = useState(250);
    const [activeSection, setActiveSection] = useState('overview');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [streamFilter, setStreamFilter] = useState('ALL');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${BRAND_NAME} — инфраструктура трафика, криэйторов и выплат`;
        return () => {
            document.title = previousTitle;
        };
    }, []);

    useEffect(() => {
        const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
        if (!sections.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {rootMargin: '-20% 0px -70% 0px', threshold: 0}
        );
        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, []);

    const botUrl = `${TELEGRAM_BASE_URL}${botUsername}`;
    const role = ROLES.find((r) => r.key === activeRole) ?? ROLES[0];
    const calculatorRates = useMemo(() => ratesForCpm(cpmBase), [cpmBase]);
    const rate = calculatorRates[activeRole] ?? calculatorRates.worker;

    const calculatedAmount = useMemo(
        () => viewsMillions * rate.cpmPerMillion,
        [viewsMillions, rate.cpmPerMillion]
    );

    const scrollToId = (id) => (e) => {
        e.preventDefault();
        setMobileNavOpen(false);
        document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    const filteredEvents = useMemo(() => {
        if (streamFilter === 'ALL') return LIVE_STREAM_EVENTS;
        return LIVE_STREAM_EVENTS.filter((e) => e.status === streamFilter);
    }, [streamFilter]);

    return (
        <div
            className="relative min-h-screen w-full overflow-x-hidden bg-brand-bg font-sans text-[#f1eee6] antialiased">
            {/* --- Left rail (desktop) ----------------------------------------------------------- */}
            <aside
                className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-brand-border/80 bg-brand-bg px-7 py-9 lg:flex">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-accent shadow-lg">
                            <Workflow className="h-4 w-4"/>
                        </div>
                        <span
                            className="font-display text-xl uppercase tracking-tight text-[#f1eee6]">{BRAND_NAME}</span>
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
                        {BRAND_DOMAIN}
                    </div>

                    <nav className="relative mt-12 space-y-1 border-l border-brand-border pl-5">
                        {NAV_ITEMS.map((item) => {
                            const isActive = activeSection === item.id;
                            return (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    onClick={scrollToId(item.id)}
                                    className="relative block py-2 text-sm transition-colors"
                                >
                                    <span
                                        className={`absolute -left-5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r transition-colors ${
                                            isActive ? 'bg-brand-accent' : 'bg-transparent'
                                        }`}
                                    />
                                    <span
                                        className={isActive ? 'font-semibold text-[#f1eee6]' : 'text-ash hover:text-[#f1eee6]'}>
                                        {item.label}
                                    </span>
                                </a>
                            );
                        })}
                    </nav>
                </div>

                <div className="space-y-3">
                    {onLoginClick && (
                        <button
                            type="button"
                            onClick={onLoginClick}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card px-4 py-3 text-sm font-medium text-ash transition-all hover:border-brand-accent/50 hover:text-[#f1eee6]"
                        >
                            <LogIn className="h-3.5 w-3.5 text-brand-accent"/>
                            Войти в кабинет
                        </button>
                    )}
                    <a
                        href={botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-bg shadow-lg shadow-brand-accent/15 transition-all hover:bg-brand-accentHover"
                    >
                        <Send className="h-3.5 w-3.5"/>
                        Открыть бота
                    </a>
                </div>
            </aside>

            {/* --- Top bar (mobile) -------------------------------------------------------------- */}
            <header
                className="sticky top-0 z-50 flex items-center justify-between border-b border-brand-border/80 bg-brand-bg/90 px-5 py-4 backdrop-blur-md lg:hidden">
                <div className="flex items-center gap-2.5">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-border bg-brand-card text-brand-accent">
                        <Workflow className="h-4 w-4"/>
                    </div>
                    <span className="font-display text-lg uppercase tracking-tight text-[#f1eee6]">{BRAND_NAME}</span>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-2 text-xs font-semibold text-brand-bg"
                    >
                        <Send className="h-3.5 w-3.5"/>
                        Бот
                    </a>
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-border text-ash"
                        aria-label="Меню"
                    >
                        {mobileNavOpen ? <X className="h-4 w-4"/> : <Menu className="h-4 w-4"/>}
                    </button>
                </div>
            </header>
            {mobileNavOpen && (
                <div className="sticky top-[57px] z-50 border-b border-brand-border bg-brand-card px-5 py-4 lg:hidden">
                    <nav className="flex flex-col gap-1.5">
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={scrollToId(item.id)}
                                className={`rounded-md px-3 py-2 text-sm ${
                                    activeSection === item.id ? 'bg-brand-bg text-[#f1eee6] font-semibold' : 'text-ash'
                                }`}
                            >
                                {item.label}
                            </a>
                        ))}
                        {onLoginClick && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileNavOpen(false);
                                    onLoginClick();
                                }}
                                className="mt-2 flex items-center gap-2 rounded-md border border-brand-border px-3 py-2.5 text-left text-sm text-ash bg-brand-bg"
                            >
                                <LogIn className="h-3.5 w-3.5 text-brand-accent"/>
                                Войти в кабинет
                            </button>
                        )}
                    </nav>
                </div>
            )}

            {/* --- Main content ------------------------------------------------------------------- */}
            <div className="lg:pl-64">
                {/* --- Hero ---------------------------------------------------------------------- */}
                <section id="overview" className="scroll-mt-20 border-b border-brand-border/70 relative">
                    <div
                        className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-brand-accent/5 blur-3xl pointer-events-none"/>
                    <div className="px-6 pb-16 pt-20 sm:px-12 sm:pt-24 lg:px-16">
                        <motion.div
                            variants={HERO_CONTAINER_VARIANTS}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10"
                        >
                            <div className="max-w-3xl">
                                <motion.div variants={heroItem}>
                                    <SectionLabel>Инфраструктура автоматизации видео-трафика</SectionLabel>
                                </motion.div>
                                <motion.h1
                                    variants={heroItem}
                                    className="mt-6 font-display text-[12vw] uppercase leading-[0.92] tracking-tight text-[#f1eee6] sm:text-6xl lg:text-7xl"
                                >
                                    Ролики в топ.
                                    <br/>
                                    <span className="text-brand-accent">Выплаты в USDT.</span>
                                </motion.h1>
                                <motion.p
                                    variants={heroItem}
                                    className="mt-7 max-w-xl text-base leading-relaxed text-ash sm:text-lg"
                                >
                                    {BRAND_NAME} объединяет сети видео-криэйторов, автоматический учет просмотров из
                                    TikTok, Reels и Shorts и мгновенные крипто-расчеты.
                                </motion.p>

                                <motion.div variants={heroItem} className="mt-10 flex flex-col gap-3.5 sm:flex-row">
                                    <motion.a
                                        href={botUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={prefersReducedMotion ? undefined : {
                                            scale: 1.02,
                                            transition: {type: 'spring', stiffness: 400, damping: 22},
                                        }}
                                        whileTap={prefersReducedMotion ? undefined : {
                                            scale: 0.98,
                                            transition: {type: 'spring', stiffness: 500, damping: 30},
                                        }}
                                        transition={{type: 'spring', stiffness: 300, damping: 25}}
                                        className="group flex items-center justify-center gap-2 rounded-lg bg-brand-accent px-7 py-4 text-sm font-semibold text-brand-bg shadow-xl shadow-brand-accent/20 transition-colors hover:bg-brand-accentHover"
                                    >
                                        <Send className="h-4 w-4"/>
                                        Запустить через Telegram
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                    </motion.a>
                                    {onLoginClick && (
                                        <motion.button
                                            type="button"
                                            onClick={onLoginClick}
                                            whileHover={prefersReducedMotion ? undefined : {
                                                scale: 1.02,
                                                transition: {type: 'spring', stiffness: 400, damping: 22},
                                            }}
                                            whileTap={prefersReducedMotion ? undefined : {
                                                scale: 0.98,
                                                transition: {type: 'spring', stiffness: 500, damping: 30},
                                            }}
                                            transition={{type: 'spring', stiffness: 300, damping: 25}}
                                            className="flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card/60 px-7 py-4 text-sm font-semibold text-[#f1eee6] backdrop-blur transition-colors hover:border-brand-accent/50 hover:bg-brand-card"
                                        >
                                            <LogIn className="h-4 w-4 text-brand-accent"/>
                                            Войти в систему
                                        </motion.button>
                                    )}
                                </motion.div>
                            </div>

                            <HeroTrafficConverter/>
                        </motion.div>
                    </div>

                    <MetricsTape/>
                </section>

                {/* --- Problem -> Solution ------------------------------------------------------------- */}
                <section id="problem"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl">
                        <SectionLabel>Архитектура превосходства</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Индустрия теряет бюджеты на рутине. Мы автоматизируем каждый шаг.
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Сравните ручной подход в чатах и таблицах с бескомпромиссной точностью {BRAND_NAME}.
                        </p>
                    </div>

                    <div className="mt-12 overflow-hidden rounded-xl border border-brand-border bg-brand-card/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-brand-border">
                            <div
                                className="bg-brand-card/80 px-6 py-4 font-mono text-xs uppercase tracking-wider text-ash sm:border-r sm:border-brand-border flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-brand-danger"/>
                                Ручное управление и хаос
                            </div>
                            <div
                                className="bg-brand-accent/[0.08] px-6 py-4 font-mono text-xs uppercase tracking-wider text-brand-accent flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-brand-success"/>
                                Инфраструктура {BRAND_NAME}
                            </div>
                        </div>
                        {PROBLEM_SOLUTION.map((row, i) => (
                            <div key={i}
                                 className={`grid grid-cols-1 sm:grid-cols-2 ${i > 0 ? 'border-t border-brand-border' : ''}`}>
                                <div
                                    className="flex items-start gap-3.5 px-6 py-5 sm:border-r sm:border-brand-border bg-brand-bg/30">
                                    <span
                                        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-danger/10 text-brand-danger text-xs font-bold">✕</span>
                                    <p className="text-sm text-ash leading-relaxed">{row.problem}</p>
                                </div>
                                <div className="flex items-start gap-3.5 px-6 py-5 bg-brand-accent/[0.03]">
                                    <span
                                        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-success/10 text-brand-success text-xs font-bold">✓</span>
                                    <p className="text-sm text-[#f1eee6] leading-relaxed">{row.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- Roles ----------------------------------------------------------------------------- */}
                <section id="roles"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl">
                        <SectionLabel>Экосистема участников</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Инструменты под каждую задачу
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Платформа создана с учетом интересов всех участников рынка: от автономных криэйторов до
                            крупных операторов.
                        </p>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-2 border-b border-brand-border pb-px">
                        {ROLES.map((r) => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => setActiveRole(r.key)}
                                className={`flex items-center gap-2.5 rounded-t-lg border-t border-x px-5 py-3.5 text-sm font-semibold transition-all ${
                                    activeRole === r.key
                                        ? 'border-brand-border bg-brand-card text-[#f1eee6] shadow-sm'
                                        : 'border-transparent text-ash hover:text-[#f1eee6] bg-brand-bg'
                                }`}
                            >
                                <r.icon
                                    className={`h-4 w-4 ${activeRole === r.key ? 'text-brand-accent' : 'text-ash'}`}/>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-b-xl rounded-tr-xl border border-brand-border bg-brand-card/60 p-8 sm:p-10">
                        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12 items-center">
                            <div className="lg:col-span-2">
                                <h3 className="font-display text-2xl uppercase tracking-tight text-[#f1eee6] sm:text-3xl leading-snug">
                                    {role.headline}
                                </h3>
                                <p className="mt-4 text-sm leading-relaxed text-ash">{role.description}</p>
                                <a
                                    href={botUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-accent transition-colors hover:text-brand-accentHover"
                                >
                                    Начать работу в роли {role.shortLabel.toLowerCase()}
                                    <ChevronRight className="h-4 w-4"/>
                                </a>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
                                {role.points.map((point) => (
                                    <div key={point.title}
                                         className="rounded-lg border border-brand-border bg-brand-bg/80 p-5 shadow-sm transition-transform hover:-translate-y-1">
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-card border border-brand-border text-brand-accent">
                                            <point.icon className="h-4 w-4"/>
                                        </div>
                                        <h4 className="mt-4 text-sm font-semibold text-[#f1eee6]">{point.title}</h4>
                                        <p className="mt-2 text-xs leading-relaxed text-ash">{point.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Calculator ---------------------------------------------------------------------- */}
                <section id="calculator"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl">
                        <SectionLabel>Финансовое моделирование</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Калькулятор доходности
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Настройте объем просмотров и базовый CPM для оценки потенциала кампании или заработка.
                        </p>
                    </div>

                    <div
                        className="mt-12 rounded-xl border border-brand-border bg-brand-card/50 p-6 sm:p-10 shadow-2xl">
                        <div className="flex flex-wrap gap-2.5 pb-6 border-b border-brand-border">
                            {ROLES.map((r) => (
                                <button
                                    key={r.key}
                                    type="button"
                                    onClick={() => setActiveRole(r.key)}
                                    className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
                                        activeRole === r.key
                                            ? 'border-brand-accent bg-brand-accent/10 text-brand-accent shadow-sm'
                                            : 'border-brand-border bg-brand-bg text-ash hover:text-[#f1eee6]'
                                    }`}
                                >
                                    {r.shortLabel}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                            <div
                                className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-brand-border pb-6 lg:pb-0 lg:pr-8">
                                <div className="font-mono text-xs font-semibold uppercase tracking-wider text-ash">
                                    {rate.label}
                                </div>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="font-display text-3xl text-brand-accent">$</span>
                                    <span
                                        className="font-display text-5xl uppercase tracking-tight text-[#f1eee6] sm:text-6xl">
                                        {formatUsd(calculatedAmount)}
                                    </span>
                                </div>
                                <div className="mt-3 font-mono text-[11px] text-ash/80">
                                    {viewsMillions.toLocaleString('ru-RU')}M просмотров по ставке
                                    ${formatUsd(rate.cpmPerMillion)} / 1M
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <div
                                        className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-ash">
                                        <span>Объём просмотров в месяц</span>
                                        <span
                                            className="rounded border border-brand-border bg-brand-bg px-2.5 py-1 text-brand-accent">
                                            {viewsMillions.toLocaleString('ru-RU')}M просмотров
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={50}
                                        step={1}
                                        value={viewsMillions}
                                        onChange={(e) => setViewsMillions(Number(e.target.value))}
                                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-brand-bg accent-brand-accent border border-brand-border"
                                    />
                                </div>

                                <div>
                                    <div
                                        className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-ash">
                                        <span>Базовая ставка CPM</span>
                                        <span
                                            className="rounded border border-brand-border bg-brand-bg px-2.5 py-1 text-brand-accent">
                                            ${cpmBase} за 1M
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={100}
                                        max={2000}
                                        step={25}
                                        value={cpmBase}
                                        onChange={(e) => setCpmBase(Number(e.target.value))}
                                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-brand-bg accent-brand-accent border border-brand-border"
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="mt-8 pt-6 border-t border-brand-border text-xs text-ash/70 leading-relaxed">
                            Расчет является демонстрационным. Финальные условия и маржинальность платформы фиксируются в
                            момент подписания оффера или запуска потока.
                        </p>
                    </div>
                </section>

                {/* --- Video Platforms & Telemetry Matrix ---------------------------------- */}
                <section id="telemetry"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl mb-12">
                        <SectionLabel>Видео-экосистема</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Интеграция с ключевыми видео-площадками
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Автоматический трекинг роликов в TikTok, Shorts и Reels с защитой от накрутки и быстрой
                            верификацией просмотров.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {VIDEO_PLATFORM_STATS.map((item, index) => (
                            <div key={index}
                                 className="rounded-xl border border-brand-border bg-brand-card/60 p-6 relative overflow-hidden transition-all hover:border-brand-accent/40">
                                <div
                                    className="absolute top-0 right-0 h-24 w-24 rounded-full bg-brand-accent/5 blur-2xl pointer-events-none"/>
                                <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                                    <div className="flex items-center gap-2.5">
                                        <item.icon className="h-4 w-4 text-brand-accent"/>
                                        <span
                                            className="font-mono text-sm font-bold text-[#f1eee6]">{item.platform}</span>
                                    </div>
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-bg px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand-success">
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand-success animate-pulse"/>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 font-mono text-xs">
                                    <div>
                                        <span className="text-ash/70 block text-[10px] uppercase">Доля в сети</span>
                                        <span
                                            className="text-[#f1eee6] font-bold text-sm mt-0.5 block">{item.share}</span>
                                    </div>
                                    <div>
                                        <span className="text-ash/70 block text-[10px] uppercase">Средний CPM</span>
                                        <span
                                            className="text-brand-accent font-bold text-sm mt-0.5 block">{item.avgCheck}</span>
                                    </div>
                                </div>
                                <div
                                    className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between font-mono text-[11px] text-ash">
                                    <span>Режим: {item.speed}</span>
                                    <Share2 className="h-3.5 w-3.5 text-ash/60"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- Submission Lifecycle Pipeline --------------------------------------- */}
                <section id="lifecycle"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl mb-12">
                        <SectionLabel>Пайплайн расчётов</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Жизненный цикл ролика: от залива до выплаты
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Четыре простых шага автоматизированного конвейера исключают человеческий фактор и задержки
                            выплат.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {LIFECYCLE_STEPS.map((item, index) => (
                            <div key={index}
                                 className="rounded-xl border border-brand-border bg-brand-card/60 p-6 relative flex flex-col justify-between transition-all hover:border-brand-accent/50">
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <span
                                            className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-brand-bg border border-brand-border text-brand-accent">
                                            ШАГ {item.step}
                                        </span>
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-bg border border-brand-border text-brand-accent">
                                            <item.icon className="h-4 w-4"/>
                                        </div>
                                    </div>
                                    <h3 className="font-display text-lg uppercase tracking-tight text-[#f1eee6] mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs leading-relaxed text-ash">
                                        {item.desc}
                                    </p>
                                </div>
                                <div
                                    className="mt-6 pt-4 border-t border-brand-border/60 flex items-center justify-between font-mono text-[10px] text-ash/60">
                                    <span>Статус: Автоматически</span>
                                    <span className="text-brand-success font-semibold">100% Secure</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- Live Inspector Section (With masked usernames & TRX hashes) ------------ */}
                <section id="inspector"
                         className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <SectionLabel>Live-мониторинг</SectionLabel>
                            <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                                Инспектор трафика и выплат в реальном времени
                            </h2>
                            <p className="mt-4 text-sm text-ash max-w-xl">
                                Прозрачность каждого потока: от загрузки ролика до мгновенного подтверждения и выплаты в
                                USDT TRC-20.
                            </p>
                        </div>
                        <div
                            className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-card p-1">
                            {['ALL', 'SETTLED', 'HOLD'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStreamFilter(filter)}
                                    className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-medium transition-all ${
                                        streamFilter === filter
                                            ? 'bg-brand-accent text-brand-bg shadow'
                                            : 'text-ash hover:text-[#f1eee6]'
                                    }`}
                                >
                                    {filter === 'ALL' ? 'Все события' : filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-brand-border bg-brand-card/60 overflow-hidden shadow-xl">
                        <div
                            className="grid grid-cols-12 gap-4 border-b border-brand-border bg-brand-card/90 px-6 py-3.5 font-mono text-[11px] uppercase tracking-wider text-ash">
                            <div className="col-span-4 sm:col-span-3">TRX Хэш сети</div>
                            <div className="col-span-3 sm:col-span-3">Криэйтор / ГЕО</div>
                            <div className="col-span-2 sm:col-span-2 text-right">Сумма</div>
                            <div className="col-span-3 sm:col-span-4 text-right">Площадка / Статус</div>
                        </div>

                        <div className="divide-y divide-brand-border/60">
                            {filteredEvents.map((ev, i) => (
                                <div key={i}
                                     className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-colors hover:bg-brand-card/80 font-mono text-xs">
                                    <div
                                        className="col-span-4 sm:col-span-3 font-semibold text-brand-accent flex items-center gap-1.5">
                                        <span className="text-ash/40">#</span>
                                        {ev.tx}
                                    </div>
                                    <div
                                        className="col-span-3 sm:col-span-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span className="text-[#f1eee6] font-medium tracking-wider">@{ev.author}</span>
                                        <span
                                            className="rounded bg-brand-bg px-1.5 py-0.5 text-[10px] text-ash w-max border border-brand-border">{ev.geo}</span>
                                    </div>
                                    <div className="col-span-2 sm:col-span-2 text-right">
                                        <div className="text-[#f1eee6] font-medium">${formatUsd(ev.amount)}</div>
                                        <div className="text-ash/60 text-[10px]">{ev.views} просм.</div>
                                    </div>
                                    <div className="col-span-3 sm:col-span-4 flex items-center justify-end gap-3">
                                        <span
                                            className="hidden lg:inline-flex items-center gap-1 text-[10px] text-ash/70 bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                                            <Video className="h-3 w-3 text-brand-accent"/>
                                            {ev.node}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border border-brand-border bg-brand-bg ${
                                                ev.status === 'SETTLED' ? 'text-brand-success' : ev.status === 'HOLD' ? 'text-brand-warning' : 'text-brand-accent'
                                            }`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                ev.status === 'SETTLED' ? 'bg-brand-success' : ev.status === 'HOLD' ? 'bg-brand-warning' : 'bg-brand-accent animate-ping'
                                            }`}/>
                                            {ev.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div
                            className="border-t border-brand-border bg-brand-bg/60 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-ash">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-brand-success animate-pulse"/>
                                Трекинг просмотров видео работает в реальном времени
                            </div>
                            <div className="text-brand-accent flex items-center gap-1">
                                <Lock className="h-3 w-3"/>
                                Антифрод-фильтр активен
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FAQ Block -------------------------------------------------------------------- */}
                <section id="faq" className="scroll-mt-20 border-b border-brand-border/70 px-6 py-20 sm:px-12 lg:px-16">
                    <div className="max-w-2xl mb-12">
                        <SectionLabel>База знаний</SectionLabel>
                        <h2 className="mt-5 font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-4xl">
                            Часто задаваемые вопросы
                        </h2>
                        <p className="mt-4 text-sm text-ash">
                            Всё, что нужно знать о работе с платформой, расчетах и безопасности.
                        </p>
                    </div>

                    <div className="max-w-3xl space-y-4">
                        {FAQ_ITEMS.map((item, index) => {
                            const isOpen = openFaqIndex === index;
                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border border-brand-border bg-brand-card/60 overflow-hidden transition-all"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-brand-card/80"
                                    >
                                        <span className="font-semibold text-sm sm:text-base text-[#f1eee6] pr-4">
                                            {item.q}
                                        </span>
                                        <ChevronDown
                                            className={`h-5 w-5 shrink-0 text-brand-accent transition-transform duration-200 ${
                                                isOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div
                                            className="px-6 pb-6 pt-2 text-sm text-ash leading-relaxed border-t border-brand-border/40 bg-brand-bg/40">
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* --- Footer CTA ---------------------------------------------------------------------------- */}
                <section className="px-6 py-20 sm:px-12 lg:px-16">
                    <div
                        className="max-w-3xl rounded-2xl border border-brand-border bg-brand-card/80 p-8 sm:p-12 relative overflow-hidden shadow-2xl">
                        <div
                            className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-accent/10 blur-3xl pointer-events-none"/>
                        <h2 className="font-display text-3xl uppercase leading-[0.95] tracking-tight text-[#f1eee6] sm:text-5xl">
                            Готовы монетизировать видео-трафик без рисков?
                        </h2>
                        <p className="mt-4 max-w-xl text-sm sm:text-base text-ash leading-relaxed">
                            Подключайтесь к {BRAND_NAME} прямо сейчас. Интеграция и запуск первой кампании занимают
                            минимум времени.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <a
                                href={botUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center gap-2.5 rounded-lg bg-brand-accent px-8 py-4 text-sm font-semibold text-brand-bg shadow-lg shadow-brand-accent/20 transition-all hover:bg-brand-accentHover"
                            >
                                <Send className="h-4 w-4"/>
                                Открыть бота в Telegram
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
                            </a>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-xs text-ash">
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-brand-success"/>
                                Без скрытых комиссий
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-brand-success"/>
                                USDT TRC-20 мгновенно
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-brand-success"/>
                                Персональный саппорт
                            </span>
                        </div>
                    </div>
                </section>

                {/* --- Footer ------------------------------------------------------------------------------- */}
                <footer className="border-t border-brand-border/80 bg-brand-bg">
                    <MetricsTape dense/>
                    <div
                        className="flex flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row sm:px-12 lg:px-16">
                        <div
                            className="flex items-center gap-2.5 font-display text-base uppercase tracking-tight text-[#f1eee6]">
                            <Workflow className="h-4 w-4 text-brand-accent"/>
                            {BRAND_NAME}
                        </div>
                        <div
                            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-xs text-ash">
                            <a href="#problem" onClick={scrollToId('problem')}
                               className="transition-colors hover:text-[#f1eee6]">
                                Архитектура
                            </a>
                            <a href="#telemetry" onClick={scrollToId('telemetry')}
                               className="transition-colors hover:text-[#f1eee6]">
                                Видео-потоки
                            </a>
                            <a href="#lifecycle" onClick={scrollToId('lifecycle')}
                               className="transition-colors hover:text-[#f1eee6]">
                                Пайплайн
                            </a>
                            <a href="#inspector" onClick={scrollToId('inspector')}
                               className="transition-colors hover:text-[#f1eee6]">
                                Live-инспектор
                            </a>
                            <a href="#faq" onClick={scrollToId('faq')}
                               className="transition-colors hover:text-[#f1eee6]">
                                FAQ
                            </a>
                            <a href={botUrl} target="_blank" rel="noopener noreferrer"
                               className="transition-colors hover:text-[#f1eee6]">
                                Telegram Bot
                            </a>
                            {onLoginClick && (
                                <button type="button" onClick={onLoginClick}
                                        className="transition-colors hover:text-[#f1eee6]">
                                    Войти
                                </button>
                            )}
                        </div>
                        <div
                            className="font-mono text-xs text-ash/70">© {new Date().getFullYear()} {BRAND_NAME} · {BRAND_DOMAIN}</div>
                    </div>
                </footer>
            </div>
        </div>
    );
}