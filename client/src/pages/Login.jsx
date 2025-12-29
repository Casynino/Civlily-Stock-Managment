import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function LoginPage() {
    const { t } = useI18n();
    const { login, isAuthed } = useAuth();
    const { state, api } = useStore();
    const nav = useNavigate();

    const [identifier, setIdentifier] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (isAuthed) nav('/', { replace: true });
    }, [isAuthed, nav]);

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ identifier, password });
            nav('/', { replace: true });
        } catch {
            setError(t('auth.login.error.invalid'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="authPage"
            style={{
                ['--auth-bg-image']: `url("https://images.unsplash.com/photo-1520975958225-7d14aa07f4a8?auto=format&fit=crop&w=2400&q=70")`,
                ['--auth-hero-image']: `url("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=70")`,
            }}
        >
            <div className="authPhotoLayout">
                <div className="authPhotoInner">
                    <div className="authOverlay">
                        <div className="authOverlayContent">
                            <div className="authHeroTop">
                                <div className="authHeroBadge">
                                    <div className="authHeroLogo" />
                                    <div className="authHeroBrand">
                                        <div className="authHeroBrandTitle civlilyWordmark authBigBrand">Civlily</div>
                                        <div className="authHeroBrandSub">{t('auth.welcome.subtitle')}</div>
                                    </div>
                                </div>
                                <div className="authHeroPill">BE MORE THAN PERFECT</div>
                            </div>

                            <div className="authHeroHeadline">
                                KEEP IT
                                <strong>CLASSY</strong>
                            </div>

                            <div className="authWelcomeMessage">
                                Welcome to CIVLILY! Manage your branch efficiently.
                                <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.76)' }}>{t('auth.login.body')}</div>
                            </div>

                            <div className="authFeatureStrip">
                                <div className="authFeatureChip">Fast scan</div>
                                <div className="authFeatureChip">Branch control</div>
                                <div className="authFeatureChip">Premium workflow</div>
                            </div>
                        </div>
                    </div>

                    <div className="authPanel authPanelSide">
                        <div className="authPanelHeader">
                            <div className="logo" style={{ width: 44, height: 44, borderRadius: 16 }} />
                            <div style={{ display: 'grid', gap: 2 }}>
                                <div className="authPanelTitle">{t('auth.login.title')}</div>
                                <div className="authPanelSub">{t('auth.login.subtitle')}</div>
                            </div>
                            <div className="authLangToggle" role="group" aria-label="Language">
                                <button
                                    type="button"
                                    className={state.settings?.language === 'zh' ? 'authLangBtn' : 'authLangBtn active'}
                                    onClick={() => api.setSettings({ language: 'en' })}
                                >
                                    EN
                                </button>
                                <button
                                    type="button"
                                    className={state.settings?.language === 'zh' ? 'authLangBtn active' : 'authLangBtn'}
                                    onClick={() => api.setSettings({ language: 'zh' })}
                                >
                                    中文
                                </button>
                            </div>
                        </div>

                        {error ? <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{error}</div> : null}

                        <form onSubmit={onSubmit} className="formGrid" style={{ gap: 12 }}>
                            <label className="field">
                                <span className="fieldLabel">{t('auth.login.identifier')}</span>
                                <input
                                    className="input"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder={t('auth.login.identifierPlaceholder')}
                                    autoComplete="username"
                                />
                            </label>

                            <label className="field">
                                <span className="fieldLabel">{t('auth.login.password')}</span>
                                <input
                                    className="input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('auth.login.passwordPlaceholder')}
                                    autoComplete="current-password"
                                />
                            </label>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button className="button" type="button" onClick={() => nav('/welcome')}>
                                    {t('common.cancel')}
                                </button>
                                <button className="button authPrimaryBtn" disabled={loading} type="submit" style={{ padding: '10px 14px', borderRadius: 14 }}>
                                    {loading ? '…' : t('auth.login.signIn')}
                                </button>
                            </div>
                        </form>

                        <div className="authDemo">
                            <div className="muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                                {t('auth.welcome.demoHint')}
                            </div>
                            <div className="authCode">
                                ADMIN001 / Admin123! &nbsp;|&nbsp; admin@civlily.local / Admin123!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
