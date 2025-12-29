import React from 'react';

import { useAuth } from '../auth.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function SettingsPage() {
    const { state, api } = useStore();
    const { staff } = useAuth();
    const { t } = useI18n();

    const isAdmin = String(staff?.role || '').toUpperCase() === 'ADMIN';

    const [currency, setCurrency] = React.useState(state.settings?.currency || 'TZS');
    const [activeBranchId, setActiveBranchId] = React.useState(state.settings?.activeBranchId || (state.branches || [])[0]?.id);
    const [language, setLanguage] = React.useState(state.settings?.language || 'en');

    React.useEffect(() => {
        setCurrency(state.settings?.currency || 'TZS');
        setActiveBranchId(state.settings?.activeBranchId || (state.branches || [])[0]?.id);
        setLanguage(state.settings?.language || 'en');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.settings?.currency, state.settings?.activeBranchId, state.settings?.language]);

    function save() {
        api.setSettings({
            currency,
            activeBranchId,
            language,
        });
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">{t('settings.title')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{t('settings.subtitle')}</div>
                    </div>
                    <button className="button" type="button" onClick={save} style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>{t('settings.save')}</button>
                </div>

                <div className="divider" />

                <div style={{ display: 'grid', gap: 12, maxWidth: 620 }}>
                    <label className="field">
                        <span className="fieldLabel">{t('settings.language')}</span>
                        <select
                            value={language}
                            onChange={(e) => {
                                const next = e.target.value;
                                setLanguage(next);
                                api.setSettings({ language: next });
                            }}
                            className="input"
                        >
                            <option value="en">{t('lang.en')}</option>
                            <option value="zh">{t('lang.zh')}</option>
                        </select>
                    </label>

                    <label className="field">
                        <span className="fieldLabel">{t('settings.currency')}</span>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="input"
                        >
                            <option value="TZS">TZS</option>
                            <option value="USD">USD</option>
                            <option value="CNY">CNY (RMB)</option>
                        </select>
                    </label>

                    <label className="field">
                        <span className="fieldLabel">{t('settings.activeBranch')}</span>
                        <select
                            value={activeBranchId}
                            onChange={(e) => setActiveBranchId(e.target.value)}
                            className="input"
                            disabled={!isAdmin}
                        >
                            {(state.branches || []).map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </div>
    );
}
