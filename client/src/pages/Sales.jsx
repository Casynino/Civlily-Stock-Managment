import React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { api as http } from '../api.js';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function money(currency, n) {
    const num = Number(n);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'TZS' }).format(num);
}

export default function SalesPage() {
    const { state, api } = useStore();
    const { t } = useI18n();
    const loc = useLocation();
    const nav = useNavigate();
    const [tab, setTab] = React.useState('SELL_NOW');
    const [error, setError] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const [scanOpen, setScanOpen] = React.useState(false);
    const [scanError, setScanError] = React.useState('');
    const [scanSimValue, setScanSimValue] = React.useState('');
    const [scannedBarcode, setScannedBarcode] = React.useState('');
    const [scannedProductId, setScannedProductId] = React.useState('');
    const [quickQty, setQuickQty] = React.useState(1);

    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const scanTimerRef = React.useRef(null);

    const currency = state.settings?.currency || 'TZS';
    const activeBranchId = state.settings?.activeBranchId;

    const stockBucket = React.useMemo(() => {
        const bid = String(activeBranchId || '');
        const ledger = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : {};
        const bucket = bid ? ledger[bid] : null;
        return bucket && typeof bucket === 'object' ? bucket : {};
    }, [state.productStocks, activeBranchId]);

    const products = state.products || [];
    const customers = state.customers || [];
    const sales = state.sales || [];
    const categories = state.categories || [];
    const categoryById = React.useMemo(() => new Map(categories.map((c) => [String(c.id || ''), c])), [categories]);

    const [productQuery, setProductQuery] = React.useState('');
    const [qty, setQty] = React.useState(1);
    const walkInCustomerId = React.useMemo(() => {
        const w = customers.find((c) => String(c.code || '') === 'CU000' || String(c.name || '').toUpperCase() === 'WALK-IN');
        return w ? String(w.id || '') : '';
    }, [customers]);
    const [customerId, setCustomerId] = React.useState(walkInCustomerId || customers[0]?.id);
    const [cart, setCart] = React.useState([]);

    React.useEffect(() => {
        if (!walkInCustomerId) return;
        if (String(customerId || '')) return;
        setCustomerId(walkInCustomerId);
    }, [walkInCustomerId, customerId]);

    const scannedProduct = React.useMemo(() => {
        if (!scannedProductId) return null;
        return products.find((p) => String(p.id || '') === String(scannedProductId)) || null;
    }, [products, scannedProductId]);

    const scannedCategoryName = React.useMemo(() => {
        if (!scannedProduct) return '';
        return String(categoryById.get(String(scannedProduct.categoryId || ''))?.name || '');
    }, [scannedProduct, categoryById]);

    const scannedAvailable = React.useMemo(() => {
        if (!scannedProduct) return 0;
        return Number(stockBucket[scannedProduct.id] ?? scannedProduct.stock ?? 0);
    }, [scannedProduct, stockBucket]);

    const productMatch = products.find((p) => String(p.id || '') === String(productQuery || ''))
        || products.find((p) => String(p.code || '').toLowerCase() === String(productQuery).toLowerCase())
        || products.find((p) => String(p.sku || '').toLowerCase() === String(productQuery).toLowerCase())
        || products.find((p) => String(p.barcode || '').toLowerCase() === String(productQuery).toLowerCase())
        || products.find((p) => String(p.name || '').toLowerCase() === String(productQuery).toLowerCase());

    const cartTotal = cart.reduce((sum, it) => sum + Number(it.total || 0), 0);

    React.useEffect(() => {
        const params = new URLSearchParams(loc.search || '');
        const shouldScan = params.get('scan') === '1';
        if (!shouldScan) return;
        setTab('SELL_NOW');
        setError('');
        setScanError('');
        setScanOpen(true);
        params.delete('scan');
        nav({ pathname: loc.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    }, [loc.pathname, loc.search, nav]);

    function resolveBarcodeToProductId(code) {
        const v = String(code || '').trim().toLowerCase();
        if (!v) return '';
        const p = products.find((x) => String(x.barcode || '').trim().toLowerCase() === v);
        return p ? String(p.id || '') : '';
    }

    React.useEffect(() => {
        if (!scanOpen) return;

        async function start() {
            setScanError('');
            setScanSimValue('');

            const video = videoRef.current;
            if (!video) return;

            const hasBarcodeDetector = typeof window !== 'undefined' && typeof window.BarcodeDetector !== 'undefined';
            if (!hasBarcodeDetector) {
                setScanError(t('sales.scan.error.notSupported'));
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                streamRef.current = stream;
                video.srcObject = stream;
                await video.play();

                const detector = new window.BarcodeDetector();
                scanTimerRef.current = window.setInterval(async () => {
                    try {
                        const barcodes = await detector.detect(video);
                        if (!Array.isArray(barcodes) || barcodes.length === 0) return;
                        const val = String(barcodes[0]?.rawValue || '').trim();
                        if (!val) return;

                        const pid = resolveBarcodeToProductId(val);
                        setScannedBarcode(val);
                        if (!pid) {
                            setScanError(t('sales.scan.error.notFound', { code: val }));
                            return;
                        }
                        setScannedProductId(pid);
                        setQuickQty(1);
                        setScanOpen(false);
                    } catch {
                        // ignore frame errors
                    }
                }, 450);
            } catch {
                setScanError(t('sales.scan.error.cameraUnavailable'));
            }
        }

        start();

        return () => {
            if (scanTimerRef.current) {
                window.clearInterval(scanTimerRef.current);
                scanTimerRef.current = null;
            }
            const stream = streamRef.current;
            if (stream) {
                stream.getTracks().forEach((tt) => tt.stop());
                streamRef.current = null;
            }
        };
    }, [scanOpen, t, products]);

    function addToCart() {
        const q = Number(qty || 1);
        setError('');
        if (!productMatch) {
            setError(t('sales.error.selectValidProduct'));
            return;
        }

        if (!Number.isFinite(q) || q <= 0) {
            setError(t('sales.error.qtyGreaterThan0'));
            return;
        }

        const already = cart.find((x) => x.productId === productMatch.id);
        const alreadyQty = Number(already?.qty || 0);
        const available = Number(stockBucket[productMatch.id] ?? productMatch.stock ?? 0);
        if (alreadyQty + q > available) {
            setError(t('sales.error.notEnoughStock', { name: productMatch.name, available }));
            return;
        }

        const price = Number(productMatch.sellingPrice ?? productMatch.price ?? 0);
        const line = {
            productId: productMatch.id,
            name: productMatch.name,
            qty: q,
            price,
            total: q * price,
        };

        setCart((items) => {
            const existingIdx = items.findIndex((x) => x.productId === line.productId);
            if (existingIdx === -1) return [...items, line];
            const next = items.slice();
            const prev = next[existingIdx];
            const nextQty = Number(prev.qty || 0) + q;
            next[existingIdx] = { ...prev, qty: nextQty, total: nextQty * price };
            return next;
        });

        setProductQuery('');
        setQty(1);
    }

    function removeLine(productId) {
        setCart((items) => items.filter((x) => x.productId !== productId));
    }

    async function recordQuickSale() {
        setError('');
        if (!scannedProduct) {
            setError(t('sales.scan.error.noProductSelected'));
            return;
        }
        const q = Number(quickQty || 0);
        if (!Number.isFinite(q) || q <= 0) {
            setError(t('sales.error.qtyGreaterThan0'));
            return;
        }
        const available = scannedAvailable;
        if (q > available) {
            setError(t('sales.error.notEnoughStock', { name: scannedProduct.name, available }));
            return;
        }

        try {
            setSaving(true);
            await http.post('/sales', {
                branchId: String(activeBranchId || ''),
                paymentMethod: 'CASH',
                paid: Number(q) * Number(scannedProduct.sellingPrice ?? scannedProduct.price ?? 0),
                items: [{ productId: scannedProduct.id, quantity: q }],
            });

            const b = await http.get('/bootstrap');
            api.hydrate(b?.data);

            setScannedBarcode('');
            setScannedProductId('');
            setQuickQty(1);
            setTab('HISTORY');
        } catch (e) {
            setError(e?.response?.data?.error || 'SaleFailed');
        } finally {
            setSaving(false);
        }
    }

    async function completeSale() {
        setError('');

        const branchId = String(activeBranchId || '');
        if (!branchId) {
            setError('MissingBranch');
            return;
        }

        const payload = {
            branchId,
            paymentMethod: 'CASH',
            paid: Number(cartTotal || 0),
            items: cart.map((it) => ({
                productId: it.productId,
                quantity: Number(it.qty || 0),
            })),
        };

        try {
            setSaving(true);
            await http.post('/sales', payload);

            const b = await http.get('/bootstrap');
            api.hydrate(b?.data);

            setCart([]);
            setProductQuery('');
            setQty(1);
            setTab('HISTORY');
        } catch (e) {
            setError(e?.response?.data?.error || 'SaleFailed');
        } finally {
            setSaving(false);
        }
    }

    const historyRows = sales
        .filter((s) => (activeBranchId && s.branchId ? s.branchId === activeBranchId : true))
        .slice()
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">{t('sales.title')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{t('sales.subtitle')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                setScanError('');
                                setScanOpen(true);
                            }}
                        >
                            {t('sales.scan.button')}
                        </button>
                        <button className="button" type="button" onClick={() => setTab('SELL_NOW')}>
                            {t('sales.tab.sellNow')}
                        </button>
                        <button className="button" type="button" onClick={() => setTab('HISTORY')}>
                            {t('sales.tab.history')}
                        </button>
                    </div>
                </div>

                <div className="divider" />

                {tab === 'SELL_NOW' ? (
                    <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
                        {error ? (
                            <div style={{ color: 'var(--danger)', fontWeight: 800 }}>{error}</div>
                        ) : null}

                        {scannedProduct ? (
                            <div className="card" style={{ padding: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <img
                                        src={scannedProduct.imageDataUrl || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2216%22%20fill%3D%22%230b4f79%22%20fill-opacity%3D%220.08%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2238%22%20text-anchor%3D%22middle%22%20font-family%3D%22ui-sans-serif%2C%20system-ui%22%20font-size%3D%2222%22%20font-weight%3D%22800%22%20fill%3D%22%230b4f79%22%3E%3C/text%3E%3C/svg%3E'}
                                        alt=""
                                        style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border)' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 900 }}>{scannedProduct.name}</div>
                                        <div className="muted" style={{ fontSize: 12 }}>
                                            {scannedCategoryName || '—'} · {money(currency, scannedProduct.sellingPrice ?? scannedProduct.price ?? 0)} · {t('sales.scan.available', { n: scannedAvailable })}
                                        </div>
                                        {scannedProduct.description ? (
                                            <div className="muted" style={{ fontSize: 12, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {scannedProduct.description}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end', marginTop: 12 }}>
                                    <label className="field" style={{ margin: 0 }}>
                                        <span className="fieldLabel">{t('sales.scan.qty')}</span>
                                        <input className="input" type="number" min="1" value={quickQty} onChange={(e) => setQuickQty(e.target.value)} />
                                    </label>
                                    <button className="button" type="button" onClick={recordQuickSale} disabled={saving} style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                                        {t('sales.scan.recordSale')}
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="chip">{t('sales.customer')}</span>
                            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ minWidth: 240 }}>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 120px 140px' }}>
                            <div style={{ display: 'grid', gap: 6 }}>
                                <input
                                    className="input"
                                    placeholder={t('sales.productPlaceholder')}
                                    value={productQuery}
                                    onChange={(e) => setProductQuery(e.target.value)}
                                    list="product-list"
                                />
                                <datalist id="product-list">
                                    {products.map((p) => (
                                        <option key={p.id} value={p.code || p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </datalist>
                                {productMatch ? (
                                    <div className="muted" style={{ fontSize: 12 }}>
                                        {t('sales.selectedLine', {
                                            name: productMatch.name,
                                            stock: Number(stockBucket[productMatch.id] ?? productMatch.stock ?? 0),
                                            price: money(currency, productMatch.sellingPrice ?? productMatch.price ?? 0),
                                        })}
                                    </div>
                                ) : null}
                            </div>
                            <input
                                className="input"
                                placeholder={t('sales.qtyPlaceholder')}
                                type="number"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                            />
                            <button className="button" type="button" onClick={addToCart}>
                                {t('sales.add')}
                            </button>
                        </div>

                        {cart.length === 0 ? (
                            <div className="empty">{t('sales.emptyCart')}</div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('sales.table.item')}</th>
                                        <th>{t('sales.table.qty')}</th>
                                        <th>{t('sales.table.price')}</th>
                                        <th>{t('sales.table.total')}</th>
                                        <th style={{ width: 120 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((it) => (
                                        <tr key={it.productId}>
                                            <td style={{ fontWeight: 800 }}>{it.name}</td>
                                            <td>{it.qty}</td>
                                            <td>{money(currency, it.price)}</td>
                                            <td>{money(currency, it.total)}</td>
                                            <td>
                                                <div className="tableActions">
                                                    <button className="button" type="button" onClick={() => removeLine(it.productId)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                                        {t('sales.remove')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="chip">{t('sales.totalLabel', { total: money(currency, cartTotal) })}</div>
                            <button className="button" type="button" onClick={completeSale} disabled={saving || cart.length === 0} style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                                {t('sales.completeSale')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('sales.history.saleNo')}</th>
                                    <th>{t('sales.history.time')}</th>
                                    <th>{t('sales.history.customer')}</th>
                                    <th>{t('sales.history.total')}</th>
                                    <th>{t('sales.history.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyRows.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 900 }}>{s.code || s.id}</td>
                                        <td>{s.time || '-'}</td>
                                        <td>{s.customerName || '-'}</td>
                                        <td>{money(currency, s.total)}</td>
                                        <td>{t(`status.${String(s.status || '').toLowerCase()}`) || s.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {historyRows.length === 0 ? <div className="empty">{t('sales.history.empty')}</div> : null}
                    </div>
                )}
            </div>

            <Modal
                open={scanOpen}
                title={t('sales.scan.title')}
                onClose={() => setScanOpen(false)}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setScanOpen(false)}>
                            {t('common.close')}
                        </button>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                const v = String(scanSimValue || '').trim();
                                if (!v) {
                                    setScanError(t('sales.scan.error.enterValue'));
                                    return;
                                }
                                const pid = resolveBarcodeToProductId(v);
                                setScannedBarcode(v);
                                if (!pid) {
                                    setScanError(t('sales.scan.error.notFound', { code: v }));
                                    return;
                                }
                                setScannedProductId(pid);
                                setQuickQty(1);
                                setScanOpen(false);
                            }}
                            style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                        >
                            {t('sales.scan.useValue')}
                        </button>
                    </div>
                }
            >
                {scanError ? <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{scanError}</div> : null}
                <div style={{ display: 'grid', gap: 12 }}>
                    <div className="muted" style={{ fontSize: 12 }}>{t('sales.scan.subtitle')}</div>
                    <video
                        ref={videoRef}
                        style={{ width: '100%', maxHeight: 260, borderRadius: 14, background: 'rgba(15,23,42,0.06)', border: '1px solid var(--border)' }}
                        playsInline
                        muted
                    />
                    <div className="divider" style={{ margin: 0 }} />
                    <label className="field">
                        <span className="fieldLabel">{t('sales.scan.simulated')}</span>
                        <input className="input" value={scanSimValue} onChange={(e) => setScanSimValue(e.target.value)} placeholder={t('sales.scan.simulatedPlaceholder')} />
                    </label>
                </div>
            </Modal>
        </div>
    );
}
