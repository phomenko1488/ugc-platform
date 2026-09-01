import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Workflow, KeyRound, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { api } from '../../api';

/**
 * Public route: /reset-password?token=XYZ — the page the emailed reset link lands on. Reads the
 * token straight from the URL (useSearchParams) so the person never has to copy/paste anything
 * out of the email; they only ever type their new password here. Pairs with
 * AuthController.resetPassword on the backend, which validates the token against the DB, updates
 * the password hash, and deletes the token in the same transaction — so this page's one submit
 * is genuinely a single atomic operation, not two round-trips the user could interrupt.
 */
export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('Пароль должен быть не короче 6 символов');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        try {
            setLoading(true);
            await api.resetPassword(token, newPassword);
            setDone(true);
        } catch (err) {
            setError(err.message || 'Не удалось сбросить пароль — ссылка недействительна или устарела.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
            <div className="w-full max-w-sm space-y-6 rounded-2xl border border-brand-border bg-brand-card p-8 shadow-xl">
                <Link to="/" className="flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300">
                    <ArrowLeft className="h-3 w-3" />
                    На главную
                </Link>

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                        <Workflow className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-bold text-lg text-ash">Selika</div>
                        <div className="text-[11px] text-slate-400">Новый пароль</div>
                    </div>
                </div>

                {!token && (
                    <div className="flex items-start gap-2 rounded-xl border border-brand-danger/20 bg-brand-danger/10 px-3 py-2.5 text-xs text-brand-danger">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        В ссылке отсутствует токен сброса пароля. Запросите новую ссылку на странице входа.
                    </div>
                )}

                {token && done && (
                    <div className="space-y-4 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-brand-success" />
                        <p className="text-xs text-slate-300">Пароль успешно изменён. Теперь вы можете войти.</p>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Ко входу
                        </button>
                    </div>
                )}

                {token && !done && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Новый пароль</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white focus:border-brand-accent focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Повторите пароль</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            {loading ? 'Сохранение...' : 'Установить новый пароль'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
