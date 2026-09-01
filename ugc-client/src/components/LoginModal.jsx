import React, { useEffect, useState } from 'react';
import { LogIn, Loader2, Workflow, UserPlus, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, authStorage } from '../api';

const TABS = [
    { key: 'LOGIN', label: 'Вход' },
    { key: 'REGISTER', label: 'Регистрация' },
    { key: 'FORGOT', label: 'Забыли пароль' },
];

/**
 * Desktop email/password login (Module 1) for Advertiser / Moderator / Partner / Admin, with
 * public self-registration (Advertiser/Partner only, POST /api/v1/auth/register) and a
 * forgot-password request form (the actual reset now happens on its own page — see
 * ResetPasswordPage — reached via the link the email sends, not by pasting a token here).
 * Workers authenticate automatically via Telegram WebApp — see App.jsx's bootstrap effect, this
 * modal never shows up inside an actual Telegram Mini App session.
 *
 * Mounted at the /login route as a true overlay on top of LandingPage (fixed inset-0 + backdrop),
 * not a full-page takeover — App.jsx keeps LandingPage rendered underneath so the two together
 * read as "a modal opened over the landing page", matching how the rest of the app treats /login.
 * `onBack` closes it (click the backdrop, the back link, or Escape) by navigating to "/".
 */
export default function LoginModal({ onAuthenticated, onBack }) {
    const [tab, setTab] = useState('LOGIN');

    // Standard modal manners: Escape closes it, and the body doesn't scroll behind it while open.
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onBack?.();
        };
        document.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onBack]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onBack?.();
            }}
        >
            <div className="w-full max-w-sm space-y-6 rounded-2xl border border-brand-border bg-brand-card p-8 shadow-2xl">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        На главную
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                        <Workflow className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-bold text-lg text-ash">Selika</div>
                        <div className="text-[11px] text-slate-400">Рекламодатель / Модератор / Партнер</div>
                    </div>
                </div>

                <div className="flex gap-1 rounded-xl border border-brand-border bg-brand-bg p-1">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                                tab === t.key ? 'bg-brand-accent text-brand-bg' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'LOGIN' && <LoginForm onAuthenticated={onAuthenticated} />}
                {tab === 'REGISTER' && <RegisterForm onAuthenticated={onAuthenticated} />}
                {tab === 'FORGOT' && <ForgotPasswordForm onDone={() => setTab('LOGIN')} />}

                {tab === 'LOGIN' && (
                    <p className="text-center text-[10px] text-slate-500">
                        Воркеры авторизуются автоматически через Telegram Mini App.
                    </p>
                )}
            </div>
        </div>
    );
}

function LoginForm({ onAuthenticated }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const result = await api.login(email, password);
            authStorage.setTokens(result.accessToken, result.refreshToken);
            onAuthenticated(result.user);
        } catch (err) {
            setError(err.message || 'Не удалось войти');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Пароль</label>
                <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>

            {error && (
                <div className="rounded-xl border border-brand-danger/20 bg-brand-danger/10 px-3 py-2 text-xs text-brand-danger">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover disabled:opacity-40"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Входим...' : 'Войти'}
            </button>
        </form>
    );
}

function RegisterForm({ onAuthenticated }) {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('ROLE_ADVERTISER');
    const [refTag, setRefTag] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const result = await api.register({
                email,
                password,
                username,
                role,
                refTag: refTag.trim() || null,
            });
            authStorage.setTokens(result.accessToken, result.refreshToken);
            onAuthenticated(result.user);
        } catch (err) {
            setError(err.message || 'Не удалось зарегистрироваться');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Роль</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setRole('ROLE_ADVERTISER')}
                        className={`rounded-xl border py-2.5 text-[11px] font-semibold transition-colors ${
                            role === 'ROLE_ADVERTISER'
                                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                                : 'border-brand-border bg-brand-bg text-slate-400 hover:text-white'
                        }`}
                    >
                        Рекламодатель
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('ROLE_PARTNER')}
                        className={`rounded-xl border py-2.5 text-[11px] font-semibold transition-colors ${
                            role === 'ROLE_PARTNER'
                                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                                : 'border-brand-border bg-brand-bg text-slate-400 hover:text-white'
                        }`}
                    >
                        Партнер
                    </button>
                </div>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Имя пользователя</label>
                <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="stake_casino"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Пароль</label>
                <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Реферальный код <span className="font-normal text-slate-500">(опционально)</span>
                </label>
                <input
                    type="text"
                    value={refTag}
                    onChange={(e) => setRefTag(e.target.value)}
                    placeholder="ptn_abc123"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 font-mono text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>

            {error && (
                <div className="rounded-xl border border-brand-danger/20 bg-brand-danger/10 px-3 py-2 text-xs text-brand-danger">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover disabled:opacity-40"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
        </form>
    );
}

/**
 * Request-only now — submitting an email fires POST /auth/forgot-password and the real "set a
 * new password" step happens on the dedicated /reset-password page reached via the emailed link
 * (see ResetPasswordPage), which reads the token from the URL instead of asking anyone to copy
 * and paste it into a form.
 */
function ForgotPasswordForm({ onDone }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [sent, setSent] = useState(false);

    const handleRequest = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const msg = await api.forgotPassword(email);
            setMessage(msg || 'Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля.');
            setSent(true);
        } catch (err) {
            setError(err.message || 'Не удалось отправить запрос');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-brand-success" />
                <p className="text-xs text-slate-300">{message}</p>
                <p className="text-[11px] text-slate-500">
                    Перейдите по ссылке из письма — она откроет страницу сброса пароля с уже подставленным токеном.
                </p>
                <button
                    type="button"
                    onClick={onDone}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Ко входу
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-[11px] text-slate-400">
                Укажите email — мы отправим на него ссылку для сброса пароля.
            </p>
            <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                />
            </div>

            {error && (
                <div className="rounded-xl border border-brand-danger/20 bg-brand-danger/10 px-3 py-2 text-xs text-brand-danger">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover disabled:opacity-40"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {loading ? 'Отправка...' : 'Отправить ссылку для сброса'}
            </button>
        </form>
    );
}
