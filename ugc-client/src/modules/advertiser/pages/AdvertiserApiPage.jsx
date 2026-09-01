import React, { useEffect, useState } from 'react';
import {
    Loader2, KeyRound, Plus, Copy, Check, Trash2, AlertTriangle,
    Webhook, Save, Code2, ShieldCheck,
} from 'lucide-react';
import { api } from '../../../api';

const DOC_ENDPOINTS = [
    { method: 'GET', path: '/api/v1/advertiser/{advertiserId}/dashboard', desc: 'Сводные метрики кабинета: баланс, активные кампании, показатели за период.' },
    { method: 'GET', path: '/api/v1/advertiser/{advertiserId}/traffic', desc: 'Реестр заливов по вашим кампаниям (статус, просмотры, сумма холда), с пагинацией и фильтром по статусу.' },
    { method: 'GET', path: '/api/v1/advertiser/{advertiserId}/analytics', desc: 'Аналитика по кампаниям за период — просмотры, расходы, конверсии.' },
    { method: 'GET', path: '/api/v1/users/{advertiserId}/ledger', desc: 'Финансовый реестр: пополнения, списания, возвраты бюджета.' },
];

/**
 * "API и Интеграции" — programmatic access tokens (generate/revoke, backed by a real
 * ApiToken entity) and the postback URL where your own backend can be notified of events.
 * <p>
 * Scope note, stated plainly rather than silently implied: tokens here are genuinely generated,
 * hashed and persisted, and can be revoked — but no public, token-authenticated endpoint exists
 * yet for an external system to call with one. This page is the management surface for that
 * future integration layer, not a claim that inbound API auth is already wired end to end.
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
            setError(err.message || 'Не удалось создать токен');
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
            setError(err.message || 'Не удалось отозвать токен');
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
            setError(err.message || 'Не удалось сохранить postback URL');
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
                <h1 className="text-lg font-bold text-white">API и Интеграции</h1>
                <p className="mt-1 text-xs text-slate-500">
                    Токены для программного доступа и postback-адрес для уведомлений о событиях.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-danger/20 bg-brand-danger/5 px-4 py-3 text-xs text-brand-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* --- API tokens ------------------------------------------------------------- */}
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <KeyRound className="h-4 w-4 text-brand-accent" />
                    API-токены
                </div>

                {justCreatedToken && (
                    <div className="mb-4 rounded-xl border border-brand-success/30 bg-brand-success/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-success">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Токен «{justCreatedToken.label}» создан — скопируйте его сейчас, повторно он не показывается.
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
                        placeholder="Название токена, например: Casino Backend Prod"
                        maxLength={64}
                        className="flex-1 rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={generating || !newLabel.trim()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-xs font-bold text-brand-bg transition-all hover:bg-brand-accentHover disabled:opacity-40"
                    >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Создать токен
                    </button>
                </form>

                {data?.tokens?.length ? (
                    <div className="overflow-hidden rounded-xl border border-brand-border">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-brand-border text-[10px] uppercase tracking-wider text-slate-500">
                                    <th className="px-3 py-2.5 font-semibold">Название</th>
                                    <th className="px-3 py-2.5 font-semibold">Токен</th>
                                    <th className="px-3 py-2.5 font-semibold">Создан</th>
                                    <th className="px-3 py-2.5 font-semibold">Статус</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {data.tokens.map((t) => (
                                    <tr key={t.id} className="border-b border-brand-border/60 last:border-0">
                                        <td className="px-3 py-2.5 font-semibold text-slate-200">{t.label}</td>
                                        <td className="px-3 py-2.5 font-mono text-slate-500">{t.preview}</td>
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
                    <p className="text-xs text-slate-600">Токенов пока нет — создайте первый выше.</p>
                )}
            </div>

            {/* --- Postback URL ------------------------------------------------------------ */}
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <Webhook className="h-4 w-4 text-brand-accent" />
                    Postback URL
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
                        placeholder="https://your-casino-backend.com/postback/selika"
                        className="flex-1 rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={savingPostback}
                        className="flex items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:border-brand-accent hover:text-white disabled:opacity-40"
                    >
                        {savingPostback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : postbackSaved ? <Check className="h-3.5 w-3.5 text-brand-success" /> : <Save className="h-3.5 w-3.5" />}
                        {postbackSaved ? 'Сохранено' : 'Сохранить'}
                    </button>
                </form>
            </div>

            {/* --- Basic endpoint docs ------------------------------------------------------ */}
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <Code2 className="h-4 w-4 text-brand-accent" />
                    Базовые эндпоинты
                </div>
                <div className="space-y-2">
                    {DOC_ENDPOINTS.map((ep) => (
                        <div key={ep.path} className="flex flex-col gap-1 rounded-xl border border-brand-border/60 bg-brand-bg/60 p-3 sm:flex-row sm:items-center sm:gap-3">
                            <span className="w-fit shrink-0 rounded-md bg-brand-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-accent">
                                {ep.method}
                            </span>
                            <code className="text-[11px] text-slate-300">{ep.path}</code>
                            <span className="text-[11px] text-slate-500">{ep.desc}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-600">
                    Запросы авторизуются заголовком <code className="text-slate-400">Authorization: Bearer &lt;JWT&gt;</code>{' '}
                    вашей текущей сессии кабинета. Прямая авторизация внешних систем по API-токену выше —
                    следующий шаг интеграции, токен уже можно выпустить и хранить заранее.
                </p>
            </div>
        </div>
    );
}
