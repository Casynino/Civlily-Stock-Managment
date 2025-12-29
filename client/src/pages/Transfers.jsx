import React from 'react';

import { useStore } from '../data/StoreContext.jsx';

export default function TransfersPage() {
    const { state, api } = useStore();
    const [error, setError] = React.useState('');

    const branches = state.branches || [];
    const products = state.products || [];
    const transfers = state.transfers || [];

    const activeBranchId = state.settings?.activeBranchId || branches[0]?.id;
    const today = new Date().toISOString().slice(0, 10);

    const [date, setDate] = React.useState(today);
    const [fromBranchId, setFromBranchId] = React.useState(String(activeBranchId || ''));
    const [toBranchId, setToBranchId] = React.useState('');
    const [productId, setProductId] = React.useState(products[0]?.id || '');
    const [qty, setQty] = React.useState(1);

    React.useEffect(() => {
        setFromBranchId(String(activeBranchId || ''));
    }, [activeBranchId]);

    const stockBucket = React.useMemo(() => {
        const bid = String(fromBranchId || '');
        const ledger = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : {};
        const bucket = bid ? ledger[bid] : null;
        return bucket && typeof bucket === 'object' ? bucket : {};
    }, [state.productStocks, fromBranchId]);

    const history = transfers
        .filter((t) => (activeBranchId ? String(t.fromBranchId || '') === String(activeBranchId) || String(t.toBranchId || '') === String(activeBranchId) : true))
        .slice()
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    function setStatus(transferId, status) {
        setError('');
        const res = api.updateTransferStatus({ transferId, status });
        if (!res.ok) setError(res.error || 'Update failed.');
    }

    function submit(e) {
        e.preventDefault();
        setError('');

        const q = Number(qty || 0);
        if (!Number.isFinite(q) || q <= 0) {
            setError('Quantity must be greater than 0.');
            return;
        }
        if (!fromBranchId || !toBranchId) {
            setError('Select both source and destination branches.');
            return;
        }
        if (String(fromBranchId) === String(toBranchId)) {
            setError('Source and destination branches must be different.');
            return;
        }
        if (!productId) {
            setError('Select a valid product.');
            return;
        }

        const available = Number(stockBucket[productId] ?? 0);
        if (q > available) {
            setError(`Not enough stock. Available: ${available}.`);
            return;
        }

        const res = api.transferStock({ fromBranchId, toBranchId, productId, qty: q, date });
        if (!res.ok) {
            setError(res.error || 'Transfer failed.');
            return;
        }

        setToBranchId('');
        setQty(1);
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Stock Transfers</div>
                        <div className="muted" style={{ fontSize: 12 }}>Transfer products between branches (local)</div>
                    </div>
                </div>

                <div className="divider" />

                {error ? <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{error}</div> : null}

                <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
                    <div className="formGrid two">
                        <label className="field">
                            <span className="fieldLabel">Date</span>
                            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="fieldLabel">Product</span>
                            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.id} — {p.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="fieldLabel">From branch</span>
                            <select className="input" value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)}>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="fieldLabel">To branch</span>
                            <select className="input" value={toBranchId} onChange={(e) => setToBranchId(e.target.value)}>
                                <option value="">Select…</option>
                                {branches
                                    .filter((b) => String(b.id) !== String(fromBranchId))
                                    .map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="fieldLabel">Quantity</span>
                            <input className="input" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
                            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                                Available: {Number(stockBucket[productId] ?? 0)}
                            </div>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="button" type="submit" style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                            Transfer
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">Transfer History</div>
                </div>
                <div className="divider" />

                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 860 }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Qty</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((t) => {
                                const p = products.find((x) => String(x.id) === String(t.productId));
                                const from = branches.find((b) => String(b.id) === String(t.fromBranchId));
                                const to = branches.find((b) => String(b.id) === String(t.toBranchId));
                                const st = String(t.status || 'Completed').toUpperCase();
                                return (
                                    <tr key={t.id}>
                                        <td>{t.date || '-'}</td>
                                        <td style={{ fontWeight: 800 }}>{p ? `${p.id} — ${p.name}` : t.productId}</td>
                                        <td>{from?.name || t.fromBranchId}</td>
                                        <td>{to?.name || t.toBranchId}</td>
                                        <td>{t.qty}</td>
                                        <td>{t.status || 'Completed'}</td>
                                        <td>
                                            {st === 'PENDING' ? (
                                                <button className="button" type="button" onClick={() => setStatus(t.id, 'APPROVED')}>
                                                    Approve
                                                </button>
                                            ) : null}
                                            {st === 'APPROVED' ? (
                                                <button
                                                    className="button"
                                                    type="button"
                                                    onClick={() => setStatus(t.id, 'COMPLETED')}
                                                    style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                                                >
                                                    Complete
                                                </button>
                                            ) : null}
                                            {st !== 'PENDING' && st !== 'APPROVED' ? <span className="muted">—</span> : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {history.length === 0 ? <div className="empty">No transfers yet.</div> : null}
            </div>
        </div>
    );
}
