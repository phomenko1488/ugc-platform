import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WorkerCabinet from './components/WorkerCabinet';
import AdvertiserCabinet from './components/AdvertiserCabinet';
import ModeratorCabinet from './components/ModeratorCabinet';
import { api } from './api';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
    const [activeRole, setActiveRole] = useState('WORKER');
    const [users, setUsers] = useState([]);
    const [activeUser, setActiveUser] = useState(null);

    const [offers, setOffers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [queue, setQueue] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setError(null);
            const allUsers = await api.getUsers();
            setUsers(allUsers || []);

            let targetUser = (allUsers || []).find(u => {
                if (activeRole === 'WORKER') return u.roles?.includes('ROLE_WORKER');
                if (activeRole === 'ADVERTISER') return u.roles?.includes('ROLE_ADVERTISER');
                if (activeRole === 'MODERATOR') return u.roles?.includes('ROLE_MODERATOR');
                return false;
            });

            if (!targetUser && allUsers?.length > 0) {
                targetUser = allUsers[0];
            }
            setActiveUser(targetUser || null);

            const activeOffers = await api.getActiveOffers();
            setOffers(activeOffers || []);

            if (targetUser && activeRole === 'WORKER') {
                const subs = await api.getWorkerSubmissions(targetUser.id);
                setSubmissions(subs || []);
            }

            const modQueue = await api.getModerationQueue();
            setQueue(modQueue || []);
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
            setError(err.message || 'Не удалось связаться с сервером (http://localhost:80)');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeRole]);

    if (loading && !activeUser) {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-sm font-mono">Подключение к UGC Backend...</p>
            </div>
        );
    }

    if (error && !activeUser) {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl max-w-md w-full text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
                    <h2 className="text-lg font-bold text-white">Ошибка подключения к API</h2>
                    <p className="text-xs text-red-300 font-mono">{error}</p>
                    <button
                        onClick={() => { setLoading(true); loadData(); }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Повторить попытку
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg text-slate-100 flex flex-col">
            <Header
                users={users}
                activeUser={activeUser}
                activeRole={activeRole}
                onChangeRole={setActiveRole}
                onRefresh={loadData}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
                {activeRole === 'WORKER' && activeUser && (
                    <WorkerCabinet
                        worker={activeUser}
                        offers={offers}
                        submissions={submissions}
                        onRefresh={loadData}
                    />
                )}

                {activeRole === 'ADVERTISER' && activeUser && (
                    <AdvertiserCabinet
                        advertiser={activeUser}
                        offers={offers}
                        onRefresh={loadData}
                    />
                )}

                {activeRole === 'MODERATOR' && (
                    <ModeratorCabinet
                        queue={queue}
                        onRefresh={loadData}
                    />
                )}
            </main>
        </div>
    );
}