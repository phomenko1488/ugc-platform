import React, { useState } from 'react';
import { LogIn, Loader2, Video } from 'lucide-react';
import { api, authStorage } from '../api';

/**
 * Desktop email/password login (Module 1) for Advertiser / Moderator / Partner / Admin.
 * Workers authenticate automatically via Telegram WebApp — see App.jsx's useTelegramAuth effect,
 * this modal never shows up inside an actual Telegram Mini App session.
 */
export default function LoginModal({ onAuthenticated }) {
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
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
            <div className="bg-brand-card border border-brand-border p-8 rounded-2xl max-w-sm w-full shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-lg text-white">UGC Flow</div>
                        <div className="text-[11px] text-slate-400">Вход для Рекламодателя / Модератора / Партнера</div>
                    </div>
                </div>

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

                <p className="text-[10px] text-slate-500 text-center">
                    Воркеры авторизуются автоматически через Telegram Mini App.
                </p>
            </div>
        </div>
    );
}
