import React from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { useStore } from '../data/StoreContext.jsx';
import { ONLINE_ONLY } from '../data/store.js';

function money(n, currency) {
    const num = Number(n);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'TZS' }).format(num);
}

export default function ExpensesPage() {
    const { state, api } = useStore();
    const currency = state.settings?.currency || 'TZS';
    const activeBranchId = state.settings?.activeBranchId;

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);

    const expenses = state.expenses || [];
    const editing = editingId ? expenses.find((x) => x.id === editingId) : null;

    const today = new Date().toISOString().slice(0, 10);
    const [form, setForm] = React.useState({ date: today, category: '', note: '', amount: 0 });

    React.useEffect(() => {
        if (!editorOpen) return;
        if (editing) {
            setForm({
                date: editing.date || today,
                category: editing.category || '',
                note: editing.note || '',
                amount: Number(editing.amount || 0),
            });
        } else {
            setForm({ date: today, category: '', note: '', amount: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorOpen, editingId]);

    const rows = expenses
        .filter((e) => (activeBranchId ? e.branchId === activeBranchId : true))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

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
            date: String(form.date || today),
            category: String(form.category || '').trim(),
            note: String(form.note || '').trim(),
            amount: Number(form.amount || 0),
            branchId: activeBranchId || (state.branches || [])[0]?.id,
        };
        if (!patch.category) return;

        if (editingId) {
            api.update('expenses', editingId, patch);
        } else {
            api.create('expenses', patch);
        }

        setEditorOpen(false);
        setEditingId(null);
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Expenses</div>
                        <div className="muted" style={{ fontSize: 12 }}>Record and categorize expenses per branch</div>
                    </div>
                    <button className="button" type="button" onClick={openCreate} disabled={ONLINE_ONLY}>+ Add Expense</button>
                </div>

                <div className="divider" />

                {ONLINE_ONLY ? (
                    <div className="empty">Online-only mode: expenses will be enabled once the backend CRUD endpoints are added.</div>
                ) : null}

                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Note</th>
                            <th>Amount</th>
                            <th style={{ width: 160 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((e) => (
                            <tr key={e.id}>
                                <td>{e.date}</td>
                                <td style={{ fontWeight: 800 }}>{e.category}</td>
                                <td>{e.note}</td>
                                <td>{money(e.amount, currency)}</td>
                                <td>
                                    <div className="tableActions">
                                        <button className="button" type="button" onClick={() => openEdit(e.id)}>
                                            Edit
                                        </button>
                                        <button className="button" type="button" onClick={() => openDelete(e.id)} style={{ background: 'rgba(214,69,93,0.10)' }}>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {rows.length === 0 ? <div className="empty">No expenses yet.</div> : null}
            </div>

            <Modal
                open={editorOpen}
                title={editingId ? 'Edit Expense' : 'New Expense'}
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
                        <span className="fieldLabel">Date</span>
                        <input className="input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Category</span>
                        <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Rent, Transport, Supplies…" />
                    </label>
                    <label className="field" style={{ gridColumn: '1 / -1' }}>
                        <span className="fieldLabel">Note</span>
                        <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optional" />
                    </label>
                    <label className="field">
                        <span className="fieldLabel">Amount ({currency})</span>
                        <input className="input" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                    </label>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title="Delete expense"
                message="This will remove the expense entry."
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
                    if (confirmId) api.remove('expenses', confirmId);
                    setConfirmOpen(false);
                    setConfirmId(null);
                }}
            />
        </div>
    );
}
