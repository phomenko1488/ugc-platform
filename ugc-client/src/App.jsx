import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ModeratorCabinet from './components/ModeratorCabinet';
import LoginModal from './components/LoginModal';
import WorkerLayout from './modules/worker/WorkerLayout';
import AdvertiserLayout from './modules/advertiser/AdvertiserLayout';
import { api, authStorage, registerUnauthorizedHandler, decodeAccessTokenRoles } from './api';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// @twa-dev/sdk degrades gracefully outside an actual Telegram client (initData is just empty),
// so it's safe to import unconditionally rather than feature-detecting window.Telegram ourselves.
import WebApp from '@twa-dev/sdk';

export default function App() {
    // --- Module 1: auth gating ---
    // 'checking' -> attempting Telegram auto-login / reading existing session
    // 'authenticated' -> we have a JWT, cabinets can load
    // 'anonymous' -> no Telegram session and no stored JWT, show LoginModal
    const [authStatus, setAuthStatus] = useState('checking');
    const [authError, setAuthError] = useState(null);

    const [activeRole, setActiveRole] = useState('WORKER');
    const [users, setUsers] = useState([]);
    const [activeUser, setActiveUser] = useState(null);

    const [offers, setOffers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [queue, setQueue] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleUnauthenticated = useCallback(() => {
        authStorage.clear();
        setAuthStatus('anonymous');
    }, []);

    // Picks which cabinet a freshly-authenticated session should land on, from the JWT's own
    // roles claim — instead of always defaulting to Worker regardless of who actually logged in.
    const applyRoleFromToken = () => {
        const roles = decodeAccessTokenRoles();
        if (roles.includes('ROLE_WORKER')) setActiveRole('WORKER');
        else if (roles.includes('ROLE_ADVERTISER')) setActiveRole('ADVERTISER');
        else if (roles.includes('ROLE_MODERATOR')) setActiveRole('MODERATOR');
    };

    // Bootstrap: try an existing session first, then Telegram WebApp auto-login, then fall back
    // to the desktop login modal.
    useEffect(() => {
        registerUnauthorizedHandler(handleUnauthenticated);

        const bootstrap = async () => {
            if (authStorage.isAuthenticated()) {
                applyRoleFromToken();
                setAuthStatus('authenticated');
                return;
            }

            try {
                WebApp.ready();
            } catch {
                // Not running inside Telegram — expected on desktop.
            }

            const initData = WebApp?.initData;
            if (initData) {
                try {
                    const result = await api.telegramAuth(initData);
                    authStorage.setTokens(result.accessToken, result.refreshToken);
                    applyRoleFromToken();
                    setAuthStatus('authenticated');
                    return;
                } catch (err) {
                    setAuthError(err.message || 'Не удалось войти через Telegram');
                }
            }

            setAuthStatus('anonymous');
        };

        bootstrap();
    }, [handleUnauthenticated]);

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
        if (authStatus === 'authenticated') {
            loadData();
        }
    }, [activeRole, authStatus]);

    if (authStatus === 'checking') {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-sm font-mono">Авторизация...</p>
            </div>
        );
    }

    if (authStatus === 'anonymous') {
        return (
            <LoginModal
                onAuthenticated={() => {
                    applyRoleFromToken();
                    setAuthStatus('authenticated');
                }}
            />
        );
    }

    if (loading && !activeUser) {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-sm font-mono">Подключение к UGC Backend...</p>
                {authError && <p className="text-xs text-amber-400 font-mono">{authError}</p>}
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

    const handleLogout = () => { authStorage.clear(); setAuthStatus('anonymous'); };

    // ROLE_WORKER gets its own fully isolated module — own header, own responsive nav
    // (desktop top tabs / mobile bottom bar), so it renders standalone instead of nesting
    // inside the shared Header/main shell used by the other roles below.
    if (activeRole === 'WORKER' && activeUser) {
        return (
            <WorkerLayout
                worker={activeUser}
                offers={offers}
                submissions={submissions}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
        );
    }

    // ROLE_ADVERTISER also gets its own fully isolated module — own sidebar/header shell — for
    // the same reason the Worker Workbench does: the Advertiser Cabinet (dashboard, campaigns,
    // traffic inspector, billing) is a big enough surface that nesting it inside the shared
    // Header/main shell used by Moderator would just be in its way.
    if (activeRole === 'ADVERTISER' && activeUser) {
        return (
            <AdvertiserLayout
                advertiser={activeUser}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
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
                onLogout={handleLogout}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
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
