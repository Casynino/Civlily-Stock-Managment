import React from 'react';

import { api as http } from '../api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function CustomersPage() {
    const { state, api } = useStore();
    const { t } = useI18n();
    const [query, setQuery] = React.useState('');
    const [error, setError] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);

    const customers = state.customers || [];
    const editing = editingId ? customers.find((c) => c.id === editingId) : null;
    const [form, setForm] = React.useState({ name: '', phone: '', balance: 0, status: 'Active' });

    React.useEffect(() => {
        if (!editorOpen) return;
        if (editing) {
            setForm({
                name: editing.name || '',
                phone: editing.phone || '',
                balance: Number(editing.balance || 0),
                status: editing.status || 'Active',
            });
        } else {
            setForm({ name: '', phone: '', balance: 0, status: 'Active' });
        }
    }, [editorOpen, editingId]);

    const rows = customers.filter((c) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
            String(c.name).toLowerCase().includes(q)
            || String(c.phone).toLowerCase().includes(q)
            || String(c.code || '').toLowerCase().includes(q)
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

    async function refresh() {
        const b = await http.get('/bootstrap');
        api.hydrate(b?.data);
    }

    async function save() {
        setError('');
        setSaving(true);
        const patch = {
            name: String(form.name || '').trim(),
            phone: String(form.phone || '').trim(),
            balance: Number(form.balance || 0),
            status: form.status || 'Active',
        };
        if (!patch.name) {
            setSaving(false);
            return;
        }

        try {
            if (editingId) {
                await http.put(`/customers/${editingId}`, patch);
            } else {
                await http.post('/customers', patch);
            }
            await refresh();
            setEditorOpen(false);
            setEditingId(null);
        } catch (e) {
            setError(e?.response?.data?.error || 'Failed to save customer.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">{t('customers.title')}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{t('customers.subtitle')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('customers.searchPlaceholder')}
                            className="input"
                            style={{ minWidth: 240 }}
                        />
                        <button className="button" type="button" onClick={openCreate}>{t('customers.new')}</button>
                    </div>
                </div>

                <div className="divider" />

                {error ? <div style={{ marginBottom: 12, color: 'var(--danger)', fontWeight: 800 }}>{error}</div> : null}

                <table className="table">
                    <thead>
                        <tr>
                            <th>{t('customers.table.id')}</th>
                            <th>{t('customers.table.name')}</th>
                            <th>{t('customers.table.phone')}</th>
                            <th>{t('customers.table.balance')}</th>
                            <th style={{ width: 160 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((c) => (
                            <tr key={c.id}>
                                <td>{c.code || '—'}</td>
                                <td style={{ fontWeight: 800 }}>{c.name}</td>
                                <td>{c.phone}</td>
                                <td>{c.balance}</td>
                                <td>
                                    <div className="tableActions">
                                        <button className="button" type="button" onClick={() => openEdit(c.id)}>
                                            {t('common.edit')}
                                        </button>
                                        {String(c.code || '') === 'CU000' ? null : (
                                            <button className="button" type="button" onClick={() => openDelete(c.id)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                                {t('common.delete')}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {rows.length === 0 ? <div className="empty">{t('customers.empty')}</div> : null}
            </div>

            <Modal
                open={editorOpen}
                title={editingId ? t('customers.modal.editTitle') : t('customers.modal.newTitle')}
                onClose={() => setEditorOpen(false)}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setEditorOpen(false)}>
                            {t('common.cancel')}
                        </button>
                        <button className="button" type="button" onClick={save} style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                            {saving ? '…' : t('common.save')}
                        </button>
                    </div>
                }
            >
                <div className="formGrid two">
                    <label className="field">
                        <span className="fieldLabel">{t('customers.form.name')}</span>
                        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('customers.form.phone')}</span>
                        <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('customers.form.balance')}</span>
                        <input className="input" type="number" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">{t('common.status')}</span>
                        <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                            <option value="Active">{t('status.active')}</option>
                            <option value="Inactive">{t('status.inactive')}</option>
                        </select>
                    </label>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title={t('customers.confirm.deleteTitle')}
                message={t('customers.confirm.deleteMessage')}
                confirmText={t('common.delete')}
                danger
                onCancel={() => {
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
                onConfirm={() => {
                    (async () => {
                        if (!confirmId) return;
                        setError('');
                        try {
                            await http.delete(`/customers/${confirmId}`);
                            await refresh();
                        } catch (e) {
                            setError(e?.response?.data?.error || 'Failed to delete customer.');
                        } finally {
                            setConfirmOpen(false);
                            setConfirmId(null);
                        }
                    })();
                }}
            />
        </div>
    );
}
