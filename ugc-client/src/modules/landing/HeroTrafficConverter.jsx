import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    motion,
    AnimatePresence,
    useReducedMotion,
    useMotionValue,
    useTransform,
    useSpring,
    useMotionValueEvent,
} from 'framer-motion';
import {Eye, Film, PlaySquare, Tv, CheckCircle2, ScanLine, Zap, Wallet2} from 'lucide-react';

const TRAFFIC_SAMPLES = [
    {platform: 'TikTok', node: 'TikTok · Spark', author: 'cr••••ip', views: 1250000, icon: 'tiktok'},
    {platform: 'Reels', node: 'Reels · Check', author: 'ma••••ov', views: 640000, icon: 'reels'},
    {platform: 'Shorts', node: 'Shorts · Stream', author: 'sl••••er', views: 2100000, icon: 'shorts'},
    {platform: 'TikTok', node: 'TikTok · Spark', author: 'be••••er', views: 890000, icon: 'tiktok'},
];

const TRX_HASHES = ['8f2c••••e91a', '4a0d••••c220', 'e91f••••0a8c', '02bb••••44f1', 'c77a••••9de3'];
const CPM_RATE = 250;

function amountForViews(views) {
    return (views / 1_000_000) * CPM_RATE;
}

function platformIcon(icon) {
    if (icon === 'tiktok') return Film;
    if (icon === 'shorts') return PlaySquare;
    return Tv;
}

function formatViews(n) {
    return n.toLocaleString('ru-RU');
}

function formatUsd(value) {
    return value.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

const PHASE_DURATIONS_MS = {incoming: 1500, scanning: 1200, settled: 2000};
const INITIAL_BALANCE = 12480;
const TRACK_WAYPOINTS = {incoming: 0, scanning: 92, settled: 184};

function AnimatedAmount({value, prefersReducedMotion, stiffness = 90, damping = 20, mass = 1, className = ''}) {
    const motionValue = useMotionValue(value);
    const spring = useSpring(motionValue, {stiffness, damping, mass});
    const [display, setDisplay] = useState(value);

    useEffect(() => {
        if (prefersReducedMotion) {
            setDisplay(value);
        } else {
            motionValue.set(value);
        }
    }, [value, prefersReducedMotion, motionValue]);

    useMotionValueEvent(spring, 'change', (latest) => {
        if (!prefersReducedMotion) setDisplay(latest);
    });

    return <span className={className}>{formatUsd(Math.max(0, display))}</span>;
}

function DollarParticle({angle, distance, delay, onDone}) {
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    return (
        <motion.span
            initial={{opacity: 0, x: 0, y: 0, scale: 0.4}}
            animate={{opacity: [0, 1, 0], x: dx, y: dy, scale: 1}}
            transition={{type: 'spring', stiffness: 120, damping: 14, mass: 0.6, delay}}
            onAnimationComplete={onDone}
            className="pointer-events-none absolute left-1/2 top-1/2 font-display text-sm text-brand-success"
        >
            $
        </motion.span>
    );
}

export default function HeroTrafficConverter() {
    const prefersReducedMotion = useReducedMotion();

    const [sampleIndex, setSampleIndex] = useState(0);
    const [phase, setPhase] = useState(prefersReducedMotion ? 'settled' : 'incoming');
    const [waveKey, setWaveKey] = useState(0);
    const [balance, setBalance] = useState(INITIAL_BALANCE);
    const [particles, setParticles] = useState([]);
    const timeoutRef = useRef(null);
    const settledForWaveRef = useRef(-1);

    const sample = TRAFFIC_SAMPLES[sampleIndex % TRAFFIC_SAMPLES.length];
    const trxHash = TRX_HASHES[sampleIndex % TRX_HASHES.length];
    const amount = useMemo(() => amountForViews(sample.views), [sample.views]);
    const Icon = platformIcon(sample.icon);

    const advancePhase = (nextPhase, delayMs) => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setPhase(nextPhase), delayMs);
    };

    useEffect(() => {
        if (prefersReducedMotion) return undefined;
        if (phase === 'incoming') advancePhase('scanning', PHASE_DURATIONS_MS.incoming);
        if (phase === 'scanning') advancePhase('settled', PHASE_DURATIONS_MS.scanning);
        if (phase === 'settled') {
            advancePhase('incoming', PHASE_DURATIONS_MS.settled);
        }
        return () => clearTimeout(timeoutRef.current);
    }, [phase, waveKey, prefersReducedMotion]);

    useEffect(() => {
        if (prefersReducedMotion) return;
        if (phase !== 'settled' || settledForWaveRef.current === waveKey) return;
        settledForWaveRef.current = waveKey;
        setBalance((b) => b + amount);
        const burst = Array.from({length: 5}, (_, i) => ({
            id: `${waveKey}-${i}`,
            angle: (Math.PI * 2 * i) / 5 + Math.random() * 0.5,
            distance: 34 + Math.random() * 18,
            delay: i * 0.03,
        }));
        setParticles(burst);
        const next = setTimeout(() => setSampleIndex((s) => s + 1), 40);
        return () => clearTimeout(next);
    }, [phase, waveKey]);

    const forceNewWave = () => {
        clearTimeout(timeoutRef.current);
        setParticles([]);
        setSampleIndex((s) => s + 1);
        setWaveKey((k) => k + 1);
        setPhase(prefersReducedMotion ? 'settled' : 'incoming');
    };

    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const rawRotateY = useTransform(pointerX, [-0.5, 0.5], [-8, 8]);
    const rawRotateX = useTransform(pointerY, [-0.5, 0.5], [8, -8]);
    const rotateX = useSpring(rawRotateX, {stiffness: 150, damping: 20, mass: 1});
    const rotateY = useSpring(rawRotateY, {stiffness: 150, damping: 20, mass: 1});

    const handleMouseMove = (e) => {
        if (prefersReducedMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
        pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const handleMouseLeave = () => {
        pointerX.set(0);
        pointerY.set(0);
    };

    const waveSpring = {type: 'spring', stiffness: 300, damping: 25, mass: 0.8};
    const morphSpring = {type: 'spring', stiffness: 260, damping: 22, mass: 0.7};
    const capsuleY = prefersReducedMotion ? TRACK_WAYPOINTS.settled : TRACK_WAYPOINTS[phase];

    return (
        <motion.div
            variants={{
                hidden: {opacity: 0, y: prefersReducedMotion ? 0 : 26, scale: prefersReducedMotion ? 1 : 0.97},
                show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: prefersReducedMotion
                        ? {duration: 0.5}
                        : {type: 'spring', stiffness: 220, damping: 24, mass: 1, delay: 0.25},
                },
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={prefersReducedMotion ? undefined : {rotateX, rotateY, transformPerspective: 1200}}
            className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6"
        >
            <div
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-accent/[0.06] to-transparent"/>

            <div className="flex items-center justify-between border-b border-brand-border/70 pb-4">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-success animate-pulse"/>
                    Traffic Liquidity Reactor
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#f1eee6]">
                    <Wallet2 className="h-3 w-3 text-brand-accent"/>
                    $<AnimatedAmount value={balance} prefersReducedMotion={prefersReducedMotion}/>
                </div>
            </div>

            <div className="relative mt-6" style={{height: TRACK_WAYPOINTS.settled + 72}}>
                <div className="absolute left-6 top-2 bottom-2 w-px bg-brand-border"/>

                <div
                    className="absolute left-0 top-0 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-ash/50">
                    <span
                        className="flex h-3 w-3 items-center justify-center rounded-full border border-brand-border bg-brand-bg"/>
                    Offer
                </div>
                <div
                    className="absolute left-0 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-brand-info"
                    style={{top: TRACK_WAYPOINTS.scanning + 4}}
                >
                    <span
                        className="flex h-3 w-3 items-center justify-center rounded-full border border-brand-info/50 bg-brand-info/10"/>
                    Selika
                </div>
                <div
                    className="absolute left-0 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-brand-success"
                    style={{top: TRACK_WAYPOINTS.settled + 4}}
                >
                    <span
                        className="flex h-3 w-3 items-center justify-center rounded-full border border-brand-success/50 bg-brand-success/10"/>
                    Payout
                </div>

                {!prefersReducedMotion && (
                    <motion.div
                        animate={{opacity: phase === 'scanning' ? [0.25, 0.9] : 0.12}}
                        transition={
                            phase === 'scanning'
                                ? {type: 'spring', stiffness: 120, damping: 8, repeat: Infinity, repeatType: 'mirror'}
                                : {type: 'spring', stiffness: 200, damping: 30}
                        }
                        className="absolute left-16 right-0 h-0.5 rounded-full bg-brand-accent shadow-[0_0_12px_rgba(224,90,51,0.6)]"
                        style={{top: TRACK_WAYPOINTS.scanning + 22}}
                    />
                )}

                <motion.div
                    layout
                    animate={{y: capsuleY, rotate: 0}}
                    transition={waveSpring}
                    className="absolute left-16 right-0 rounded-xl border border-brand-border bg-brand-bg/85 px-4 py-3 shadow-lg"
                >
                    <motion.div
                        animate={
                            !prefersReducedMotion && phase === 'incoming'
                                ? {rotate: [0, -1.6, 1.6, 0], y: [0, 2, -1, 0]}
                                : {rotate: 0, y: 0}
                        }
                        transition={
                            !prefersReducedMotion && phase === 'incoming'
                                ? {type: 'spring', stiffness: 60, damping: 5, repeat: Infinity, repeatType: 'mirror'}
                                : {type: 'spring', stiffness: 300, damping: 30}
                        }
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {phase !== 'settled' ? (
                                <motion.div
                                    key="views"
                                    initial={{opacity: 0, scale: 0.9, filter: 'blur(4px)'}}
                                    animate={{opacity: 1, scale: 1, filter: 'blur(0px)'}}
                                    exit={{opacity: 0, scale: 1.08, filter: 'blur(6px)'}}
                                    transition={morphSpring}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-accent">
                                            <Icon className="h-3.5 w-3.5"/>
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-[#f1eee6]">
                                                @{sample.author}
                                            </div>
                                            <div className="truncate font-mono text-[10px] text-ash/60">
                                                {sample.node}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-ash">
                                        <Eye className="h-3 w-3"/>
                                        {formatViews(sample.views)}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="money"
                                    initial={{opacity: 0, scale: 0.9, filter: 'blur(4px)'}}
                                    animate={{opacity: 1, scale: 1, filter: 'blur(0px)'}}
                                    exit={{opacity: 0, scale: 0.94, filter: 'blur(4px)'}}
                                    transition={morphSpring}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-success/40 bg-brand-success/10 text-brand-success">
                                            <CheckCircle2 className="h-3.5 w-3.5"/>
                                        </span>
                                        <div className="min-w-0">
                                            <div
                                                className="truncate font-mono text-[11px] font-semibold text-brand-accent">
                                                #{trxHash}
                                            </div>
                                            <div className="font-mono text-[10px] text-brand-success">SETTLED · USDT
                                                TRC-20
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 font-mono text-sm font-semibold text-brand-success">
                                        +$<AnimatedAmount value={amount} prefersReducedMotion={prefersReducedMotion}/>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <div className="pointer-events-none absolute inset-0 overflow-visible">
                        <AnimatePresence>
                            {particles.map((p) => (
                                <DollarParticle
                                    key={p.id}
                                    angle={p.angle}
                                    distance={p.distance}
                                    delay={p.delay}
                                    onDone={() =>
                                        setParticles((prev) => prev.filter((x) => x.id !== p.id))
                                    }
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div
                    className="absolute right-0 flex items-center"
                    style={{top: TRACK_WAYPOINTS.scanning - 22}}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {!prefersReducedMotion && phase === 'scanning' ? (
                            <motion.span
                                key="scanning-badge"
                                initial={{opacity: 0, scale: 0.7}}
                                animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.7}}
                                transition={{type: 'spring', stiffness: 500, damping: 16, mass: 0.5}}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-info/40 bg-brand-info/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-info"
                            >
                                <ScanLine className="h-3 w-3"/>
                                Сканирование…
                            </motion.span>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-brand-border/70 pt-4">
                <span className="font-mono text-[10px] text-ash/60">
                    Выплата: USDT · TRC-20 · ~4 мин на верификацию
                </span>
                <motion.button
                    type="button"
                    onClick={forceNewWave}
                    whileHover={prefersReducedMotion ? undefined : {scale: 1.04, transition: waveSpring}}
                    whileTap={prefersReducedMotion ? undefined : {scale: 0.94, transition: waveSpring}}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-accent transition-colors hover:border-brand-accent/50"
                >
                    <Zap className="h-3 w-3"/>
                    Сгенерировать залив
                </motion.button>
            </div>
        </motion.div>
    );
}