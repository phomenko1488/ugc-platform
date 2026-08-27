const API_BASE = 'http://localhost:80/api/v1';

async function request(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка выполнения запроса');
    }

    return data.data;
}

export const api = {
    getUsers: () => request('/users'),
    getUserById: (id) => request(`/users/${id}`),
    updateWallet: (id, wallet) => request(`/users/${id}/wallet?walletAddress=${encodeURIComponent(wallet)}`, { method: 'PUT' }),

    getActiveOffers: () => request('/offers/active'),
    getAdvertiserOffers: (advId) => request(`/offers/advertiser/${advId}`),
    createOffer: (advId, payload) => request(`/offers?advertiserId=${advId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    setOfferStatus: (offerId, advId, isActive) => request(`/offers/${offerId}/status?advertiserId=${advId}&isActive=${isActive}`, { method: 'PUT' }),
    topUpOfferBudget: (offerId, advId, amount) => request(`/offers/${offerId}/topup?advertiserId=${advId}&amount=${amount}`, { method: 'POST' }),

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
    })
};