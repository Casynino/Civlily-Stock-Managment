import React from 'react';

import { useStore } from '../data/StoreContext.jsx';
import { STRINGS } from './strings.js';

const I18nContext = React.createContext(null);

function getDict(lang) {
    const key = String(lang || '').toLowerCase();
    if (key.startsWith('zh')) return STRINGS.zh;
    return STRINGS.en;
}

export function I18nProvider({ children }) {
    const { state } = useStore();
    const lang = state.settings?.language || 'en';

    const value = React.useMemo(() => {
        const dict = getDict(lang);

        function t(k, vars) {
            const raw = dict[k] || STRINGS.en[k] || k;
            if (!vars || typeof vars !== 'object') return raw;
            return Object.keys(vars).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(vars[key])), raw);
        }

        return { lang, t };
    }, [lang]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const ctx = React.useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
