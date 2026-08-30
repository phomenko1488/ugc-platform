import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldAlert, Pencil } from 'lucide-react';
import { api } from '../../../api';
import UserEditModal from '../components/UserEditModal';
import Pagination from '../../../components/Pagination';

const ROLE_TABS = [
    { key: 'ALL', label: 'Все' },
    { key: 'WORKER', label: 'Воркеры' },
    { key: 'ADVERTISER', label: 'Рекламодатели' },
    { key: 'PARTNER', label: 'Партнеры' },
    { key: 'MODERATOR', label: 'Модераторы' },
];

const ROLE_LABELS = {
    ROLE_WORKER: 'Воркер',
    ROLE_ADVERTISER: 'Рекламодатель',
    ROLE_PARTNER: 'Партнер',
    ROLE_MODERATOR: 'Модератор',
    ROLE_ADMIN: 'Админ',
};

export default function AdminUsersPage({ onDataChanged }) {
    const [roleTab, setRoleTab] = useState('ALL');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [pageData, setPageData] = useState(null); // null = loading, PageResponseDTO once loaded
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);

    const load = () => {
        api.getAdminUsers(roleTab === 'ALL' ? null : roleTab, search, page, pageSize)
            .then((data) => { setPageData(data); setError(null); })
            .catch((err) => setError(err.message || 'Не удалось загрузить пользователей'));
    };

    useEffect(() => {
        const timeout = setTimeout(load, search ? 300 : 0); // debounce free-text search only
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleTab, search, page, pageSize]);

    const handleRoleTabChange = (key) => {
        setRoleTab(key);
        setPage(0);
    };

    const handleSearchChange = (value) => {
        setSearch(value);
        setPage(0);
    };

    const handleSaved = () => {
        setEditingUser(null);
        load();
        onDataChanged?.();
    };

    const rows = useMemo(() => pageData?.content || [], [pageData]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1.5 overflow-x-auto">
                    {ROLE_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleRoleTabChange(tab.key)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${
                                roleTab === tab.key
                                    ? 'bg-brand-accent text-brand-bg border-brand-accent shadow-md shadow-brand-accent/20'
                                    : 'bg-brand-card text-slate-400 border-brand-border hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Поиск по логину, email, тегу..."
                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs p-3 rounded-xl">{error}</div>
            )}

            {pageData === null && !error ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка пользователей...
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-brand-card border border-brand-border p-10 rounded-2xl text-center text-slate-500 text-xs">
                    Пользователи не найдены.
                </div>
            ) : (
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                                    <th className="text-left font-semibold px-5 py-3">ID</th>
                                    <th className="text-left font-semibold px-3 py-3">Пользователь</th>
                                    <th className="text-left font-semibold px-3 py-3">Роль</th>
                                    <th className="text-right font-semibold px-3 py-3">Баланс</th>
                                    <th className="text-right font-semibold px-3 py-3">В холде</th>
                                    <th className="text-center font-semibold px-3 py-3">Статус</th>
                                    <th className="text-right font-semibold px-5 py-3"> </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {rows.map((u) => (
                                    <tr key={u.id} className="hover:bg-brand-cardHover/40">
                                        <td className="px-5 py-3 font-mono text-slate-500">#{u.id}</td>
                                        <td className="px-3 py-3">
                                            <div className="font-semibold text-slate-200 truncate max-w-[160px]">{u.username || '—'}</div>
                                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{u.email || u.affiliateTag}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(u.roles || []).map((r) => (
                                                    <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border text-slate-400">
                                                        {ROLE_LABELS[r] || r}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-right px-3 py-3 font-mono text-brand-success">${Number(u.availableBalance).toFixed(2)}</td>
                                        <td className="text-right px-3 py-3 font-mono text-amber-400">${Number(u.holdBalance).toFixed(2)}</td>
                                        <td className="text-center px-3 py-3">
                                            {u.isBanned ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border text-brand-danger bg-brand-danger/10 border-brand-danger/20">
                                                    <ShieldAlert className="w-2.5 h-2.5" /> BANNED
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-brand-success bg-brand-success/10 border-brand-success/20">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right px-5 py-3">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-accent hover:underline"
                                            >
                                                <Pencil className="w-3 h-3" /> Изменить
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pageData && (
                <Pagination
                    currentPage={pageData.pageNumber}
                    totalPages={pageData.totalPages}
                    totalElements={pageData.totalElements}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
                />
            )}

            {editingUser && (
                <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleSaved} />
            )}
        </div>
    );
}
