const API_BASE = 'http://localhost:80/api/v1';

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

    // --- Media (Module 4) ---
    uploadMedia: (file, onProgress) => uploadMediaWithProgress(file, onProgress),

    getUsers: () => request('/users'),
    getUserById: (id) => request(`/users/${id}`),
    updateWallet: (id, wallet) => request(`/users/${id}/wallet?walletAddress=${encodeURIComponent(wallet)}`, { method: 'PUT' }),

    // Called with no args by everyone except the Worker Workbench (App.jsx's own bootstrap
    // isn't offer-aware, AdvertiserCabinet/ModeratorCabinet don't touch this at all) — those
    // keep hitting the original /offers/active. Passing a workerId (WorkerOffersPage's "Каталог"
    // tab) switches to the new /offers/catalog endpoint, which annotates each offer with
    // isTaken for that worker. See INTEGRATION_GUIDE.md for why this is a separate path rather
    // than /offers/active?workerId=.
    getActiveOffers: (workerId) => request(workerId ? `/offers/catalog?workerId=${workerId}` : '/offers/active'),
    getAdvertiserOffers: (advId) => request(`/offers/advertiser/${advId}`),
    createOffer: (advId, payload) => request(`/offers?advertiserId=${advId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    setOfferStatus: (offerId, advId, isActive) => request(`/offers/${offerId}/status?advertiserId=${advId}&isActive=${isActive}`, { method: 'PUT' }),
    topUpOfferBudget: (offerId, advId, amount) => request(`/offers/${offerId}/topup?advertiserId=${advId}&amount=${amount}`, { method: 'POST' }),

    // --- Worker Workbench ("Взять оффер в работу") ---
    takeOffer: (offerId, workerId) => request(`/offers/${offerId}/take?workerId=${workerId}`, { method: 'POST' }),
    leaveOffer: (offerId, workerId) => request(`/offers/${offerId}/leave?workerId=${workerId}`, { method: 'POST' }),
    getMyOffers: (workerId) => request(`/offers/my?workerId=${workerId}`),
    // Offer Details Hub — full campaign info + this worker's own progress/submission history for it.
    getOfferDetails: (offerId, workerId) => request(`/offers/${offerId}/details?workerId=${workerId}`),

    submitVideo: (payload) => request('/submissions', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    getWorkerSubmissions: (workerId) => request(`/submissions/worker/${workerId}`),
    getOfferSubmissions: (offerId, advId) => request(`/submissions/offer/${offerId}?advertiserId=${advId}`),

    getModerationQueue: () => request('/moderation/queue'),
    approveSubmission: (id, comment = 'Одобрено модератором') => request(`/moderation/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment })
    }),
    rejectSubmission: (id, comment = 'Отклонено модератором') => request(`/moderation/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment })
    }),

    // --- Wallet & Payouts (Module 5 — Payout Engine) ---
    // NOTE: these three assume the ТЗ's Module 5 PayoutController (/api/v1/payouts) and a
    // financial_ledger read endpoint, neither of which exist on the backend yet (that's Этап 3).
    // Until then WorkerWalletPage will show a friendly "недоступно" empty state instead of crashing —
    // wire these up for real once PayoutController lands, the paths below are the ТЗ's own naming.
    updateTrc20Wallet: (userId, trc20Wallet) => api.updateWallet(userId, trc20Wallet),
    requestPayout: (userId, amount, trc20Wallet) => request('/payouts', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, trc20Wallet })
    }),
    getPayoutHistory: (userId) => request(`/payouts/user/${userId}`),
    getFinancialLedger: (userId) => request(`/users/${userId}/ledger`),

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
    getAdvertiserTraffic: (advertiserId, status) => request(
        `/advertiser/${advertiserId}/traffic${status ? `?status=${status}` : ''}`
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

    // --- Reference data (Offer Wizard's platform/GEO pickers) ---
    getPlatforms: () => request('/reference/platforms'),
    getGeos: () => request('/reference/geos'),
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
