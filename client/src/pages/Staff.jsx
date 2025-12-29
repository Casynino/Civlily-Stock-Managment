import React from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';

export default function StaffPage() {
    const { state, api } = useStore();

    const staff = state.staff || [];
    const branches = state.branches || [];

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);

    const editing = editingId ? staff.find((u) => u.id === editingId) : null;
    const [form, setForm] = React.useState({ name: '', role: 'CASHIER', branchId: branches[0]?.id, status: 'Active', email: '', password: '' });

    React.useEffect(() => {
        if (!editorOpen) return;
        if (editing) {
            setForm({
                name: editing.name || '',
                role: editing.role || 'CASHIER',
                branchId: editing.branchId || branches[0]?.id,
                status: editing.status || 'Active',
                email: editing.email || '',
                password: editing.password || '',
            });
        } else {
            setForm({ name: '', role: 'CASHIER', branchId: branches[0]?.id, status: 'Active', email: '', password: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorOpen, editingId]);

    function branchName(id) {
        return branches.find((b) => b.id === id)?.name || '-';
    }

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
            role: form.role || 'CASHIER',
            branchId: form.branchId || branches[0]?.id,
            status: form.status || 'Active',
            email: String(form.email || '').trim(),
            password: String(form.password || ''),
        };
        if (!patch.name) return;

        if (editingId) {
            api.update('staff', editingId, patch);
        } else {
            api.create('staff', patch);
        }

        setEditorOpen(false);
        setEditingId(null);
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Staff</div>
                        <div className="muted" style={{ fontSize: 12 }}>Manage staff accounts and roles</div>
                    </div>
                    <button className="button" type="button" onClick={openCreate}>+ Add Staff</button>
                </div>
                <div className="divider" />

                <table className="table">
                    <thead>
                        <tr>
                            <th>Staff ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Branch</th>
                            <th>Status</th>
                            <th style={{ width: 160 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map((u) => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 900 }}>{u.staffId || '-'}</td>
                                <td style={{ fontWeight: 900 }}>{u.name}</td>
                                <td>{u.email || '-'}</td>
                                <td>{u.role}</td>
                                <td>{branchName(u.branchId)}</td>
                                <td>{u.status}</td>
                                <td>
                                    <div className="tableActions">
                                        <button className="button" type="button" onClick={() => openEdit(u.id)}>
                                            Edit
                                        </button>
                                        <button className="button" type="button" onClick={() => openDelete(u.id)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {staff.length === 0 ? <div className="empty">No staff yet.</div> : null}
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">Roles</div>
                    <a className="link" href="#">Edit permissions →</a>
                </div>
                <div className="empty">Roles & permissions will be configured once backend is added.</div>
            </div>

            <Modal
                open={editorOpen}
                title={editingId ? 'Edit Staff' : 'New Staff'}
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
                        <span className="fieldLabel">Staff ID</span>
                        <input className="input" value={editing?.staffId || 'Auto'} disabled />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Name</span>
                        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Email</span>
                        <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Password</span>
                        <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Role</span>
                        <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="CASHIER">CASHIER</option>
                            <option value="STOREKEEPER">STOREKEEPER</option>
                        </select>
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Branch</span>
                        <select className="input" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
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
                title="Delete staff"
                message="This will remove the staff record."
                confirmText="Delete"
                danger
                onCancel={() => {
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
                onConfirm={() => {
                    if (confirmId) api.remove('staff', confirmId);
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
            />
        </div>
    );
}
