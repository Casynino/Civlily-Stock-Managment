import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function roleLabel(role) {
    if (!role) return '';
    return String(role).toUpperCase();
}

function canSee(roles, role) {
    if (!roles || roles.length === 0) return true;
    return roles.includes(role);
}

export function AppLayout({ title, subtitle, children, navItems }) {
    const { staff, logout, activeBranchId, setActiveBranchId } = useAuth();
    const { t } = useI18n();
    const loc = useLocation();
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    const visibleNav = (navItems || []).filter((x) => canSee(x.roles, staff?.role));

    React.useEffect(() => {
        setDrawerOpen(false);
    }, [loc.pathname]);

    const bottomNav = visibleNav.filter((x) => x.type === 'link').slice(0, 4);

    function renderNav({ mode }) {
        return (
            <div className="c-nav">
                {visibleNav.map((item) => {
                    if (item.type === 'section') {
                        return (
                            <div key={item.key} className="c-navSection">
                                {item.label}
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={`${mode}-${item.to}`}
                            to={item.to}
                            className={({ isActive }) => (isActive ? 'c-navLink c-navLinkActive' : 'c-navLink')}
                            end={item.end}
                        >
                            <span style={{ width: 18, opacity: 0.9 }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="c-app">
            <div className="c-shell">
                <aside className="c-sidebar">
                    <div className="c-brand">
                        <div className="c-logo" />
                        <div className="c-brandTitle">
                            <strong>CIVLILY</strong>
                            <span>{t('app.inventorySales')}</span>
                        </div>
                    </div>

                    {renderNav({ mode: 'desktop' })}

                    <div className="c-divider" />

                    <div className="c-row" style={{ justifyContent: 'space-between' }}>
                        <span className="c-chip">{staff?.name || 'User'} · {roleLabel(staff?.role)}</span>
                        <button className="c-button" onClick={logout} type="button">
                            {t('common.logout')}
                        </button>
                    </div>
                </aside>

                <main className="c-main">
                    <div className="c-topbar">
                        <div className="c-topbarInner">
                            <div className="c-mobileTop">
                                <button className="c-button" type="button" onClick={() => setDrawerOpen(true)} aria-label={t('common.openMenu')}>
                                    ☰
                                </button>
                                <div className="c-logo" style={{ width: 28, height: 28, borderRadius: 9 }} />
                            </div>

                            <div className="c-topbarLeft">
                                <div className="c-pageTitle">{title}</div>
                                {subtitle ? <div className="c-subtitle">{subtitle}</div> : null}
                            </div>

                            <div className="c-actions">
                                {staff?.role === 'ADMIN' ? (
                                    <label className="c-chip">
                                        {t('settings.activeBranch')}
                                        <select
                                            className="c-select"
                                            value={activeBranchId || staff?.branchId || ''}
                                            onChange={(e) => setActiveBranchId(e.target.value)}
                                        >
                                            <option value={staff?.branchId || ''}>{staff?.branchName || 'Main Branch'}</option>
                                            {activeBranchId && activeBranchId !== staff?.branchId ? (
                                                <option value={activeBranchId}>{activeBranchId}</option>
                                            ) : null}
                                        </select>
                                    </label>
                                ) : (
                                    <span className="c-chip">{t('common.branch')}: {staff?.branchName || '-'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="c-content">{children}</div>
                </main>

            </div>

            <div className={drawerOpen ? 'c-drawerOverlay open' : 'c-drawerOverlay'} onClick={() => setDrawerOpen(false)}>
                <div className="c-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="c-brand" style={{ borderBottomColor: 'rgba(255,255,255,0.18)' }}>
                        <div className="c-logo" />
                        <div className="c-brandTitle">
                            <strong style={{ color: '#fff' }}>CIVLILY</strong>
                            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{staff?.name || 'User'}</span>
                        </div>
                    </div>

                    {renderNav({ mode: 'drawer' })}

                    <div className="c-divider" style={{ background: 'rgba(255,255,255,0.18)' }} />
                    <button className="c-button" type="button" onClick={logout} style={{ width: '100%' }}>
                        {t('common.logout')}
                    </button>
                </div>
            </div>

            <nav className="c-bottomNav" aria-label="Bottom navigation">
                {bottomNav.map((item) => (
                    <NavLink
                        key={`bottom-${item.to}`}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => (isActive ? 'active' : undefined)}
                    >
                        <div style={{ fontSize: 16, lineHeight: '16px' }}>{item.icon}</div>
                        <div>{item.label}</div>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
