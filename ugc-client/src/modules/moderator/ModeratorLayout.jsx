import React, {useState, useEffect, useCallback} from 'react';
import ModeratorHeader from './components/ModeratorHeader';
import {
    CheckCircle2,
    XCircle,
    ExternalLink,
    X,
    ZoomIn,
    ShieldAlert,
    Inbox,
    Loader2
} from 'lucide-react';
import {api} from '../../api';
import Pagination from '../../components/Pagination';

const FILTER_TABS = [
    {key: 'ALL', label: 'Вся очередь', status: undefined},
    {key: 'DISPUTED', label: '🔥 Споры рекламодателей', status: 'DISPUTED'},
    {key: 'PENDING_REVIEW', label: 'Обычная проверка', status: 'PENDING_REVIEW'}
];

const DEFAULT_PAGE_SIZE = 15;

/**
 * Self-fetches the moderation queue via api.getModerationQueue(status, page, size) — pagination
 * initiative — rather than reading a `queue` array App.jsx loaded once for the whole app. Tab
 * switches reset to page 0 and re-fetch with the matching status filter (ALL sends no status,
 * letting the backend combine PENDING_REVIEW+DISPUTED server-side).
 */
export default function ModeratorLayout({moderator, onLogout}) {
    const [activeTab, setActiveTab] = useState('ALL');
    const [queue, setQueue] = useState([]);
    const [page, setPage] = useState({pageNumber: 0, pageSize: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [activeItem, setActiveItem] = useState(null);
    const [rejectReason, setRejectReason] = useState('Не выполнено ТЗ');
    const [actionLoading, setActionLoading] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState(null);

    const activeStatus = FILTER_TABS.find((t) => t.key === activeTab)?.status;

    const load = useCallback(async (pageNumber, pageSize) => {
        try {
            setLoadError(null);
            const result = await api.getModerationQueue(activeStatus, pageNumber, pageSize);
            const content = result?.content || [];
            setQueue(content);
            setPage({
                pageNumber: result?.pageNumber ?? 0,
                pageSize: result?.pageSize ?? pageSize,
                totalElements: result?.totalElements ?? 0,
                totalPages: result?.totalPages ?? 0,
            });
            setActiveItem((prev) => {
                if (prev && content.some((i) => i.id === prev.id)) return prev;
                return content[0] || null;
            });
        } catch (err) {
            console.error('Не удалось загрузить очередь модерации:', err);
            setLoadError(err.message || 'Не удалось загрузить очередь');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStatus]);

    // Tab switch resets to page 0 with the new status filter.
    useEffect(() => {
        setLoading(true);
        setActiveItem(null);
        load(0, page.pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStatus]);

    const handlePageChange = (nextPage) => load(nextPage, page.pageSize);
    const handlePageSizeChange = (nextSize) => load(0, nextSize);

    // Reloads the current page after an approve/reject — if that was the last item on this page
    // and we're not on page 0, step back a page instead of showing an empty page.
    const reloadAfterAction = async () => {
        const isLastItemOnPage = queue.length === 1 && page.pageNumber > 0;
        await load(isLastItemOnPage ? page.pageNumber - 1 : page.pageNumber, page.pageSize);
    };

    const handleApprove = async (id) => {
        try {
            setActionLoading(true);
            await api.approveSubmission(id, 'Одобрено модератором');
            await reloadAfterAction();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id) => {
        try {
            setActionLoading(true);
            await api.rejectSubmission(id, rejectReason);
            await reloadAfterAction();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex flex-col">
            <ModeratorHeader moderator={moderator} onRefresh={() => load(page.pageNumber, page.pageSize)} onLogout={onLogout}/>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-1.5 overflow-x-auto">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-brand-accent text-brand-bg border-brand-accent shadow-md shadow-brand-accent/20'
                                        : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-brand-bg/25 text-brand-bg">
                                        {page.totalElements}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {loadError && (
                    <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">
                        {loadError}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                        <Loader2 className="w-4 h-4 animate-spin"/>
                        Загрузка очереди...
                    </div>
                ) : queue.length === 0 ? (
                    <div className="bg-brand-card border border-brand-border p-12 rounded-2xl text-center space-y-3">
                        <Inbox className="w-10 h-10 text-slate-600 mx-auto"/>
                        <h3 className="font-bold text-slate-200 text-sm">Очередь пуста</h3>
                        <p className="text-slate-500 text-xs">Все отправленные ролики и споры проверены.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Список тикетов */}
                        <div className="lg:col-span-5 space-y-3">
                            {queue.map((item) => {
                                const isSelected = activeItem?.id === item.id;
                                const isDisputed = item.status === 'DISPUTED';
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveItem(item)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? isDisputed
                                                    ? 'bg-brand-cardHover border-brand-danger ring-1 ring-brand-danger/40'
                                                    : 'bg-brand-cardHover border-brand-accent ring-1 ring-brand-accent/40'
                                                : 'bg-brand-card border-brand-border hover:bg-brand-cardHover/60'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span
                                                className="text-xs font-bold text-slate-200 truncate">{item.offerTitle}</span>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                                                    isDisputed
                                                        ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'
                                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                }`}>
                                                {isDisputed ? '⚠️ СПОР' : 'ПРОВЕРКА'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                                            {item.sourceUrl}
                                        </div>
                                        <div className="flex items-center justify-between mt-3 text-[11px] font-mono">
                                            <span className="text-slate-500">
                                                Просмотры: <b
                                                className="text-slate-300">{Number(item.recordedViews || 0).toLocaleString()}</b>
                                            </span>
                                            <span className="text-brand-success font-bold">
                                                +${Number(item.holdAmount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <Pagination
                                currentPage={page.pageNumber}
                                totalPages={page.totalPages}
                                totalElements={page.totalElements}
                                pageSize={page.pageSize}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>

                        {/* Детальный просмотр активного тикета */}
                        {activeItem ? (
                            <div
                                className="lg:col-span-7 bg-brand-card border border-brand-border p-6 rounded-2xl space-y-5 shadow-xl">
                                {activeItem.status === 'DISPUTED' && (
                                    <div
                                        className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-4 space-y-1.5">
                                        <div className="text-xs font-bold text-brand-danger flex items-center gap-1.5">
                                            <ShieldAlert className="w-4 h-4 shrink-0"/>
                                            Претензия рекламодателя: {activeItem.disputeCategory || 'Нарушение правил'}
                                        </div>
                                        {activeItem.disputeComment && (
                                            <p className="text-xs text-slate-300 pl-5.5">{activeItem.disputeComment}</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <h3 className="font-bold text-base text-white">{activeItem.offerTitle}</h3>
                                        <a
                                            href={activeItem.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-mono mt-1"
                                        >
                                            {activeItem.sourceUrl}
                                            <ExternalLink className="w-3.5 h-3.5"/>
                                        </a>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Сумма в холде:</div>
                                        <div className="text-xl font-bold font-mono text-brand-success">
                                            ${Number(activeItem.holdAmount || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Просмотры
                                        </div>
                                        <div className="text-sm font-bold font-mono text-white mt-0.5">
                                            {Number(activeItem.recordedViews || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Лайки</div>
                                        <div className="text-sm font-bold font-mono text-white mt-0.5">
                                            {Number(activeItem.recordedLikes || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border text-center">
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">ER%</div>
                                        <div className="text-sm font-bold font-mono text-brand-accent mt-0.5">
                                            {activeItem.currentEngagementRate || '—'}%
                                        </div>
                                    </div>
                                </div>

                                {activeItem.analyticsProofAssetUrl && (
                                    <div>
                                        <div className="text-xs font-semibold text-slate-300 mb-2">Скриншот аналитики:
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setZoomImageUrl(activeItem.analyticsProofAssetUrl)}
                                            className="relative group w-full block"
                                        >
                                            <img
                                                src={activeItem.analyticsProofAssetUrl}
                                                alt="Proof"
                                                className="rounded-xl border border-brand-border max-h-48 w-full object-cover"
                                            />
                                            <div
                                                className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                                <ZoomIn
                                                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-brand-border space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Причина отказа (для Reject):
                                        </label>
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleApprove(activeItem.id)}
                                            disabled={actionLoading}
                                            className="bg-brand-success hover:bg-emerald-600 disabled:opacity-40 text-brand-bg font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-success/10 flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> :
                                                <CheckCircle2 className="w-4 h-4"/>}
                                            {activeItem.status === 'DISPUTED'
                                                ? 'Решить в пользу Воркера (Выплатить)'
                                                : 'Одобрить и отправить в холд'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(activeItem.id)}
                                            disabled={actionLoading}
                                            className="bg-brand-danger hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-brand-danger/10 flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> :
                                                <XCircle className="w-4 h-4"/>}
                                            Отклонить ролик
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="lg:col-span-7 bg-brand-card border border-brand-border p-12 rounded-2xl text-center text-slate-500 text-xs flex items-center justify-center">
                                Выберите тикет из списка слева для проверки
                            </div>
                        )}
                    </div>
                )}
            </main>

            {zoomImageUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setZoomImageUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setZoomImageUrl(null)}
                        className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                    <img
                        src={zoomImageUrl}
                        alt="Zoomed proof"
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full rounded-xl border border-white/10 object-contain cursor-zoom-out"
                    />
                </div>
            )}
        </div>
    );
}
