import { useNavigate } from 'react-router-dom';

import { useI18n } from '../i18n/I18nContext.jsx';

export default function WelcomePage() {
    const { t } = useI18n();
    const nav = useNavigate();

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
                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>Welcome to CIVLILY! Manage your branch efficiently.</strong>
                                <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.78)' }}>{t('auth.welcome.body')}</div>
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
                                <div className="authPanelTitle">{t('auth.welcome.signInPanelTitle')}</div>
                                <div className="authPanelSub">{t('auth.welcome.signInPanelSubtitle')}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                            <button className="button authPrimaryBtn" type="button" onClick={() => nav('/login')} style={{ width: '100%', padding: '12px 14px', borderRadius: 14 }}>
                                {t('auth.welcome.signIn')}
                            </button>

                            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                                {t('auth.welcome.footer')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
