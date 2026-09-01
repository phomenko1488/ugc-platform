import React, { useState } from 'react';
import { LogIn, Loader2, Workflow, UserPlus, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, authStorage } from '../api';

const TABS = [
    { key: 'LOGIN', label: 'Вход' },
    { key: 'REGISTER', label: 'Регистрация' },
    { key: 'FORGOT', label: 'Забыли пароль' },
];

/**
 * Desktop email/password login (Module 1) for Advertiser / Moderator / Partner / Admin, now with
 * public self-registration (Advertiser/Partner only, POST /api/v1/auth/register) and a
 * forgot/reset-password flow (one-time-token based, sent by email — see EmailService).
 * Workers authenticate automatically via Telegram WebApp — see App.jsx's useTelegramAuth effect,
 * this modal never shows up inside an actual Telegram Mini App session.
 *
 * `onBack` is optional — App.jsx passes it now that anonymous visitors land on LandingPage first,
 * so this modal needs a way back to it; omitting the prop just hides the link (e.g. if some other
 * caller wants this as the sole anonymous-state screen again).
 */
export default function LoginModal({ onAuthenticated, onBack }) {
    const [tab, setTab] = useState('LOGIN');

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            <div className="bg-brand-card border border-brand-border p-8 rounded-2xl max-w-sm w-full shadow-xl space-y-6">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        На главную
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                        <Workflow className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-lg text-white">Selika</div>
                        <div className="text-[11px] text-slate-400">Рекламодатель / Модератор / Партнер</div>
                    </div>
                </div>

                <div className="flex bg-brand-bg border border-brand-border rounded-xl p-1 gap-1">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-colors ${
                                tab === t.key
                                    ? 'bg-brand-accent text-brand-bg'
                                    : 'text-slate-400 hover:text-white'
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
                    <p className="text-[10px] text-slate-500 text-center">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Пароль</label>
                <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>

            {error && (
                <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Роль</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setRole('ROLE_ADVERTISER')}
                        className={`text-[11px] font-semibold py-2.5 rounded-xl border transition-colors ${
                            role === 'ROLE_ADVERTISER'
                                ? 'bg-brand-accent/10 border-brand-accent text-brand-accent'
                                : 'bg-brand-bg border-brand-border text-slate-400 hover:text-white'
                        }`}
                    >
                        Рекламодатель
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('ROLE_PARTNER')}
                        className={`text-[11px] font-semibold py-2.5 rounded-xl border transition-colors ${
                            role === 'ROLE_PARTNER'
                                ? 'bg-brand-accent/10 border-brand-accent text-brand-accent'
                                : 'bg-brand-bg border-brand-border text-slate-400 hover:text-white'
                        }`}
                    >
                        Партнер
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Имя пользователя</label>
                <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="stake_casino"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Пароль</label>
                <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Реферальный код <span className="text-slate-500 font-normal">(опционально)</span>
                </label>
                <input
                    type="text"
                    value={refTag}
                    onChange={(e) => setRefTag(e.target.value)}
                    placeholder="ptn_abc123"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                />
            </div>

            {error && (
                <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
        </form>
    );
}

function ForgotPasswordForm({ onDone }) {
    const [step, setStep] = useState('REQUEST'); // REQUEST -> SENT -> RESET
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleRequest = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            const msg = await api.forgotPassword(email);
            setMessage(msg || 'Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля.');
            setStep('SENT');
        } catch (err) {
            setError(err.message || 'Не удалось отправить запрос');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            await api.resetPassword(token.trim(), newPassword);
            setMessage('Пароль успешно изменен. Теперь вы можете войти.');
            setStep('DONE');
        } catch (err) {
            setError(err.message || 'Не удалось сбросить пароль. Проверьте токен.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'DONE') {
        return (
            <div className="space-y-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-brand-success mx-auto" />
                <p className="text-xs text-slate-300">{message}</p>
                <button
                    type="button"
                    onClick={onDone}
                    className="w-full bg-brand-accent hover:bg-brand-accentHover text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ко входу
                </button>
            </div>
        );
    }

    if (step === 'SENT') {
        return (
            <form onSubmit={handleReset} className="space-y-4">
                <p className="text-[11px] text-slate-400">{message}</p>
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Токен из письма</label>
                    <input
                        type="text"
                        required
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Вставьте токен сброса пароля"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-mono"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Новый пароль</label>
                    <input
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                </div>

                {error && (
                    <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {loading ? 'Сохранение...' : 'Установить новый пароль'}
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-[11px] text-slate-400">
                Укажите email — мы отправим на него ссылку/токен для сброса пароля.
            </p>
            <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
                <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adv@stake.com"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
            </div>

            {error && (
                <div className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-accent hover:bg-brand-accentHover disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? 'Отправка...' : 'Отправить ссылку для сброса'}
            </button>
        </form>
    );
}
