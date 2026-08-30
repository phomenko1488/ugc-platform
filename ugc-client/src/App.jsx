import React, {useState, useEffect, useCallback} from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import WorkerLayout from './modules/worker/WorkerLayout';
import AdvertiserLayout from './modules/advertiser/AdvertiserLayout';
import PartnerLayout from './modules/partner/PartnerLayout';
import AdminLayout from './modules/admin/AdminLayout';
import ModeratorLayout from "./modules/moderator/ModeratorLayout.jsx";
import {api, authStorage, registerUnauthorizedHandler, decodeAccessTokenRoles} from './api';
import {Loader2, AlertTriangle, RefreshCw} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export default function App() {
    const [authStatus, setAuthStatus] = useState('checking');
    const [authError, setAuthError] = useState(null);

    const [activeRole, setActiveRole] = useState('WORKER');
    const [users, setUsers] = useState([]);
    const [activeUser, setActiveUser] = useState(null);

    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleUnauthenticated = useCallback(() => {
        authStorage.clear();
        setAuthStatus('anonymous');
    }, []);

    const applyRoleFromUser = (roles) => {
        if (!roles || !roles.length) return;
        if (roles.includes('ROLE_ADMIN')) setActiveRole('ADMIN');
        else if (roles.includes('ROLE_WORKER')) setActiveRole('WORKER');
        else if (roles.includes('ROLE_ADVERTISER')) setActiveRole('ADVERTISER');
        else if (roles.includes('ROLE_MODERATOR')) setActiveRole('MODERATOR');
        else if (roles.includes('ROLE_PARTNER')) setActiveRole('PARTNER');
    };

    const applyRoleFromToken = () => {
        const roles = decodeAccessTokenRoles();
        applyRoleFromUser(roles);
    };

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
                // desktop no-op
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
                    setAuthError(err.message || 'Ошибка авторизации через Telegram');
                }
            }

            setAuthStatus('anonymous');
        };

        bootstrap();
    }, [handleUnauthenticated]);

    const loadData = async () => {
        try {
            setError(null);

            // Загружаем профиль строго текущего пользователя по токену
            const me = await api.getMe();
            if (!me || !me.id) {
                throw new Error("Не удалось загрузить профиль текущего пользователя");
            }
            console.log(me)
            setActiveUser(me);
            applyRoleFromUser(me.roles);

            const activeOffers = await api.getActiveOffers(me.id);
            setOffers(activeOffers?.content || activeOffers || []);
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
            setError(err.message || 'Ошибка подключения к серверу');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authStatus === 'authenticated') {
            loadData();
        }
    }, [authStatus]);

    if (authStatus === 'checking') {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400"/>
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
                <Loader2 className="w-8 h-8 animate-spin text-sky-400"/>
                <p className="text-sm font-mono">Подключение к UGC Backend...</p>
                {authError && <p className="text-xs text-amber-400 font-mono">{authError}</p>}
            </div>
        );
    }

    if (error && !activeUser) {
        return (
            <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl max-w-md w-full text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto"/>
                    <h2 className="text-lg font-bold text-white">Ошибка API</h2>
                    <p className="text-xs text-red-300 font-mono">{error}</p>
                    <button
                        onClick={() => {
                            setLoading(true);
                            loadData();
                        }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4"/>
                        Повторить попытку
                    </button>
                </div>
            </div>
        );
    }

    const handleLogout = () => {
        authStorage.clear();
        setAuthStatus('anonymous');
    };

    if (activeRole === 'WORKER' && activeUser) {
        return (
            <WorkerLayout
                worker={activeUser}
                offers={offers}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
        );
    }

    if (activeRole === 'ADVERTISER' && activeUser) {
        return (
            <AdvertiserLayout
                advertiser={activeUser}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
        );
    }

    if (activeRole === 'MODERATOR' && activeUser) {
        return (
            <ModeratorLayout
                moderator={activeUser}
                onLogout={handleLogout}
            />
        );
    }

    if (activeRole === 'PARTNER' && activeUser) {
        return (
            <PartnerLayout
                partner={activeUser}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
        );
    }

    if (activeRole === 'ADMIN' && activeUser) {
        return (
            <AdminLayout
                admin={activeUser}
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
                <div className="bg-brand-card border border-brand-border p-8 rounded-2xl text-center text-slate-400 text-xs">
                    Выберите активную роль в панели выше
                </div>
            </main>
        </div>
    );
}