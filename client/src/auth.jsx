import React from 'react';

import { api as http, setAuthToken, setBranchId } from './api.js';
import { useStore } from './data/StoreContext.jsx';

const TOKEN_KEY = 'token';
const SESSION_KEY = 'civlily_session_staff_v1';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
    const { state, api } = useStore();
    const [staff, setStaff] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
    const [authError, setAuthError] = React.useState('');

    React.useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) setAuthToken(token);
    }, []);

    React.useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        let cancelled = false;
        (async () => {
            try {
                setAuthLoading(true);
                setAuthError('');
                const r = await http.get('/auth/me', {
                    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
                    params: { _ts: Date.now() },
                });
                if (cancelled) return;
                const next = r?.data?.staff || null;
                setStaff(next);
                localStorage.setItem(SESSION_KEY, JSON.stringify(next));

                try {
                    const b = await http.get('/bootstrap', {
                        headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
                        params: { _ts: Date.now() },
                    });
                    if (!cancelled) {
                        const payload = b?.data;
                        api.hydrate(payload);
                        const bid = String(payload?.branches?.[0]?.id || '');
                        if (bid) api.setSettings({ activeBranchId: bid });
                    }
                } catch {
                    // ignore
                }
            } catch (e) {
                if (cancelled) return;
                const status = e?.response?.status;
                if (status === 401) {
                    setStaff(null);
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TOKEN_KEY);
                    setAuthToken(null);
                    setBranchId(null);
                } else {
                    setAuthError('Unable to reach the server. Check your connection and try again.');
                }
            } finally {
                if (!cancelled) setAuthLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        const branches = Array.isArray(state.branches) ? state.branches : [];
        const nextBranchId = String(branches[0]?.id || '');
        if (!nextBranchId) return;
        const current = String(state.settings?.activeBranchId || '');
        const exists = branches.some((b) => String(b?.id || '') === current);
        if (!current || !exists) api.setSettings({ activeBranchId: nextBranchId });
    }, [state.branches, state.settings?.activeBranchId, api]);

    React.useEffect(() => {
        const bid = String(state.settings?.activeBranchId || '');
        setBranchId(bid || null);
    }, [state.settings?.activeBranchId]);

    function normalizeIdentifier(x) {
        return String(x || '').trim().toLowerCase();
    }

    async function login({ identifier, password }) {
        const ident = normalizeIdentifier(identifier);
        const pass = String(password || '');
        if (!ident || !pass) throw new Error('Invalid credentials');

        setAuthLoading(true);
        setAuthError('');
        try {
            const r = await http.post('/auth/login', { identifier, password: pass });
            const token = String(r?.data?.token || '');
            const nextStaff = r?.data?.staff || null;
            if (!token || !nextStaff) throw new Error('Invalid credentials');

            localStorage.setItem(TOKEN_KEY, token);
            setAuthToken(token);

            setStaff(nextStaff);
            localStorage.setItem(SESSION_KEY, JSON.stringify(nextStaff));

            try {
                const b = await http.get('/bootstrap', {
                    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
                    params: { _ts: Date.now() },
                });
                const payload = b?.data;
                api.hydrate(payload);
                const bid = String(payload?.branches?.[0]?.id || '');
                if (bid) api.setSettings({ activeBranchId: bid });
            } catch {
                // ignore
            }
        } finally {
            setAuthLoading(false);
        }
    }

    function logout() {
        setStaff(null);
        setAuthError('');
        setAuthLoading(false);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setBranchId(null);
    }

    return (
        <AuthContext.Provider value={{ staff, isAuthed: Boolean(staff), authLoading, authError, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx) throw new Error('AuthProvider missing');
    return ctx;
}
