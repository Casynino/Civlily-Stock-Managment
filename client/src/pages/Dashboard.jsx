import React from 'react';

import { API_BASE, api as http } from '../api.js';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function money(currency, n) {
    const num = Number(n);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'TZS' }).format(num);
}

export default function DashboardPage() {
    const { state } = useStore();
    const { t } = useI18n();
    const [mode, setMode] = React.useState('ONLINE');
    const [diag, setDiag] = React.useState({ loading: true, ok: false, error: '' });

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setDiag({ loading: true, ok: false, error: '' });
                const r = await http.get('/diagnostics/db', { params: { _ts: Date.now() } });
                if (cancelled) return;
                setDiag({ loading: false, ok: Boolean(r?.data?.ok), error: '' });
            } catch (e) {
                if (cancelled) return;
                setDiag({ loading: false, ok: false, error: e?.response?.data?.error || e?.message || 'Diagnostics failed' });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const currency = state.settings?.currency || 'TZS';
    const activeBranch = (state.branches || []).find((b) => b.id === state.settings?.activeBranchId) || (state.branches || [])[0];
    const activeBranchId = activeBranch?.id;

    const stockBucket = React.useMemo(() => {
        const bid = String(activeBranchId || '');
        const ledger = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : {};
        const bucket = bid ? ledger[bid] : null;
        return bucket && typeof bucket === 'object' ? bucket : {};
    }, [state.productStocks, activeBranchId]);

    const today = new Date().toISOString().slice(0, 10);

    const products = state.products || [];
    const customers = state.customers || [];
    const sales = state.sales || [];
    const transfers = state.transfers || [];
    const branches = state.branches || [];

    const visibleTransfers = React.useMemo(() => {
        return (Array.isArray(transfers) ? transfers : []).filter((tr) => {
            if (!activeBranchId) return true;
            return String(tr?.fromBranchId || '') === String(activeBranchId) || String(tr?.toBranchId || '') === String(activeBranchId);
        });
    }, [transfers, activeBranchId]);

    const transferCounts = React.useMemo(() => {
        const counts = { pending: 0, approved: 0 };
        for (const tr of visibleTransfers) {
            const st = String(tr?.status || 'Completed').toUpperCase();
            if (st === 'PENDING') counts.pending += 1;
            else if (st === 'APPROVED') counts.approved += 1;
        }
        return counts;
    }, [visibleTransfers]);

    const paidSales = sales.filter((s) => {
        if (activeBranchId && s.branchId && s.branchId !== activeBranchId) return false;
        return s.status === 'Paid';
    });

    const totalSalesAmount = paidSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const productsSold = paidSales.reduce((sum, s) => {
        const items = Array.isArray(s.items) ? s.items : [];
        return sum + items.reduce((sub, it) => sub + Number(it.qty || 0), 0);
    }, 0);
    const remainingStock = products.reduce((sum, p) => sum + Number(stockBucket[p.id] ?? p.stock ?? 0), 0);

    const expenses = state.expenses || [];
    const branchExpenses = expenses.filter((e) => (activeBranchId ? e.branchId === activeBranchId : true));
    const totalExpenses = branchExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalSalesAmount - totalExpenses;

    const todaysSales = sales.filter((s) => {
        if (activeBranchId && s.branchId && s.branchId !== activeBranchId) return false;
        return s.date === today && s.status === 'Paid';
    });

    const cashToday = todaysSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const ordersToday = sales.filter((s) => {
        if (activeBranchId && s.branchId && s.branchId !== activeBranchId) return false;
        return s.date === today;
    }).length;

    const recent = sales
        .filter((s) => (activeBranchId && s.branchId ? s.branchId === activeBranchId : true))
        .slice()
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 5);

    return (
        <div className="grid">
            <div className="hero">
                <div className="card">
                    <div className="branchCard">
                        <div className="branchIcon">🏪</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>{activeBranch?.name || t('common.branch')}</div>
                            <div className="muted" style={{ fontSize: 12 }}>{activeBranch?.manager || t('common.manager')}</div>
                        </div>
                        <div className="chip">{t('dashboard.onlineStatus')}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                        <button
                            type="button"
                            className="button"
                            onClick={() => setMode('ONLINE')}
                            style={{ borderColor: mode === 'ONLINE' ? 'rgba(11,79,121,0.22)' : undefined }}
                        >
                            {t('dashboard.onlineMode')}
                        </button>
                        <button
                            type="button"
                            className="button"
                            onClick={() => setMode('OFFLINE')}
                            style={{ borderColor: mode === 'OFFLINE' ? 'rgba(11,79,121,0.22)' : undefined }}
                        >
                            {t('dashboard.offlineMode')}
                        </button>
                    </div>

                    <div className="divider" style={{ marginTop: 12 }} />
                    <div style={{ display: 'grid', gap: 6, marginTop: 12, fontSize: 12 }}>
                        <div className="muted"><strong>API Base:</strong> {API_BASE}</div>
                        <div className="muted">
                            <strong>DB Diagnostics:</strong>{' '}
                            {diag.loading ? 'Checking…' : diag.ok ? 'OK' : `FAILED: ${diag.error}`}
                        </div>
                    </div>
                </div>

                <div className="kpiGrid">
                    <a className="tile" href="/sales">
                        <div className="tileIcon">🛒</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.totalSales')}</div>
                            <div className="tileValue">{money(currency, totalSalesAmount)}</div>
                        </div>
                    </a>

                    <a className="tile" href="/sales">
                        <div className="tileIcon">🧾</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.productsSold')}</div>
                            <div className="tileValue">{productsSold}</div>
                        </div>
                    </a>

                    <a className="tile" href="/inventory">
                        <div className="tileIcon">📦</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.remainingStock')}</div>
                            <div className="tileValue">{remainingStock}</div>
                        </div>
                    </a>

                    <a className="tile" href="/reports">
                        <div className="tileIcon">📊</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.ordersToday')}</div>
                            <div className="tileValue">{ordersToday}</div>
                        </div>
                    </a>

                    <a className="tile" href="/expenses">
                        <div className="tileIcon">🧾</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.totalExpenses')}</div>
                            <div className="tileValue">{money(currency, totalExpenses)}</div>
                        </div>
                    </a>

                    <a className="tile" href="/reports">
                        <div className="tileIcon">📈</div>
                        <div>
                            <div className="tileTitle">{t('dashboard.kpi.netProfit')}</div>
                            <div className="tileValue">{money(currency, netProfit)}</div>
                        </div>
                    </a>
                </div>

                <div className="actionBar">
                    <a className="actionBtn actionBtnPrimary" href="/sales">🛒 {t('dashboard.action.sell')}</a>
                    <a className="actionBtn" href="/sales?scan=1">📷 {t('dashboard.action.scan')}</a>
                </div>
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">{t('dashboard.transfers.title')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{t('dashboard.transfers.subtitle')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <a className="button" href="/transfers" style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                            Transfer
                        </a>
                        <a className="link" href="/transfers">{t('common.manage')} →</a>
                    </div>
                </div>
                <div className="divider" />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div className="chip">{t('dashboard.transfers.pending', { n: transferCounts.pending })}</div>
                    <div className="chip">{t('dashboard.transfers.approved', { n: transferCounts.approved })}</div>
                </div>
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">{t('dashboard.recentOrders.title')}</div>
                    <a className="link" href="/sales">{t('common.more')} →</a>
                </div>
                {recent.length === 0 ? (
                    <div className="empty">{t('dashboard.recentOrders.empty')}</div>
                ) : (
                    <table className="table" style={{ marginTop: 12 }}>
                        <thead>
                            <tr>
                                <th>{t('sales.history.saleNo')}</th>
                                <th>{t('dashboard.table.date')}</th>
                                <th>{t('sales.history.customer')}</th>
                                <th>{t('sales.history.total')}</th>
                                <th>{t('sales.history.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 900 }}>{s.code || s.id}</td>
                                    <td>{s.date || '-'}</td>
                                    <td>{s.customerName || '-'}</td>
                                    <td>{money(currency, s.total)}</td>
                                    <td>{t(`status.${String(s.status || '').toLowerCase()}`) || s.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">{t('dashboard.transactions.title')}</div>
                    <a className="link" href="/reports">{t('common.more')} →</a>
                </div>
                <div className="empty">{t('dashboard.transactions.empty')}</div>
            </div>
        </div>
    );
}
