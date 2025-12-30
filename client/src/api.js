import axios from 'axios';

export const API_BASE = (() => {
    const raw = String(import.meta.env.VITE_API_BASE || '').trim();
    const prod = Boolean(import.meta.env.PROD);
    if (raw) {
        const base = raw.replace(/\/+$/, '');
        if (prod && !/\/api$/i.test(base)) {
            throw new Error('Invalid VITE_API_BASE (production). It must end with "/api".');
        }
        return base;
    }
    if (prod) return '/api';
    return 'http://localhost:4000/api';
})();

export const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

export function installUnauthorizedInterceptor(onUnauthorized) {
    api.interceptors.response.use(
        (res) => res,
        (err) => {
            const status = err?.response?.status;
            if (status === 401 && typeof onUnauthorized === 'function') {
                onUnauthorized();
            }
            return Promise.reject(err);
        }
    );
}

export function setAuthToken(token) {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete api.defaults.headers.common.Authorization;
}

export function setBranchId(branchId) {
    if (branchId) api.defaults.headers.common['x-branch-id'] = branchId;
    else delete api.defaults.headers.common['x-branch-id'];
}
