import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth.jsx';
import { navItems } from '../data/nav.js';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import styles from '../styles/appShell.module.js';

function cx(...xs) {
    return xs.filter(Boolean).join(' ');
}

export default function AppShell({ titleKey, children }) {
    const { state, api } = useStore();
    const { staff, logout } = useAuth();
    const { t } = useI18n();
    const loc = useLocation();
    const nav = useNavigate();
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [langOpen, setLangOpen] = React.useState(false);
    const [currencyOpen, setCurrencyOpen] = React.useState(false);
    const langWrapRef = React.useRef(null);
    const currencyWrapRef = React.useRef(null);

    React.useEffect(() => {
        setDrawerOpen(false);
    }, [loc.pathname]);

    React.useEffect(() => {
        function onDocMouseDown(e) {
            const langEl = langWrapRef.current;
            const curEl = currencyWrapRef.current;
            if (langEl && !langEl.contains(e.target)) setLangOpen(false);
            if (curEl && !curEl.contains(e.target)) setCurrencyOpen(false);
        }
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    const activeBranch = (state.branches || []).find((b) => b.id === state.settings?.activeBranchId) || (state.branches || [])[0];

    const staffLabel = React.useMemo(() => {
        if (!staff) return '';
        const sid = String(staff.staffId || '').trim();
        if (sid) return sid;
        const email = String(staff.email || '').trim();
        if (email) return email;
        return '';
    }, [staff]);

    const langLabel = (state.settings?.language || 'en') === 'zh' ? '中' : 'EN';

    const isAdmin = String(staff?.role || '').toUpperCase() === 'ADMIN';

    const role = String(staff?.role || '').toUpperCase();

    function canAccessNav(to) {
        if (!to) return true;
        if (role === 'ADMIN') return true;

        // Normal staff: only Sales & Expenses (+ Home)
        if (role === 'CASHIER' || role === 'STOREKEEPER') {
            return to === '/' || to === '/sales' || to === '/expenses';
        }

        // Managers: allow most operational modules, but keep admin-only areas hidden
        if (role === 'MANAGER') {
            if (to === '/staff' || to === '/branches') return false;
            return true;
        }

        // Default: be conservative
        return to === '/' || to === '/sales' || to === '/expenses';
    }

    function pruneSections(items) {
        const out = [];
        let pendingSection = null;
        let hasLinkInSection = false;

        for (const item of items) {
            if (item.type === 'section') {
                if (pendingSection && hasLinkInSection) out.push(pendingSection);
                pendingSection = item;
                hasLinkInSection = false;
                continue;
            }

            if (item.type === 'link') {
                if (!canAccessNav(item.to)) continue;
                if (pendingSection && !hasLinkInSection) {
                    out.push(pendingSection);
                    hasLinkInSection = true;
                }
                out.push(item);
                continue;
            }

            // unknown item type
            out.push(item);
        }

        return out;
    }

    const visibleNavItems = React.useMemo(() => {
        if (!staff) return navItems;
        if (isAdmin) return navItems;
        return pruneSections(navItems);
    }, [isAdmin, staff]);

    const links = visibleNavItems.filter((x) => x.type === 'link');
    const bottomNav = links.slice(0, 4);

    function renderNav({ mode }) {
        return (
            <div className={styles.nav}>
                {visibleNavItems.map((item) => {
                    if (item.type === 'section') {
                        return (
                            <div key={item.key} className={styles.navSection}>
                                {item.i18nKey ? t(item.i18nKey) : item.label}
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={`${mode}-${item.to}`}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => cx(styles.navLink, isActive && styles.navLinkActive)}
                        >
                            <span style={{ width: 18 }}>{item.icon}</span>
                            <span>{item.i18nKey ? t(item.i18nKey) : item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={styles.appShell}>
            <div className={styles.shell}>
                <aside className={styles.sidebar}>
                    <div className={styles.brand}>
                        <div className={styles.logo} />
                        <div className={styles.brandTitle}>
                            <strong className="civlilyWordmark">Civlily</strong>
                            <span>{t('app.inventorySales')}</span>
                        </div>
                    </div>

                    {renderNav({ mode: 'desktop' })}

                    <div className={styles.divider} />

                    <div className={styles.chip}>
                        {activeBranch?.name || 'Branch'}
                    </div>
                </aside>

                <main className={styles.main}>
                    <div className={styles.topbar}>
                        <div className={styles.topbarInner}>
                            <div className={styles.mobileTop}>
                                <button className={styles.button} type="button" onClick={() => setDrawerOpen(true)}>
                                    ☰
                                </button>
                                <div className={styles.logo} style={{ width: 28, height: 28, borderRadius: 9 }} />
                            </div>

                            <div className={styles.topLeft}>
                                <div className={styles.pageTitle}>{titleKey ? t(titleKey) : ''}</div>
                                <div className={styles.subtitle}>{activeBranch?.name || 'Branch'}</div>
                            </div>

                            <div className={styles.actions}>
                                <div className="topbarMenuWrap" ref={langWrapRef}>
                                    <button
                                        className={cx(styles.chip, 'topbarChipBtn')}
                                        type="button"
                                        aria-haspopup="menu"
                                        aria-expanded={langOpen ? 'true' : 'false'}
                                        onClick={() => {
                                            setLangOpen((v) => !v);
                                            setCurrencyOpen(false);
                                        }}
                                    >
                                        {langLabel}
                                    </button>

                                    {langOpen ? (
                                        <div className="topbarMenu" role="menu" aria-label="Language">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={cx('topbarMenuItem', (state.settings?.language || 'en') === 'en' && 'active')}
                                                onClick={() => {
                                                    api.setSettings({ language: 'en' });
                                                    setLangOpen(false);
                                                }}
                                            >
                                                English 🇬🇧
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={cx('topbarMenuItem', (state.settings?.language || 'en') === 'zh' && 'active')}
                                                onClick={() => {
                                                    api.setSettings({ language: 'zh' });
                                                    setLangOpen(false);
                                                }}
                                            >
                                                Chinese 🇨🇳
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="topbarMenuWrap" ref={currencyWrapRef}>
                                    <button
                                        className={cx(styles.chip, 'topbarChipBtn')}
                                        type="button"
                                        aria-haspopup="menu"
                                        aria-expanded={currencyOpen ? 'true' : 'false'}
                                        onClick={() => {
                                            setCurrencyOpen((v) => !v);
                                            setLangOpen(false);
                                        }}
                                    >
                                        {state.settings?.currency || 'TZS'}
                                    </button>

                                    {currencyOpen ? (
                                        <div className="topbarMenu" role="menu" aria-label="Currency">
                                            {['TZS', 'USD', 'CNY'].map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    role="menuitem"
                                                    className={cx('topbarMenuItem', (state.settings?.currency || 'TZS') === c && 'active')}
                                                    onClick={() => {
                                                        api.setSettings({ currency: c });
                                                        setCurrencyOpen(false);
                                                    }}
                                                >
                                                    {c === 'CNY' ? 'CNY (RMB)' : c}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                                <button
                                    className={styles.button}
                                    type="button"
                                    onClick={() => {
                                        logout();
                                        nav('/welcome', { replace: true });
                                    }}
                                >
                                    {t('common.logout')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.content}>{children}</div>
                </main>
            </div>

            <div
                className={cx(styles.drawerOverlay, drawerOpen && styles.drawerOverlayOpen)}
                onClick={() => setDrawerOpen(false)}
            >
                <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.brand} style={{ borderBottomColor: 'rgba(255,255,255,0.18)' }}>
                        <div className={styles.logo} />
                        <div className={styles.brandTitle}>
                            <strong className="civlilyWordmark" style={{ color: '#fff' }}>Civlily</strong>
                            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{activeBranch?.name || 'Branch'}</span>
                        </div>
                    </div>

                    {renderNav({ mode: 'drawer' })}
                </div>
            </div>

            <nav className={styles.bottomNav}>
                {bottomNav.map((item) => (
                    <NavLink
                        key={`bottom-${item.to}`}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => (isActive ? 'active' : undefined)}
                    >
                        <div style={{ fontSize: 16, lineHeight: '16px' }}>{item.icon}</div>
                        <div>{item.i18nKey ? t(item.i18nKey) : item.label}</div>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
