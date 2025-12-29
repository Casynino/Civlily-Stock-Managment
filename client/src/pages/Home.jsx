import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { api } from '../api.js';
import { useStore } from '../data/StoreContext.jsx';

export default function HomePage() {
    const { t } = useTranslation();
    const { state } = useStore();
    const [health, setHealth] = React.useState(null);

    const branches = Array.isArray(state.branches) ? state.branches : [];
    const products = Array.isArray(state.products) ? state.products : [];
    const transfers = Array.isArray(state.transfers) ? state.transfers : [];

    const activeBranchId = String(state.settings?.activeBranchId || branches[0]?.id || '');

    const transferCounts = React.useMemo(() => {
        const counts = { pending: 0, approved: 0, completed: 0 };
        for (const tr of transfers) {
            const st = String(tr?.status || 'Completed').toUpperCase();
            if (st === 'PENDING') counts.pending += 1;
            else if (st === 'APPROVED') counts.approved += 1;
            else counts.completed += 1;
        }
        return counts;
    }, [transfers]);

    const recentTransfers = React.useMemo(() => {
        const filtered = transfers.filter((tr) => {
            if (!activeBranchId) return true;
            return String(tr?.fromBranchId || '') === activeBranchId || String(tr?.toBranchId || '') === activeBranchId;
        });
        return filtered
            .slice()
            .sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')))
            .slice(0, 5);
    }, [transfers, activeBranchId]);

    const activeBranchStockTotal = React.useMemo(() => {
        const ledger = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : {};
        const bucket = activeBranchId ? ledger[activeBranchId] : null;
        if (!bucket || typeof bucket !== 'object') return 0;
        let total = 0;
        for (const n of Object.values(bucket)) total += Number(n || 0);
        return Number.isFinite(total) ? total : 0;
    }, [state.productStocks, activeBranchId]);

    React.useEffect(() => {
        let mounted = true;
        api
            .get('/health')
            .then((r) => {
                if (mounted) setHealth(r.data);
            })
            .catch(() => {
                if (mounted) setHealth({ ok: false });
            });
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div>
            <h2>{t('home')}</h2>
            <div style={{ marginTop: 8 }}>
                {t('apiHealth')}: {health ? String(health.ok) : '...'}
            </div>

            <div
                style={{
                    marginTop: 16,
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    padding: 12,
                    maxWidth: 520,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{t('transfers')}</strong>
                    <Link to="/transfers">Open</Link>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#555' }}>Pending</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                            {transferCounts.pending}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#555' }}>Approved</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                            {transferCounts.approved}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#555' }}>Completed</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                            {transferCounts.completed}
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: 16,
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    padding: 12,
                    maxWidth: 720,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Active Branch</strong>
                    <div style={{ color: '#555', fontSize: 12 }}>
                        {branches.find((b) => String(b.id) === activeBranchId)?.name || activeBranchId || '—'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#555' }}>Total Units In Stock</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{activeBranchStockTotal}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#555' }}>Products</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{products.length}</div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: 16,
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    padding: 12,
                    maxWidth: 720,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Recent Transfers</strong>
                    <Link to="/transfers">View all</Link>
                </div>
                <div style={{ marginTop: 10, overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 680 }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Qty</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransfers.map((tr) => {
                                const p = products.find((x) => String(x.id) === String(tr.productId));
                                const from = branches.find((b) => String(b.id) === String(tr.fromBranchId));
                                const to = branches.find((b) => String(b.id) === String(tr.toBranchId));
                                return (
                                    <tr key={tr.id}>
                                        <td>{tr.date || '-'}</td>
                                        <td style={{ fontWeight: 800 }}>{p ? `${p.id} — ${p.name}` : tr.productId}</td>
                                        <td>{from?.name || tr.fromBranchId}</td>
                                        <td>{to?.name || tr.toBranchId}</td>
                                        <td>{tr.qty}</td>
                                        <td>{tr.status || 'Completed'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {recentTransfers.length === 0 ? <div className="empty">No transfers yet.</div> : null}
            </div>
        </div>
    );
}
