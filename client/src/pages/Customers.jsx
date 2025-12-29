import React from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function CustomersPage() {
    const { state, api } = useStore();
    const { t } = useI18n();
    const [query, setQuery] = React.useState('');

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
        return String(c.name).toLowerCase().includes(q) || String(c.phone).toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q);
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
        const patch = {
            name: String(form.name || '').trim(),
            phone: String(form.phone || '').trim(),
            balance: Number(form.balance || 0),
            status: form.status || 'Active',
        };
        if (!patch.name) return;

        if (editingId) {
            api.update('customers', editingId, patch);
        } else {
            api.create('customers', patch);
        }
        setEditorOpen(false);
        setEditingId(null);
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
                                <td>{c.id}</td>
                                <td style={{ fontWeight: 800 }}>{c.name}</td>
                                <td>{c.phone}</td>
                                <td>{c.balance}</td>
                                <td>
                                    <div className="tableActions">
                                        <button className="button" type="button" onClick={() => openEdit(c.id)}>
                                            {t('common.edit')}
                                        </button>
                                        <button className="button" type="button" onClick={() => openDelete(c.id)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                            {t('common.delete')}
                                        </button>
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
                            {t('common.save')}
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
                    if (confirmId) api.remove('customers', confirmId);
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
            />
        </div>
    );
}
