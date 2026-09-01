import React, { useEffect, useState } from 'react';
import {
    Loader2, KeyRound, Plus, Copy, Check, Trash2, AlertTriangle,
    Webhook, Save, ListTree, ShieldCheck,
} from 'lucide-react';
import { api } from '../../../api';
import { maskKeyPreview } from '../../../utils/mask';

// Product terminology rule: this page never uses the word "API" anywhere in its copy — the
// product talks about "ключи доступа" (access keys) and "вебхуки" (webhooks) instead, even
// though the underlying mechanism (ApiToken entity, postback URL) is unchanged. Renamed from
// AdvertiserApiPage's old "Базовые эндпоинты" section to a plain description of what each
// operation does, since a method+path table reads as API documentation regardless of heading.
const AVAILABLE_OPERATIONS = [
    { label: 'Сводка кабинета', desc: 'Баланс, активные потоки и показатели за период.' },
    { label: 'Реестр трафика', desc: 'Заливы по вашим потокам: статус, просмотры, сумма холда — с фильтром по статусу.' },
    { label: 'Аналитика', desc: 'Просмотры, расходы и конверсии по потокам за период.' },
    { label: 'Финансовый реестр', desc: 'Пополнения, списания и возвраты бюджета.' },
];

/**
 * "Настройки" — access-key management (generate/revoke, backed by a real ApiToken entity, but
 * named and worded around "ключи доступа" rather than the product's forbidden "API" term) and
 * the webhook address where your own backend can be notified of events.
 * <p>
 * Scope note, stated plainly rather than silently implied: keys here are genuinely generated,
 * hashed and persisted, and can be revoked — but no inbound, key-authenticated endpoint exists
 * yet for an external system to call with one. This page is the management surface for that
 * future integration layer, not a claim that inbound key auth is already wired end to end.
 */
export default function AdvertiserApiPage({ advertiser }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const [newLabel, setNewLabel] = useState('');
    const [generating, setGenerating] = useState(false);
    const [justCreatedToken, setJustCreatedToken] = useState(null);
    const [copied, setCopied] = useState(false);
    const [revokingId, setRevokingId] = useState(null);

    const [postbackDraft, setPostbackDraft] = useState('');
    const [savingPostback, setSavingPostback] = useState(false);
    const [postbackSaved, setPostbackSaved] = useState(false);

    const load = () => {
        if (!advertiser?.id) return;
        api.getAdvertiserIntegrations(advertiser.id)
            .then((d) => { setData(d); setPostbackDraft(d?.postbackUrl || ''); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить настройки интеграций'));
    };

    useEffect(load, [advertiser?.id]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!newLabel.trim()) return;
        try {
            setGenerating(true);
            const created = await api.generateAdvertiserApiToken(advertiser.id, newLabel.trim());
            setJustCreatedToken(created);
            setNewLabel('');
            load();
        } catch (err) {
            setError(err.message || 'Не удалось создать ключ доступа');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (tokenId) => {
        try {
            setRevokingId(tokenId);
            await api.revokeAdvertiserApiToken(advertiser.id, tokenId);
            load();
        } catch (err) {
            setError(err.message || 'Не удалось отозвать ключ');
        } finally {
            setRevokingId(null);
        }
    };

    const handleCopy = () => {
        if (!justCreatedToken) return;
        navigator.clipboard.writeText(justCreatedToken.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSavePostback = async (e) => {
        e.preventDefault();
        try {
            setSavingPostback(true);
            await api.updateAdvertiserPostbackUrl(advertiser.id, postbackDraft.trim());
            setPostbackSaved(true);
            setTimeout(() => setPostbackSaved(false), 2000);
        } catch (err) {
            setError(err.message || 'Не удалось сохранить адрес вебхука');
        } finally {
            setSavingPostback(false);
        }
    };

    if (data === null && !error) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl uppercase tracking-tight text-ash">Настройки</h1>
                <p className="mt-1 text-xs text-slate-500">
                    Ключи доступа для внешних систем и вебхук-адрес для уведомлений о событиях.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-danger/20 bg-brand-danger/5 px-4 py-3 text-xs text-brand-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* --- Access keys --------------------------------------------------------------- */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ash">
                    <KeyRound className="h-4 w-4 text-brand-accent" />
                    Ключи доступа
                </div>

                {justCreatedToken && (
                    <div className="mb-4 rounded-lg border border-brand-success/30 bg-brand-success/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-success">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Ключ «{justCreatedToken.label}» создан — скопируйте его сейчас, повторно он не показывается.
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-[11px] text-slate-200">
                                {justCreatedToken.token}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="shrink-0 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-slate-300 transition-colors hover:text-white"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-brand-success" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleGenerate} className="mb-5 flex flex-col gap-2 sm:flex-row">
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Название ключа, например: Casino Backend Prod"
                        maxLength={64}
                        className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={generating || !newLabel.trim()}
                        className="flex items-center justify-center gap-2 rounded-lg bg-brand-accent px-4 py-2.5 text-xs font-bold text-brand-bg transition-colors hover:bg-brand-accentHover disabled:opacity-40"
                    >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Создать ключ
                    </button>
                </form>

                {data?.tokens?.length ? (
                    <div className="overflow-hidden rounded-lg border border-brand-border">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-brand-border text-[10px] uppercase tracking-wider text-slate-500">
                                    <th className="px-3 py-2.5 font-semibold">Название</th>
                                    <th className="px-3 py-2.5 font-semibold">Ключ</th>
                                    <th className="px-3 py-2.5 font-semibold">Создан</th>
                                    <th className="px-3 py-2.5 font-semibold">Статус</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {data.tokens.map((t) => (
                                    <tr key={t.id} className="border-b border-brand-border/60 last:border-0">
                                        <td className="px-3 py-2.5 font-semibold text-slate-200">{t.label}</td>
                                        <td className="px-3 py-2.5 font-mono text-slate-500">{maskKeyPreview(t.preview)}</td>
                                        <td className="px-3 py-2.5 text-slate-500">{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                                        <td className="px-3 py-2.5">
                                            {t.revoked ? (
                                                <span className="rounded-lg border border-brand-danger/20 bg-brand-danger/10 px-2 py-1 text-[10px] font-semibold text-brand-danger">Отозван</span>
                                            ) : (
                                                <span className="rounded-lg border border-brand-success/20 bg-brand-success/10 px-2 py-1 text-[10px] font-semibold text-brand-success">Активен</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            {!t.revoked && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevoke(t.id)}
                                                    disabled={revokingId === t.id}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-brand-danger/40 hover:text-brand-danger disabled:opacity-40"
                                                >
                                                    {revokingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                    Отозвать
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-xs text-slate-600">Ключей пока нет — создайте первый выше.</p>
                )}
            </div>

            {/* --- Webhook ------------------------------------------------------------------- */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ash">
                    <Webhook className="h-4 w-4 text-brand-accent" />
                    Вебхук
                </div>
                <p className="mb-4 text-xs text-slate-500">
                    Адрес вашего сервиса, куда платформа сможет присылать уведомления о событиях
                    (например, о новых одобренных заливах). Оставьте пустым, если интеграция не нужна.
                </p>
                <form onSubmit={handleSavePostback} className="flex flex-col gap-2 sm:flex-row">
                    <input
                        type="url"
                        value={postbackDraft}
                        onChange={(e) => setPostbackDraft(e.target.value)}
                        placeholder="https://your-casino-backend.com/webhook/selika"
                        className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={savingPostback}
                        className="flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-brand-accent hover:text-white disabled:opacity-40"
                    >
                        {savingPostback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : postbackSaved ? <Check className="h-3.5 w-3.5 text-brand-success" /> : <Save className="h-3.5 w-3.5" />}
                        {postbackSaved ? 'Сохранено' : 'Сохранить'}
                    </button>
                </form>
            </div>

            {/* --- What a key can do ---------------------------------------------------------- */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ash">
                    <ListTree className="h-4 w-4 text-brand-accent" />
                    Что доступно по ключу
                </div>
                <div className="space-y-2">
                    {AVAILABLE_OPERATIONS.map((op) => (
                        <div key={op.label} className="flex flex-col gap-1 rounded-lg border border-brand-border/60 bg-brand-bg/60 p-3 sm:flex-row sm:items-center sm:gap-3">
                            <span className="w-fit shrink-0 rounded-md bg-brand-accent/10 px-2 py-0.5 text-[10px] font-bold text-brand-accent">
                                {op.label}
                            </span>
                            <span className="text-[11px] text-slate-500">{op.desc}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-600">
                    Ваша текущая сессия в кабинете уже авторизована — ключ доступа нужен только внешней
                    системе (например, бэкенду казино), которая должна получать эти данные напрямую.
                </p>
            </div>
        </div>
    );
}
