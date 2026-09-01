const API_BASE = '/api/v1';

const ACCESS_TOKEN_KEY = 'ugc_access_token';
const REFRESH_TOKEN_KEY = 'ugc_refresh_token';

export const authStorage = {
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
    setTokens: (accessToken, refreshToken) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    isAuthenticated: () => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)),
};

// Reads the "roles" claim straight out of the (unverified — this is UI convenience only, the
// backend is the real gatekeeper) access token payload, so App.jsx can pick the right initial
// cabinet for whoever just logged in instead of always defaulting to Worker.
export function decodeAccessTokenRoles() {
    const token = authStorage.getAccessToken();
    if (!token) return [];
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const claims = JSON.parse(json);
        return Array.isArray(claims.roles) ? claims.roles : [];
    } catch {
        return [];
    }
}

function authHeaders() {
    const token = authStorage.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Set by App.jsx once, so a 401 anywhere can bounce the user back to the login screen
// without every call site having to know about auth.
let onUnauthorized = () => {};
export function registerUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

async function request(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
        authStorage.clear();
        onUnauthorized();
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка выполнения запроса');
    }

    return data.data;
}

// multipart/form-data upload — deliberately does NOT set Content-Type so the browser
// can fill in the multipart boundary itself.
async function uploadRequest(endpoint, formData) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData,
    });

    if (response.status === 401) {
        authStorage.clear();
        onUnauthorized();
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка загрузки файла');
    }

    return data.data;
}

export const api = {
    // --- Auth (Module 1) ---
    login: (email, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    telegramAuth: (initData) => request('/auth/tg-webapp', {
        method: 'POST',
        body: JSON.stringify({ initData }),
    }),
    refreshSession: (refreshToken) => request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
    }),
    // Public self-registration (Advertiser/Partner only) + password recovery.
    register: (payload) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    forgotPassword: (email) => request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),
    resetPassword: (token, newPassword) => request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    }),
    // Telegram account-binding banner (Advertiser/Partner) — issues a one-time bind token +
    // ready-made t.me deep link; sending /start bind_TOKEN to the bot completes the binding.
    getTgBindToken: (userId) => request(`/users/${userId}/tg-bind-token`, { method: 'POST' }),

    // --- Media (Module 4) ---
    uploadMedia: (file, onProgress) => uploadMediaWithProgress(file, onProgress),

    getUsers: () => request('/users'),
    getUserById: (id) => request(`/users/${id}`),
    updateWallet: (id, wallet) => request(`/users/${id}/wallet?walletAddress=${encodeURIComponent(wallet)}`, { method: 'PUT' }),

    // Called with no args by everyone except the Worker Workbench (App.jsx's own bootstrap
    // isn't offer-aware, AdvertiserCabinet/ModeratorCabinet don't touch this at all) — those
    // keep hitting the original /offers/active (unpaginated — OfferController's own endpoint).
    // Passing a workerId (WorkerOffersPage's "Каталог" tab) switches to the new paginated
    // /offers/catalog endpoint (WorkerOfferController), which also annotates each offer with
    // isTaken for that worker and supports server-side search/platform filtering.
    getActiveOffers: (workerId, search = '', platform = '', page = 0, size = 10) => request(
        workerId
            ? `/offers/catalog?workerId=${workerId}&page=${page}&size=${size}`
                + (search ? `&search=${encodeURIComponent(search)}` : '')
                + (platform && platform !== 'ALL' ? `&platform=${platform}` : '')
            : '/offers/active'
    ),
    getAdvertiserOffers: (advId, page = 0, size = 10) => request(`/offers/advertiser/${advId}?page=${page}&size=${size}`),
    createOffer: (advId, payload) => request(`/offers?advertiserId=${advId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    setOfferStatus: (offerId, advId, isActive) => request(`/offers/${offerId}/status?advertiserId=${advId}&isActive=${isActive}`, { method: 'PUT' }),
    topUpOfferBudget: (offerId, advId, amount) => request(`/offers/${offerId}/topup?advertiserId=${advId}&amount=${amount}`, { method: 'POST' }),

    // --- Worker Workbench ("Взять оффер в работу") ---
    takeOffer: (offerId, workerId) => request(`/offers/${offerId}/take?workerId=${workerId}`, { method: 'POST' }),
    leaveOffer: (offerId, workerId) => request(`/offers/${offerId}/leave?workerId=${workerId}`, { method: 'POST' }),
    getMyOffers: (workerId, page = 0, size = 10) => request(`/offers/my?workerId=${workerId}&page=${page}&size=${size}`),
    // Offer Details Hub — full campaign info + this worker's own progress/submission history for it.
    getOfferDetails: (offerId, workerId) => request(`/offers/${offerId}/details?workerId=${workerId}`),

    submitVideo: (payload) => request('/submissions', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    // Pagination initiative — status/campaignId are optional narrowing filters; campaignId lets
    // WorkerSubmissionsPage's campaign dropdown filter the paginated list server-side.
    getWorkerSubmissions: (workerId, status, campaignId, page = 0, size = 20) => request(
        `/submissions/worker/${workerId}?page=${page}&size=${size}`
        + (status ? `&status=${status}` : '')
        + (campaignId ? `&campaignId=${campaignId}` : '')
    ),
    getOfferSubmissions: (offerId, advId) => request(`/submissions/offer/${offerId}?advertiserId=${advId}`),

    getModerationQueue: (status, page = 0, size = 15) => request(
        `/moderation/queue?page=${page}&size=${size}${status && status !== 'ALL' ? `&status=${status}` : ''}`
    ),
    approveSubmission: (id, comment = 'Одобрено модератором') => request(`/moderation/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment })
    }),
    rejectSubmission: (id, comment = 'Отклонено модератором') => request(`/moderation/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment })
    }),

    // --- Wallet & Payouts (Module 5 — Payout Engine) ---
    // Backed by PayoutController (/api/v1/payouts) since the Admin Back-Office round — Worker and
    // Partner Wallet pages already called these paths before that controller existed, so nothing
    // here changed, it just stopped 404ing.
    updateTrc20Wallet: (userId, trc20Wallet) => api.updateWallet(userId, trc20Wallet),
    requestPayout: (userId, amount, trc20Wallet) => request('/payouts', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, trc20Wallet })
    }),
    getPayoutHistory: (userId, page = 0, size = 10) => request(`/payouts/user/${userId}?page=${page}&size=${size}`),
    getFinancialLedger: (userId, page = 0, size = 20) => request(`/users/${userId}/ledger?page=${page}&size=${size}`),

    // --- Referrals (Module 7 — B2C referral hub) ---
    // Same caveat: no backend controller for this yet. Expected shape:
    // { referralCount, totalReferredViews, totalReferralEarnings, referrals: [{username, joinedAt, isActive}] }
    getReferralStats: (userId) => request(`/referrals/worker/${userId}`),

    // --- Advertiser Cabinet ---
    getAdvertiserDashboard: (advertiserId) => request(`/advertiser/${advertiserId}/dashboard`),
    getAdvertiserOfferDetails: (advertiserId, offerId) => request(`/advertiser/${advertiserId}/offers/${offerId}/details`),
    stopOffer: (advertiserId, offerId) => request(`/advertiser/${advertiserId}/offers/${offerId}/stop`, { method: 'POST' }),
    // Traffic Inspector registry — every submission across the advertiser's campaigns, optionally
    // narrowed to one status (PENDING_REVIEW / APPROVED / DISPUTED / REJECTED / ...).
    getAdvertiserTraffic: (advertiserId, status, page = 0, size = 20) => request(
        `/advertiser/${advertiserId}/traffic?page=${page}&size=${size}${status ? `&status=${status}` : ''}`
    ),
    // Dispute Flow — flags a submission from the Traffic Inspector instead of waiting on
    // the normal moderation queue.
    disputeSubmission: (submissionId, advertiserId, reason, comment) => request(
        `/submissions/${submissionId}/dispute?advertiserId=${advertiserId}`,
        { method: 'POST', body: JSON.stringify({ reason, comment }) }
    ),
    // Billing page's simulated USDT TRC-20 top-up.
    depositToAdvertiserBalance: (advertiserId, amount) => request(`/advertiser/${advertiserId}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
    }),

    // --- Advertiser Cabinet: "API и Интеграции" (token management + postback URL) ---
    getAdvertiserIntegrations: (advertiserId) => request(`/advertiser/${advertiserId}/integrations`),
    // Response carries the plaintext token exactly once — the caller must show/copy it
    // immediately, every later fetch of the token list only ever returns a masked preview.
    generateAdvertiserApiToken: (advertiserId, label) => request(`/advertiser/${advertiserId}/integrations/tokens`, {
        method: 'POST',
        body: JSON.stringify({ label }),
    }),
    revokeAdvertiserApiToken: (advertiserId, tokenId) => request(`/advertiser/${advertiserId}/integrations/tokens/${tokenId}`, {
        method: 'DELETE',
    }),
    updateAdvertiserPostbackUrl: (advertiserId, postbackUrl) => request(`/advertiser/${advertiserId}/integrations/postback-url`, {
        method: 'PUT',
        body: JSON.stringify({ postbackUrl }),
    }),

    // --- B2B Partner Cabinet ---
    getPartnerDashboard: (partnerId) => request('/partner/' + partnerId + '/dashboard'),
    getPartnerAdvertisers: (partnerId, search = '', page = 0, size = 10) => request(
        `/partner/${partnerId}/advertisers?page=${page}&size=${size}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),
    getPartnerTerms: (partnerId) => request('/partner/' + partnerId + '/terms'),

    // --- Reference data (Offer Wizard's platform/GEO pickers, platform margin) ---
    getPlatforms: () => request('/reference/platforms'),
    getGeos: () => request('/reference/geos'),
    getPlatformSettings: () => request('/reference/settings'),

    // --- Advertiser Analytics Hub ---
    // from/to are ISO-8601 dates (yyyy-MM-dd); omit both to get the backend's default 30-day window.
    getAdvertiserDeepAnalytics: (advertiserId, from, to) => request(
        `/advertiser/${advertiserId}/analytics${from && to ? `?from=${from}&to=${to}` : ''}`
    ),
    // Campaign-comparison table — split out of the main analytics payload into its own paginated
    // endpoint (pagination initiative).
    getAdvertiserCampaignComparison: (advertiserId, from, to, page = 0, size = 10) => request(
        `/advertiser/${advertiserId}/analytics/campaigns?page=${page}&size=${size}${from && to ? `&from=${from}&to=${to}` : ''}`
    ),

    // --- Admin Back-Office ---
    getAdminDashboard: () => request('/admin/dashboard'),
    getAdminLedger: (type, page = 0, size = 25) => request(
        `/admin/ledger?page=${page}&size=${size}${type ? `&type=${type}` : ''}`
    ),
    getAdminUsers: (role, search, page = 0, size = 20) => request(
        `/admin/users?page=${page}&size=${size}${role ? `&role=${role}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),
    toggleUserBan: (userId, isBanned) => request(`/admin/users/${userId}/status?isBanned=${isBanned}`, { method: 'PUT' }),
    adjustUserBalance: (userId, amount, comment) => request(`/admin/users/${userId}/balance-adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount, comment }),
    }),
    updatePartnerTerms: (userId, terms) => request(`/admin/users/${userId}/b2b-terms`, {
        method: 'PUT',
        body: JSON.stringify(terms),
    }),
    getAdminPayouts: (status, page = 0, size = 20) => request(
        `/admin/payouts?page=${page}&size=${size}${status ? `&status=${status}` : ''}`
    ),
    processPayout: (payoutId) => request(`/admin/payouts/${payoutId}/process`, { method: 'POST' }),
    completePayout: (payoutId, txHash) => request(`/admin/payouts/${payoutId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ txHash }),
    }),
    rejectPayout: (payoutId, comment) => request(`/admin/payouts/${payoutId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
    }),
    getAdminOffers: (page = 0, size = 20) => request(`/admin/offers?page=${page}&size=${size}`),
    adminSetOfferStatus: (offerId, isActive) => request(`/admin/offers/${offerId}/status?isActive=${isActive}`, { method: 'PUT' }),
    getAdminPlatforms: () => request('/admin/reference/platforms'),
    savePlatform: (platform) => request('/admin/reference/platforms', {
        method: 'POST',
        body: JSON.stringify(platform),
    }),
    togglePlatform: (id) => request(`/admin/reference/platforms/${id}/toggle`, { method: 'PUT' }),
    getAdminGeos: () => request('/admin/reference/geos'),
    saveGeo: (geo) => request('/admin/reference/geos', {
        method: 'POST',
        body: JSON.stringify(geo),
    }),
    toggleGeo: (id) => request(`/admin/reference/geos/${id}/toggle`, { method: 'PUT' }),
    updatePlatformMargin: (margin) => request(`/admin/settings/margin?margin=${margin}`, { method: 'PUT' }),
};

// Uses XHR instead of fetch so we can report real upload progress to the FileUploader component.
function uploadMediaWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/media/upload`);

        const token = authStorage.getAccessToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status === 401) {
                authStorage.clear();
                onUnauthorized();
                reject(new Error('Сессия истекла. Пожалуйста, войдите снова.'));
                return;
            }
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                reject(new Error('Некорректный ответ сервера при загрузке файла'));
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                resolve(data.data);
            } else {
                reject(new Error(data.message || 'Ошибка загрузки файла'));
            }
        };

        xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке файла'));
        xhr.send(formData);
    });
}
