import React from 'react';

import { api as http, setAuthToken, setBranchId } from './api.js';
import { useStore } from './data/StoreContext.jsx';

const TOKEN_KEY = 'token';
const SESSION_KEY = 'civlily_session_staff_v1';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
    const { state, api } = useStore();
    const [staff, setStaff] = React.useState(() => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

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
                const r = await http.get('/auth/me');
                if (cancelled) return;
                const next = r?.data?.staff || null;
                setStaff(next);
                localStorage.setItem(SESSION_KEY, JSON.stringify(next));

                try {
                    const b = await http.get('/bootstrap');
                    if (!cancelled) api.hydrate(b?.data);
                } catch {
                    // ignore
                }
            } catch {
                // ignore - interceptor will handle 401 and force logout
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (!staff) return;
        const role = String(staff.role || '').toUpperCase();
        if (role === 'ADMIN') return;
        const branches = Array.isArray(state.branches) ? state.branches : [];
        const fallbackBranchId = String(branches[0]?.id || '');
        const nextBranchId = String(staff.branchId || fallbackBranchId);
        if (nextBranchId && state.settings?.activeBranchId !== nextBranchId) {
            api.setSettings({ activeBranchId: nextBranchId });
        }
    }, [staff, state.branches, state.settings?.activeBranchId, api]);

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

        const r = await http.post('/auth/login', { identifier, password: pass });
        const token = String(r?.data?.token || '');
        const nextStaff = r?.data?.staff || null;
        if (!token || !nextStaff) throw new Error('Invalid credentials');

        localStorage.setItem(TOKEN_KEY, token);
        setAuthToken(token);

        setStaff(nextStaff);
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextStaff));

        try {
            const b = await http.get('/bootstrap');
            api.hydrate(b?.data);
        } catch {
            // ignore
        }

        const branches = Array.isArray(state.branches) ? state.branches : [];
        const fallbackBranchId = String(branches[0]?.id || '');
        const role = String(nextStaff.role || '').toUpperCase();
        const nextBranchId = role === 'ADMIN'
            ? String(state.settings?.activeBranchId || nextStaff.branchId || fallbackBranchId)
            : String(nextStaff.branchId || fallbackBranchId);

        if (nextBranchId) api.setSettings({ activeBranchId: nextBranchId });
    }

    function logout() {
        setStaff(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setBranchId(null);
    }

    return (
        <AuthContext.Provider value={{ staff, isAuthed: Boolean(staff), login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx) throw new Error('AuthProvider missing');
    return ctx;
}
