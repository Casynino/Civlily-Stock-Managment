import axios from 'axios';

const API_BASE = (() => {
    const base = String(import.meta.env.VITE_API_BASE || '').trim();
    const prod = Boolean(import.meta.env.PROD);
    if (base) return base;
    if (prod) throw new Error('Missing VITE_API_BASE (production).');
    return 'http://localhost:4000/api';
})();

export const api = axios.create({
    baseURL: API_BASE,
});

export function installUnauthorizedInterceptor(onUnauthorized) {
    api.interceptors.response.use(
        (res) => res,
        (err) => {
            const status = err?.response?.status;
            if (status === 401 && typeof onUnauthorized === 'function') {
                const token = localStorage.getItem('token');
                if (token !== 'demo') onUnauthorized();
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
