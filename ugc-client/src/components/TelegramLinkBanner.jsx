import React, { useState } from 'react';
import { Send, Loader2, ExternalLink, X } from 'lucide-react';
import { api } from '../api';

/**
 * Shown in the Advertiser/Partner dashboard header while the account has no telegramId bound yet
 * (AuthUserDTO/UserResponseDTO both expose it). Requests a one-time bind token
 * (POST /users/{id}/tg-bind-token) and opens the returned t.me deep link — sending
 * "/start bind_TOKEN" to the bot completes the binding server-side (TelegramCommandService).
 */
export default function TelegramLinkBanner({ user }) {
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deepLink, setDeepLink] = useState(null);

    if (!user?.id || user?.telegramId || dismissed) return null;

    const handleLink = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await api.getTgBindToken(user.id);
            const link = result?.deepLink;
            setDeepLink(link || null);
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
        } catch (err) {
            setError(err.message || 'Не удалось получить ссылку привязки');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 bg-brand-info/10 border border-brand-info/25 rounded-xl px-4 py-3 flex items-center gap-3 text-xs">
            <div className="h-8 w-8 rounded-lg bg-brand-info/15 border border-brand-info/25 flex items-center justify-center text-brand-info shrink-0">
                <Send className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-brand-info">Привяжите Telegram, чтобы получать уведомления</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                    Новые сабмиты, остаток бюджета и статус выплат — прямо в Telegram.
                </div>
                {error && <div className="text-[11px] text-brand-danger mt-1">{error}</div>}
                {deepLink && (
                    <a
                        href={deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-info underline mt-1 inline-block"
                    >
                        Ссылка не открылась автоматически? Нажмите здесь.
                    </a>
                )}
            </div>
            <button
                onClick={handleLink}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 bg-brand-info hover:bg-brand-infoHover disabled:opacity-40 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-colors"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Открыть бота
            </button>
            <button
                onClick={() => setDismissed(true)}
                title="Скрыть"
                className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
