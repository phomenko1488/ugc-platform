import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import LandingPage from './modules/landing/LandingPage';
import ResetPasswordPage from './modules/auth/ResetPasswordPage';
import WorkerLayout from './modules/worker/WorkerLayout';
import AdvertiserLayout from './modules/advertiser/AdvertiserLayout';
import PartnerLayout from './modules/partner/PartnerLayout';
import AdminLayout from './modules/admin/AdminLayout';
import { api, authStorage, registerUnauthorizedHandler, decodeAccessTokenRoles } from './api';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// @twa-dev/sdk degrades gracefully outside an actual Telegram client (initData is just empty),
// so it's safe to import unconditionally rather than feature-detecting window.Telegram ourselves.
import WebApp from '@twa-dev/sdk';
import ModeratorLayout from './modules/moderator/ModeratorLayout.jsx';

// Where each role lands once authenticated, and where a protected route meant for a different
// role sends someone back to — every cabinet now has its own real address instead of the whole
// app living at "/", so refreshing the page or bookmarking a section actually returns to it.
const ROLE_HOME = {
    WORKER: '/worker',
    ADVERTISER: '/dashboard',
    MODERATOR: '/moderator',
    PARTNER: '/partner',
    ADMIN: '/admin',
};

// Advertiser cabinet tab <-> URL mapping — the single source of truth AdvertiserRoute and
// AdvertiserLayout's onNavigateTab both read from, so the tab keys AdvertiserSidebar already
// uses internally never have to be duplicated as a second, independently-maintained route table.
const ADVERTISER_TAB_ROUTES = {
    dashboard: '/dashboard',
    campaigns: '/campaigns',
    creators: '/creators',
    analytics: '/analytics',
    traffic: '/traffic',
    billing: '/billing',
    api: '/settings',
};

function FullscreenLoader({ label, sub }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-brand-info" />
            <p className="font-mono text-sm">{label}</p>
            {sub && <p className="font-mono text-xs text-amber-400">{sub}</p>}
        </div>
    );
}

function FullscreenError({ error, onRetry }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg p-4">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
                <h2 className="text-lg font-bold text-white">Ошибка подключения к API</h2>
                <p className="font-mono text-xs text-red-300">{error}</p>
                <button
                    onClick={onRetry}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white transition hover:bg-red-600"
                >
                    <RefreshCw className="h-4 w-4" />
                    Повторить попытку
                </button>
            </div>
        </div>
    );
}

/** Redirects to /login when there's no session at all. Rendering nothing while still "checking"
 * is handled one level up in App, before the router tree is even reached. */
function RequireAuth({ authStatus, children }) {
    if (authStatus === 'anonymous') return <Navigate to="/login" replace />;
    return children;
}

/** Shared loading/error gate every protected route used to duplicate inline — now written once. */
function AuthenticatedGate({ loading, error, activeUser, authError, onRetry, children }) {
    if (loading && !activeUser) {
        return <FullscreenLoader label="Подключение к Selika Backend..." sub={authError} />;
    }
    if (error && !activeUser) {
        return <FullscreenError error={error} onRetry={onRetry} />;
    }
    return children;
}

/** One advertiser-cabinet tab as a real route. Any authenticated role other than ADVERTISER
 * hitting one of these paths is bounced to their own cabinet's home instead of seeing it. */
function AdvertiserRoute({ tab, activeRole, activeUser, onRefresh, onLogout }) {
    const navigate = useNavigate();
    if (activeRole !== 'ADVERTISER') {
        return <Navigate to={ROLE_HOME[activeRole] || '/'} replace />;
    }
    // Loading/error already handled by AuthenticatedGate one level up — this is specifically "no
    // user record matched this role at all", the same edge case the old dev-only fallback screen
    // covered by simply not matching any of App.jsx's role branches.
    if (!activeUser) {
        return <Navigate to="/dev-role-switch" replace />;
    }
    return (
        <AdvertiserLayout
            advertiser={activeUser}
            onRefresh={onRefresh}
            onLogout={onLogout}
            activeTabOverride={tab}
            onNavigateTab={(key) => navigate(ADVERTISER_TAB_ROUTES[key] || '/dashboard')}
        />
    );
}

/** A single-role cabinet mounted at its own base path (/worker, /partner, /moderator, /admin).
 * These four keep their existing internal tab-switching untouched for now — only the advertiser
 * cabinet's tabs got real per-tab URLs this round, since those are the ones the brief names
 * (dashboard/analytics/settings all being existing ADVERTISER_TABS keys already). */
function RoleHomeRoute({ role, activeRole, activeUser, children }) {
    if (activeRole !== role) {
        return <Navigate to={ROLE_HOME[activeRole] || '/'} replace />;
    }
    if (!activeUser) {
        return <Navigate to="/dev-role-switch" replace />;
    }
    return children;
}

export default function App() {
    // --- Module 1: auth gating ---
    // 'checking' -> attempting Telegram auto-login / reading existing session
    // 'authenticated' -> we have a JWT, cabinets can load
    // 'anonymous' -> no Telegram session and no stored JWT, /login is reachable
    const [authStatus, setAuthStatus] = useState('checking');
    const [authError, setAuthError] = useState(null);

    const [activeRole, setActiveRole] = useState('WORKER');
    // Vestigial: used to hold the full user directory for the old getUsers()-based identity
    // guess (see loadData() below). Kept only because <Header> still accepts a `users` prop
    // (unused inside it) on the /dev-role-switch fallback screen — safe to delete entirely
    // along with that prop whenever that screen is cleaned up.
    const [users] = useState([]);
    const [activeUser, setActiveUser] = useState(null);

    const [offers, setOffers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const handleUnauthenticated = useCallback(() => {
        authStorage.clear();
        setAuthStatus('anonymous');
    }, []);

    // Picks which cabinet a freshly-authenticated session should land on, from the JWT's own
    // roles claim — instead of always defaulting to Worker regardless of who actually logged in.
    const applyRoleFromToken = () => {
        const roles = decodeAccessTokenRoles();
        // ROLE_ADMIN checked first: an admin should always land on the Back-Office, even if their
        // account also happens to carry another role.
        if (roles.includes('ROLE_ADMIN')) setActiveRole('ADMIN');
        else if (roles.includes('ROLE_WORKER')) setActiveRole('WORKER');
        else if (roles.includes('ROLE_ADVERTISER')) setActiveRole('ADVERTISER');
        else if (roles.includes('ROLE_MODERATOR')) setActiveRole('MODERATOR');
        else if (roles.includes('ROLE_PARTNER')) setActiveRole('PARTNER');
    };

    // Bootstrap: try an existing session first, then Telegram WebApp auto-login, then fall back
    // to the desktop login modal (reached at /login).
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

    // SECURITY/CORRECTNESS FIX (audit finding): this used to call api.getUsers() — the full user
    // directory — and pick "activeUser" by scanning it for the first row whose roles happened to
    // match activeRole, falling back to allUsers[0] if nothing matched. That meant activeUser.id
    // was essentially arbitrary: in any environment with more than one user per role, EVERY
    // advertiser (say) would resolve to the SAME "first advertiser in the table" account —
    // dashboards, wallets and payout requests would all act on a stranger's id, not the actual
    // logged-in user's. It also depended on GET /users, which the backend now correctly restricts
    // to ROLE_ADMIN (it dumps every user's email/balances/wallet). The fix: ask the backend who
    // the JWT actually belongs to (GET /users/me, resolved server-side from the token) instead of
    // guessing from a list.
    const loadData = async () => {
        try {
            setError(null);
            const me = await api.getCurrentUser();
            setActiveUser(me || null);

            const activeOffers = await api.getActiveOffers();
            setOffers(activeOffers || []);
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
            setError(err.message || 'Не удалось связаться с сервером');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authStatus === 'authenticated') {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRole, authStatus]);

    // Once authenticated, a visitor still parked on a public route (/ or /login — e.g. they had
    // the tab open before logging in elsewhere, or just finished the login form) is moved to
    // their own cabinet's home instead of being left stranded on the landing page.
    useEffect(() => {
        if (authStatus === 'authenticated' && (location.pathname === '/' || location.pathname === '/login')) {
            navigate(ROLE_HOME[activeRole] || '/', { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, activeRole, location.pathname]);

    const handleLogout = () => {
        authStorage.clear();
        setAuthStatus('anonymous');
        navigate('/', { replace: true });
    };

    if (authStatus === 'checking') {
        return <FullscreenLoader label="Авторизация..." />;
    }

    const protect = (node) => (
        <RequireAuth authStatus={authStatus}>
            <AuthenticatedGate
                loading={loading}
                error={error}
                activeUser={activeUser}
                authError={authError}
                onRetry={() => {
                    setLoading(true);
                    loadData();
                }}
            >
                {node}
            </AuthenticatedGate>
        </RequireAuth>
    );

    const advertiserRoute = (tab) =>
        protect(
            <AdvertiserRoute
                tab={tab}
                activeRole={activeRole}
                activeUser={activeUser}
                onRefresh={loadData}
                onLogout={handleLogout}
            />
        );

    return (
        <Routes>
            {/* --- Public --- */}
            <Route path="/" element={<LandingPage onLoginClick={() => navigate('/login')} />} />
            <Route
                path="/login"
                element={
                    authStatus === 'authenticated' ? (
                        <Navigate to={ROLE_HOME[activeRole] || '/'} replace />
                    ) : (
                        <LoginModal
                            onBack={() => navigate('/')}
                            onAuthenticated={() => {
                                applyRoleFromToken();
                                setAuthStatus('authenticated');
                            }}
                        />
                    )
                }
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* --- Advertiser cabinet: one real URL per tab --- */}
            <Route path="/dashboard" element={advertiserRoute('dashboard')} />
            <Route path="/campaigns" element={advertiserRoute('campaigns')} />
            <Route path="/creators" element={advertiserRoute('creators')} />
            <Route path="/analytics" element={advertiserRoute('analytics')} />
            <Route path="/traffic" element={advertiserRoute('traffic')} />
            <Route path="/billing" element={advertiserRoute('billing')} />
            <Route path="/settings" element={advertiserRoute('api')} />

            {/* --- Other cabinets: one protected base path each, internal navigation unchanged --- */}
            <Route
                path="/worker"
                element={protect(
                    <RoleHomeRoute role="WORKER" activeRole={activeRole} activeUser={activeUser}>
                        <WorkerLayout worker={activeUser} offers={offers} onRefresh={loadData} onLogout={handleLogout} />
                    </RoleHomeRoute>
                )}
            />
            <Route
                path="/partner"
                element={protect(
                    <RoleHomeRoute role="PARTNER" activeRole={activeRole} activeUser={activeUser}>
                        <PartnerLayout partner={activeUser} onRefresh={loadData} onLogout={handleLogout} />
                    </RoleHomeRoute>
                )}
            />
            <Route
                path="/moderator"
                element={protect(
                    <RoleHomeRoute role="MODERATOR" activeRole={activeRole} activeUser={activeUser}>
                        <ModeratorLayout moderator={activeUser} onLogout={handleLogout} />
                    </RoleHomeRoute>
                )}
            />
            <Route
                path="/admin"
                element={protect(
                    <RoleHomeRoute role="ADMIN" activeRole={activeRole} activeUser={activeUser}>
                        <AdminLayout admin={activeUser} onRefresh={loadData} onLogout={handleLogout} />
                    </RoleHomeRoute>
                )}
            />

            {/* Dev-only fallback: no role matched (e.g. activeUser still missing every list). */}
            <Route
                path="/dev-role-switch"
                element={protect(
                    <div className="flex min-h-screen flex-col bg-brand-bg text-slate-100">
                        <Header
                            users={users}
                            activeUser={activeUser}
                            activeRole={activeRole}
                            onChangeRole={setActiveRole}
                            onRefresh={loadData}
                            onLogout={handleLogout}
                        />
                        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
                            <div className="rounded-2xl border border-brand-border bg-brand-card p-8 text-center text-xs text-slate-400">
                                Выберите активную роль в панели выше
                            </div>
                        </main>
                    </div>
                )}
            />

            {/* Unknown path: send an authenticated visitor home, everyone else to the landing page. */}
            <Route
                path="*"
                element={<Navigate to={authStatus === 'authenticated' ? ROLE_HOME[activeRole] || '/' : '/'} replace />}
            />
        </Routes>
    );
}
