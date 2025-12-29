import React from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { ONLINE_ONLY } from '../data/store.js';

export default function BranchesPage() {
    const { state, api } = useStore();

    const branches = state.branches || [];

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);

    const editing = editingId ? branches.find((b) => b.id === editingId) : null;
    const [form, setForm] = React.useState({ name: '', manager: '', status: 'Active' });

    React.useEffect(() => {
        if (!editorOpen) return;
        if (editing) {
            setForm({
                name: editing.name || '',
                manager: editing.manager || '',
                status: editing.status || 'Active',
            });
        } else {
            setForm({ name: '', manager: '', status: 'Active' });
        }
    }, [editorOpen, editingId]);

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
        if (ONLINE_ONLY) return;
        const patch = {
            name: String(form.name || '').trim(),
            manager: String(form.manager || '').trim(),
            status: form.status || 'Active',
        };
        if (!patch.name) return;

        if (editingId) {
            api.update('branches', editingId, patch);
        } else {
            api.create('branches', patch);
        }

        setEditorOpen(false);
        setEditingId(null);
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Branches</div>
                        <div className="muted" style={{ fontSize: 12 }}>Manage branches / warehouses</div>
                    </div>
                    <button className="button" type="button" onClick={openCreate} disabled={ONLINE_ONLY}>+ New Branch</button>
                </div>

                <div className="divider" />

                {ONLINE_ONLY ? (
                    <div className="empty">Online-only mode: branch management will be enabled once the backend CRUD endpoints are added.</div>
                ) : null}

                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Manager</th>
                            <th>Status</th>
                            <th style={{ width: 160 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {branches.map((b) => (
                            <tr key={b.id}>
                                <td style={{ fontWeight: 900 }}>{b.name}</td>
                                <td>{b.manager}</td>
                                <td>{b.status || 'Active'}</td>
                                <td>
                                    <div className="tableActions">
                                        <button className="button" type="button" onClick={() => openEdit(b.id)} disabled={ONLINE_ONLY}>
                                            Edit
                                        </button>
                                        <button className="button" type="button" onClick={() => openDelete(b.id)} disabled={ONLINE_ONLY} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {branches.length === 0 ? <div className="empty">No branches yet.</div> : null}
            </div>

            <Modal
                open={editorOpen}
                title={editingId ? 'Edit Branch' : 'New Branch'}
                onClose={() => setEditorOpen(false)}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => setEditorOpen(false)}>
                            Cancel
                        </button>
                        <button className="button" type="button" onClick={save} style={{ background: 'var(--primary)', color: 'var(--primaryText)' }}>
                            Save
                        </button>
                    </div>
                }
            >
                <div className="formGrid two">
                    <label className="field">
                        <span className="fieldLabel">Branch name</span>
                        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Manager</span>
                        <input className="input" value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Status</span>
                        <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </label>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title="Delete branch"
                message="This will remove the branch record."
                confirmText="Delete"
                danger
                onCancel={() => {
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
                onConfirm={() => {
                    if (ONLINE_ONLY) {
                        setConfirmOpen(false);
                        setConfirmId(null);
                        return;
                    }
                    if (confirmId) api.remove('branches', confirmId);
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
            />
        </div>
    );
}
