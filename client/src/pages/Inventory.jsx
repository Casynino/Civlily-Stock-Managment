import React from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function placeholderDataUrl(label) {
    const safe = String(label || '').trim().slice(0, 1).toUpperCase() || 'P';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b4f79" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#0b4f79" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="64" height="64" rx="16" fill="url(#g)"/>
  <text x="32" y="38" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="22" font-weight="800" fill="#0b4f79">${safe}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function InventoryPage() {
    const { state, api } = useStore();
    const { t } = useI18n();
    const [query, setQuery] = React.useState('');

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);
    const [error, setError] = React.useState('');

    const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);
    const [categoryName, setCategoryName] = React.useState('');
    const [categoryError, setCategoryError] = React.useState('');

    const [manageCategoriesOpen, setManageCategoriesOpen] = React.useState(false);
    const [editingCategoryId, setEditingCategoryId] = React.useState(null);
    const [categoryEditName, setCategoryEditName] = React.useState('');
    const [categoryManageError, setCategoryManageError] = React.useState('');
    const [categoryDeleteId, setCategoryDeleteId] = React.useState(null);
    const [categoryDeleteOpen, setCategoryDeleteOpen] = React.useState(false);

    const [scanOpen, setScanOpen] = React.useState(false);
    const [scanTarget, setScanTarget] = React.useState('FORM');
    const [scanError, setScanError] = React.useState('');
    const [scanSimValue, setScanSimValue] = React.useState('');
    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const scanTimerRef = React.useRef(null);

    const products = state.products || [];
    const categories = state.categories || [];
    const categoryById = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

    const activeBranchId = state.settings?.activeBranchId;
    const stockBucket = React.useMemo(() => {
        const bid = String(activeBranchId || '');
        const ledger = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : {};
        const bucket = bid ? ledger[bid] : null;
        return bucket && typeof bucket === 'object' ? bucket : {};
    }, [state.productStocks, activeBranchId]);

    const editing = editingId ? products.find((p) => p.id === editingId) : null;
    const [form, setForm] = React.useState({
        name: '',
        sku: '',
        categoryId: '',
        barcode: '',
        description: '',
        imageDataUrl: '',
        sellingPrice: 0,
        stock: 0,
        status: 'Active',
    });

    React.useEffect(() => {
        if (!editorOpen) return;
        setError('');
        if (editing) {
            const effectiveStock = Number(stockBucket[editing.id] ?? editing.stock ?? 0);
            setForm({
                name: editing.name || '',
                sku: editing.sku || '',
                categoryId: String(editing.categoryId || ''),
                barcode: editing.barcode || '',
                description: editing.description || '',
                imageDataUrl: editing.imageDataUrl || '',
                sellingPrice: Number(editing.sellingPrice ?? editing.price ?? 0),
                stock: effectiveStock,
                status: editing.status || 'Active',
            });
        } else {
            setForm({
                name: '',
                sku: '',
                categoryId: String(categories[0]?.id || ''),
                barcode: '',
                description: '',
                imageDataUrl: '',
                sellingPrice: 0,
                stock: 0,
                status: 'Active',
            });
        }
    }, [editorOpen, editingId, categories, stockBucket]);

    React.useEffect(() => {
        if (!scanOpen) return;

        async function start() {
            setScanError('');
            setScanSimValue('');

            const video = videoRef.current;
            if (!video) return;

            const hasBarcodeDetector = typeof window !== 'undefined' && typeof window.BarcodeDetector !== 'undefined';
            if (!hasBarcodeDetector) {
                setScanError(t('inventory.scan.error.notSupported'));
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
                        if (scanTarget === 'FORM') {
                            setForm((f) => ({ ...f, barcode: val }));
                        } else {
                            setQuery(val);
                        }
                        setScanOpen(false);
                    } catch {
                        // ignore frame errors
                    }
                }, 450);
            } catch {
                setScanError(t('inventory.scan.error.cameraUnavailable'));
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
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [scanOpen]);

    const rows = products.filter((p) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const categoryName = String(categoryById.get(String(p.categoryId || ''))?.name || '').toLowerCase();
        return (
            String(p.name).toLowerCase().includes(q)
            || String(p.sku).toLowerCase().includes(q)
            || String(p.barcode || '').toLowerCase().includes(q)
            || String(p.id).toLowerCase().includes(q)
            || categoryName.includes(q)
        );
    });

    function openCreate() {
        setEditingId(null);
        setEditorOpen(true);
    }

    function openEdit(id) {
        setEditingId(id);
        setEditorOpen(true);
    }

    function openDelete(id) {
        setConfirmId(id);
        setConfirmOpen(true);
    }

    function save() {
        const name = String(form.name || '').trim();
        const sku = String(form.sku || '').trim();
        const categoryId = String(form.categoryId || '').trim();
        const barcode = String(form.barcode || '').trim();
        const description = String(form.description || '').trim();
        const imageDataUrl = String(form.imageDataUrl || '');
        const sellingPrice = Number(form.sellingPrice || 0);
        const stock = Number(form.stock || 0);
        const status = form.status || 'Active';

        if (!name) {
            setError(t('inventory.error.nameRequired'));
            return;
        }
        if (!categoryId) {
            setError(t('inventory.error.categoryRequired'));
            return;
        }
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
            setError(t('inventory.error.sellingPriceInvalid'));
            return;
        }
        if (!Number.isFinite(stock) || stock < 0) {
            setError(t('inventory.error.stockInvalid'));
            return;
        }

        const patch = {
            name,
            sku,
            categoryId,
            sellingPrice,
            stock,
            description,
            imageDataUrl,
            barcode,
            status,
        };

        if (editingId) {
            api.update('products', editingId, patch);
        } else {
            api.create('products', { ...patch });
        }
        setEditorOpen(false);
        setEditingId(null);
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">{t('inventory.title')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{t('inventory.subtitle')}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                setCategoryManageError('');
                                setManageCategoriesOpen(true);
                            }}
                        >
                            {t('inventory.manageCategories')}
                        </button>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                setScanTarget('SEARCH');
                                setScanError('');
                                setScanOpen(true);
                            }}
                        >
                            {t('inventory.scan.button')}
                        </button>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('inventory.searchPlaceholder')}
                            className="input"
                            style={{ minWidth: 240 }}
                        />
                        <button className="button" type="button" onClick={openCreate}>{t('inventory.newProduct')}</button>
                    </div>
                </div>

                <div className="divider" />

                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 1180 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 64 }} />
                                <th style={{ width: 180 }}>{t('inventory.table.id')}</th>
                                <th>{t('inventory.table.name')}</th>
                                <th style={{ width: 120 }}>{t('inventory.table.sku')}</th>
                                <th style={{ width: 160 }}>{t('inventory.table.category')}</th>
                                <th style={{ width: 160 }}>{t('inventory.table.barcode')}</th>
                                <th style={{ width: 90 }}>{t('inventory.table.stock')}</th>
                                <th style={{ width: 90 }}>{t('inventory.table.sellingPrice')}</th>
                                <th style={{ width: 260 }}>{t('inventory.table.notes')}</th>
                                <th style={{ width: 90 }}>{t('common.status')}</th>
                                <th style={{ width: 160 }} />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <img
                                            src={p.imageDataUrl || placeholderDataUrl(p.name)}
                                            alt=""
                                            style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }}
                                        />
                                    </td>
                                    <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>{p.id}</td>
                                    <td style={{ fontWeight: 800 }}>{p.name}</td>
                                    <td>{p.sku}</td>
                                    <td>{categoryById.get(String(p.categoryId || ''))?.name || '—'}</td>
                                    <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>{p.barcode || '—'}</td>
                                    <td>{Number(stockBucket[p.id] ?? p.stock ?? 0)}</td>
                                    <td>{Number(p.sellingPrice ?? p.price ?? 0)}</td>
                                    <td className="muted" style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.description || '—'}
                                    </td>
                                    <td>{t(`status.${String(p.status || '').toLowerCase()}`) || p.status}</td>
                                    <td>
                                        <div className="tableActions">
                                            <button className="button" type="button" onClick={() => openEdit(p.id)}>
                                                {t('common.edit')}
                                            </button>
                                            <button className="button" type="button" onClick={() => openDelete(p.id)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {rows.length === 0 ? <div className="empty">{t('inventory.empty')}</div> : null}
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">{t('inventory.lowStock.title')}</div>
                    <a className="link" href="#">{t('inventory.lowStock.configure')} →</a>
                </div>
                <div className="empty">{t('inventory.lowStock.empty')}</div>
            </div>

            <Modal
                open={editorOpen}
                title={editingId ? t('inventory.modal.editTitle') : t('inventory.modal.newTitle')}
                onClose={() => setEditorOpen(false)}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setEditorOpen(false)}>
                            {t('common.cancel')}
                        </button>
                        <button
                            className="button"
                            type="button"
                            onClick={save}
                            style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                        >
                            {t('common.save')}
                        </button>
                    </div>
                }
            >
                {error ? (
                    <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{error}</div>
                ) : null}
                <div className="formGrid two">
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.image')}</span>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <img
                                src={form.imageDataUrl || placeholderDataUrl(form.name)}
                                alt=""
                                style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border)' }}
                            />
                            <input
                                className="input"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    fileToDataUrl(file).then((res) => setForm((f) => ({ ...f, imageDataUrl: res })));
                                }}
                            />
                        </div>
                        {form.imageDataUrl ? (
                            <button
                                className="button"
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, imageDataUrl: '' }))}
                                style={{ justifySelf: 'start', marginTop: 8, background: 'rgba(214,69,93,0.10)' }}
                            >
                                {t('inventory.form.removeImage')}
                            </button>
                        ) : null}
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.name')}</span>
                        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.sku')}</span>
                        <input className="input" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.barcode')}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                            <input className="input" value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} placeholder={t('inventory.form.barcodePlaceholder')} />
                            <button
                                className="button"
                                type="button"
                                onClick={() => {
                                    setScanTarget('FORM');
                                    setScanError('');
                                    setScanOpen(true);
                                }}
                            >
                                {t('inventory.scan.button')}
                            </button>
                        </div>
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.category')}</span>
                        <select
                            className="input"
                            value={form.categoryId}
                            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </label>
                    <div className="field" style={{ alignContent: 'end' }}>
                        <span className="fieldLabel" style={{ visibility: 'hidden' }}>Add</span>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                setCategoryError('');
                                setCategoryName('');
                                setCategoryModalOpen(true);
                            }}
                        >
                            {t('inventory.form.addCategory')}
                        </button>
                    </div>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.sellingPrice')}</span>
                        <input className="input" type="number" value={form.sellingPrice} onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.form.stock')}</span>
                        <input className="input" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('common.status')}</span>
                        <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                            <option value="Active">{t('status.active')}</option>
                            <option value="Inactive">{t('status.inactive')}</option>
                        </select>
                    </label>
                    <label className="field" style={{ gridColumn: '1 / -1' }}>
                        <span className="fieldLabel">{t('inventory.form.description')}</span>
                        <textarea
                            className="input"
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder={t('inventory.form.descriptionPlaceholder')}
                        />
                    </label>
                </div>
            </Modal>

            <Modal
                open={scanOpen}
                title={t('inventory.scan.title')}
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
                                    setScanError(t('inventory.scan.error.enterValue'));
                                    return;
                                }
                                if (scanTarget === 'FORM') {
                                    setForm((f) => ({ ...f, barcode: v }));
                                } else {
                                    setQuery(v);
                                }
                                setScanOpen(false);
                            }}
                            style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                        >
                            {t('inventory.scan.useValue')}
                        </button>
                    </div>
                }
            >
                {scanError ? (
                    <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{scanError}</div>
                ) : null}
                <div style={{ display: 'grid', gap: 12 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                        {t('inventory.scan.subtitle')}
                    </div>
                    <video
                        ref={videoRef}
                        style={{ width: '100%', maxHeight: 260, borderRadius: 14, background: 'rgba(15,23,42,0.06)', border: '1px solid var(--border)' }}
                        playsInline
                        muted
                    />
                    <div className="divider" style={{ margin: 0 }} />
                    <label className="field">
                        <span className="fieldLabel">{t('inventory.scan.simulated')}</span>
                        <input className="input" value={scanSimValue} onChange={(e) => setScanSimValue(e.target.value)} placeholder={t('inventory.scan.simulatedPlaceholder')} />
                    </label>
                </div>
            </Modal>

            <Modal
                open={manageCategoriesOpen}
                title={t('inventory.categories.manageTitle')}
                onClose={() => {
                    setManageCategoriesOpen(false);
                    setEditingCategoryId(null);
                    setCategoryEditName('');
                    setCategoryManageError('');
                }}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setManageCategoriesOpen(false)}>
                            {t('common.close')}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'grid', gap: 10 }}>
                    {categoryManageError ? (
                        <div style={{ marginBottom: 2, color: 'var(--danger)', fontWeight: 800 }}>{categoryManageError}</div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                setCategoryError('');
                                setCategoryName('');
                                setCategoryModalOpen(true);
                            }}
                        >
                            {t('inventory.categories.new')}
                        </button>
                        <div className="muted" style={{ fontSize: 12 }}>{t('inventory.categories.deleteBlocked')}</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ minWidth: 520 }}>
                            <thead>
                                <tr>
                                    <th>{t('inventory.categories.table.name')}</th>
                                    <th style={{ width: 120 }}>{t('inventory.categories.table.products')}</th>
                                    <th style={{ width: 160 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((c) => {
                                    const count = products.filter((p) => String(p.categoryId || '') === String(c.id)).length;
                                    const isEditing = editingCategoryId === c.id;
                                    return (
                                        <tr key={c.id}>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="input"
                                                        value={categoryEditName}
                                                        onChange={(e) => setCategoryEditName(e.target.value)}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 800 }}>{c.name}</span>
                                                )}
                                            </td>
                                            <td>{count}</td>
                                            <td>
                                                <div className="tableActions">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                className="button"
                                                                type="button"
                                                                onClick={() => {
                                                                    const name = String(categoryEditName || '').trim();
                                                                    if (!name) return;
                                                                    const dup = categories.some((x) => x.id !== c.id && String(x.name || '').toLowerCase() === name.toLowerCase());
                                                                    if (dup) return;
                                                                    api.update('categories', c.id, { name });
                                                                    setEditingCategoryId(null);
                                                                    setCategoryEditName('');
                                                                }}
                                                                style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                                                            >
                                                                {t('common.save')}
                                                            </button>
                                                            <button
                                                                className="button"
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingCategoryId(null);
                                                                    setCategoryEditName('');
                                                                }}
                                                            >
                                                                {t('common.cancel')}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="button"
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingCategoryId(c.id);
                                                                    setCategoryEditName(c.name);
                                                                }}
                                                            >
                                                                {t('common.edit')}
                                                            </button>
                                                            <button
                                                                className="button"
                                                                type="button"
                                                                onClick={() => {
                                                                    setCategoryDeleteId(c.id);
                                                                    setCategoryDeleteOpen(true);
                                                                }}
                                                                style={{ background: 'rgba(214,69,93,0.10)' }}
                                                            >
                                                                {t('common.delete')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {categories.length === 0 ? <div className="empty">{t('inventory.categories.empty')}</div> : null}
                </div>
            </Modal>

            <ConfirmDialog
                open={categoryDeleteOpen}
                title={t('inventory.categories.confirm.deleteTitle')}
                message={t('inventory.categories.confirm.deleteMessage')}
                confirmText={t('common.delete')}
                danger
                onCancel={() => {
                    setCategoryDeleteOpen(false);
                    setCategoryDeleteId(null);
                }}
                onConfirm={() => {
                    const id = categoryDeleteId;
                    if (!id) return;
                    const used = products.some((p) => String(p.categoryId || '') === String(id));
                    if (used) {
                        setCategoryDeleteOpen(false);
                        setCategoryDeleteId(null);
                        setCategoryManageError(t('inventory.categories.error.cannotDeleteUsed'));
                        return;
                    }
                    api.remove('categories', id);
                    setCategoryDeleteOpen(false);
                    setCategoryDeleteId(null);
                    setCategoryManageError('');
                }}
            />

            <Modal
                open={categoryModalOpen}
                title={t('inventory.categories.addTitle')}
                onClose={() => setCategoryModalOpen(false)}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setCategoryModalOpen(false)}>
                            {t('common.cancel')}
                        </button>
                        <button
                            className="button"
                            type="button"
                            onClick={() => {
                                const name = String(categoryName || '').trim();
                                if (!name) {
                                    setCategoryError(t('inventory.categories.error.nameRequired'));
                                    return;
                                }
                                const exists = categories.some((c) => String(c.name || '').toLowerCase() === name.toLowerCase());
                                if (exists) {
                                    setCategoryError(t('inventory.categories.error.duplicate'));
                                    return;
                                }
                                const newId = api.create('categories', { name });
                                setForm((f) => ({ ...f, categoryId: newId }));
                                setCategoryModalOpen(false);
                            }}
                            style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}
                        >
                            {t('common.save')}
                        </button>
                    </div>
                }
            >
                {categoryError ? (
                    <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{categoryError}</div>
                ) : null}
                <label className="field">
                    <span className="fieldLabel">{t('inventory.categories.nameLabel')}</span>
                    <input className="input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={t('inventory.categories.namePlaceholder')} />
                </label>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title={t('inventory.confirm.deleteTitle')}
                message={t('inventory.confirm.deleteMessage')}
                confirmText={t('common.delete')}
                danger
                onCancel={() => {
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
                onConfirm={() => {
                    if (confirmId) api.remove('products', confirmId);
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
            />
        </div>
    );
}
