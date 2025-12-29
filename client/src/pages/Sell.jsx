import { Html5Qrcode } from 'html5-qrcode';
import React from 'react';

import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function SellPage() {
    const { staff, activeBranchId } = useAuth();
    const branchId = staff?.role === 'ADMIN' ? activeBranchId || staff?.branchId : staff?.branchId;

    const [items, setItems] = React.useState([]);
    const [paid, setPaid] = React.useState(0);
    const [paymentMethod, setPaymentMethod] = React.useState('CASH');
    const [error, setError] = React.useState('');
    const [sale, setSale] = React.useState(null);

    const [scanning, setScanning] = React.useState(false);
    const [lastScanned, setLastScanned] = React.useState('');

    const qrRegionId = 'sell-qr-reader';

    function ensureItem(productId) {
        setItems((prev) => {
            const idx = prev.findIndex((x) => x.productId === productId);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], qty: Number(next[idx].qty) + 1 };
                return next;
            }
            return [...prev, { productId, qty: 1, name: '' }];
        });
    }

    async function lookupAndAdd(qr) {
        if (!qr) return;
        if (qr === lastScanned) return;
        setLastScanned(qr);

        try {
            const r = await api.get(`/products/by-qr/${encodeURIComponent(qr)}`);
            const p = r.data.product;
            ensureItem(p.id);
            setItems((prev) => prev.map((it) => (it.productId === p.id ? { ...it, name: p.name } : it)));
            setError('');
        } catch (e) {
            setError(e?.response?.data?.error || 'ProductNotFound');
        }
    }

    async function startScan() {
        setError('');
        setSale(null);

        const qr = new Html5Qrcode(qrRegionId);
        window.__civlilySellQr = qr;

        try {
            const devices = await Html5Qrcode.getCameras();
            const cameraId = devices?.[0]?.id;
            if (!cameraId) throw new Error('NoCamera');

            await qr.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    await lookupAndAdd(decodedText);
                },
                () => { }
            );

            setScanning(true);
        } catch (e) {
            setError(e?.message || 'ScanFailed');
            try {
                await qr.stop();
            } catch {
                // ignore
            }
            try {
                await qr.clear();
            } catch {
                // ignore
            }
        }
    }

    async function stopScan() {
        const qr = window.__civlilySellQr;
        if (!qr) return;
        try {
            await qr.stop();
        } catch {
            // ignore
        }
        try {
            await qr.clear();
        } catch {
            // ignore
        }
        setScanning(false);
    }

    React.useEffect(() => {
        return () => {
            stopScan();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateItem(idx, patch) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    }

    function addManualItem() {
        setItems((prev) => [...prev, { productId: '', qty: 1, name: '' }]);
    }

    function removeItem(idx) {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    }

    async function submit(e) {
        e.preventDefault();
        setError('');
        setSale(null);

        try {
            const payload = {
                branchId,
                paymentMethod,
                paid: Number(paid),
                items: items
                    .filter((x) => x.productId && Number(x.qty) > 0)
                    .map((x) => ({ productId: x.productId, quantity: Number(x.qty) })),
            };

            const r = await api.post('/sales', payload);
            setSale(r.data.sale);
            setItems([]);
            setPaid(0);
        } catch (err) {
            setError(err?.response?.data?.error || 'SaleFailed');
        }
    }

    return (
        <div>
            <h2>Sell</h2>

            <div style={{ marginBottom: 10 }}>
                <strong>Branch:</strong> {branchId || '-'}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {!scanning ? (
                    <button onClick={startScan}>Start QR Scan</button>
                ) : (
                    <button onClick={stopScan}>Stop QR Scan</button>
                )}
                <button type="button" onClick={addManualItem}>
                    Add manual item
                </button>
            </div>

            <div id={qrRegionId} style={{ width: 320, marginTop: 12 }} />

            <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 620, marginTop: 12 }}>
                <label>
                    Payment method:
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginLeft: 8 }}>
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                        <option value="MOBILE_MONEY">MOBILE_MONEY</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                        <option value="OTHER">OTHER</option>
                    </select>
                </label>

                <label>
                    Paid:
                    <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} style={{ marginLeft: 8 }} />
                </label>

                <div style={{ display: 'grid', gap: 8 }}>
                    <strong>Items</strong>
                    {items.length === 0 ? <div style={{ color: '#666' }}>No items yet. Scan a QR or add manually.</div> : null}
                    {items.map((it, idx) => (
                        <div key={`${it.productId || 'new'}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                placeholder="productId"
                                value={it.productId}
                                onChange={(e) => updateItem(idx, { productId: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            <input
                                type="number"
                                min="1"
                                value={it.qty}
                                onChange={(e) => updateItem(idx, { qty: e.target.value })}
                                style={{ width: 90 }}
                            />
                            <button type="button" onClick={() => removeItem(idx)}>
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <button type="submit" disabled={!branchId || items.length === 0}>
                    Create Sale
                </button>
            </form>

            {error ? <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div> : null}

            {sale ? (
                <div style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                    <div>
                        <strong>Sale created:</strong> {sale.id}
                    </div>
                    <div>Total: {String(sale.total)}</div>
                    <div>Paid: {String(sale.paid)}</div>
                    <div>Change: {String(sale.change)}</div>
                </div>
            ) : null}
        </div>
    );
}
