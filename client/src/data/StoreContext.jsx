import React from 'react';

import { createId, ensureState, ONLINE_ONLY, saveState, seedState } from './store.js';

const StoreContext = React.createContext(null);

function nextProductId(state) {
    const taken = new Set((state.products || []).map((p) => String(p.id || '')));
    let seq = Number(state?.counters?.productSeq || 1);
    if (!Number.isFinite(seq) || seq < 1) seq = 1;

    let id = '';
    while (seq < 1000000) {
        id = `PRD${String(seq).padStart(3, '0')}`;
        if (!taken.has(id)) break;
        seq += 1;
    }

    return { id, nextSeq: seq + 1 };
}

function ensureStockBuckets(state, branchIds) {
    const next = state.productStocks && typeof state.productStocks === 'object' ? { ...state.productStocks } : {};
    for (const bid of branchIds) {
        if (!next[bid] || typeof next[bid] !== 'object') next[bid] = {};
    }
    return next;
}

export function StoreProvider({ children }) {
    const [state, setState] = React.useState(() => ensureState());

    React.useEffect(() => {
        if (!ONLINE_ONLY) saveState(state);
    }, [state]);

    const api = React.useMemo(() => {
        function setSettings(patch) {
            setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
        }

        function recordSale({ customerId, branchId, items }) {
            if (ONLINE_ONLY) return { ok: false, error: 'OnlineOnly' };
            const safeItems = Array.isArray(items) ? items : [];
            if (safeItems.length === 0) return { ok: false, error: 'Add at least one item to the sale.' };

            let result = { ok: true, saleId: null };

            setState((s) => {
                const products = Array.isArray(s.products) ? s.products : [];
                const customers = Array.isArray(s.customers) ? s.customers : [];
                const sales = Array.isArray(s.sales) ? s.sales : [];

                const branches = Array.isArray(s.branches) ? s.branches : [];
                const effectiveBranchId = String(branchId || s.settings?.activeBranchId || branches[0]?.id || '');
                const nextProductStocks = ensureStockBuckets(s, branches.map((b) => String(b.id || '')).filter(Boolean));
                const bucket = nextProductStocks[effectiveBranchId] || (nextProductStocks[effectiveBranchId] = {});

                const cust = customers.find((c) => c.id === customerId) || customers[0];
                if (!cust) {
                    result = { ok: false, error: 'Please create a customer first.' };
                    return s;
                }

                const byId = new Map(products.map((p) => [p.id, p]));

                // Validate stock and compute totals
                let total = 0;
                const normalized = [];

                for (const it of safeItems) {
                    const p = byId.get(it.productId);
                    if (!p) {
                        result = { ok: false, error: 'One or more products in the cart no longer exist.' };
                        return s;
                    }
                    const q = Number(it.qty || 0);
                    if (!Number.isFinite(q) || q <= 0) {
                        result = { ok: false, error: 'Quantity must be greater than 0.' };
                        return s;
                    }
                    const available = Number(bucket[p.id] ?? p.stock ?? 0);
                    if (q > available) {
                        result = { ok: false, error: `Not enough stock for “${p.name}”. Available: ${available}.` };
                        return s;
                    }

                    const price = Number(p.sellingPrice ?? p.price ?? 0);
                    const lineTotal = q * price;
                    total += lineTotal;
                    normalized.push({
                        productId: p.id,
                        name: p.name,
                        qty: q,
                        price,
                        total: lineTotal,
                    });
                }

                const now = new Date();
                const saleId = createId('s');
                const code = `S-${String(now.getTime()).slice(-6)}`;

                const sale = {
                    id: saleId,
                    code,
                    date: now.toISOString().slice(0, 10),
                    time: now.toTimeString().slice(0, 5),
                    createdAt: now.toISOString(),
                    customerId: cust.id,
                    customerName: cust.name || 'Walk-in',
                    status: 'Paid',
                    items: normalized,
                    total,
                    branchId: effectiveBranchId,
                };

                for (const line of normalized) {
                    const pid = String(line.productId || '');
                    if (!pid) continue;
                    const n = Number(bucket[pid] ?? 0);
                    bucket[pid] = Math.max(0, n - Number(line.qty || 0));
                }

                result = { ok: true, saleId };
                return { ...s, sales: [sale, ...sales], productStocks: nextProductStocks };
            });

            return result;
        }

        function transferStock({ fromBranchId, toBranchId, productId, qty, date }) {
            if (ONLINE_ONLY) return { ok: false, error: 'OnlineOnly' };
            const q = Number(qty || 0);
            if (!Number.isFinite(q) || q <= 0) return { ok: false, error: 'Quantity must be greater than 0.' };

            let result = { ok: true, transferId: null };

            setState((s) => {
                const products = Array.isArray(s.products) ? s.products : [];
                const branches = Array.isArray(s.branches) ? s.branches : [];
                const transfers = Array.isArray(s.transfers) ? s.transfers : [];

                const fromId = String(fromBranchId || '');
                const toId = String(toBranchId || '');
                if (!fromId || !toId) {
                    result = { ok: false, error: 'Select both source and destination branches.' };
                    return s;
                }
                if (fromId === toId) {
                    result = { ok: false, error: 'Source and destination branches must be different.' };
                    return s;
                }

                const p = products.find((x) => String(x.id || '') === String(productId || ''));
                if (!p) {
                    result = { ok: false, error: 'Select a valid product.' };
                    return s;
                }

                const branchIds = branches.map((b) => String(b.id || '')).filter(Boolean);
                const nextProductStocks = ensureStockBuckets(s, branchIds);
                const fromBucket = nextProductStocks[fromId] || (nextProductStocks[fromId] = {});
                const toBucket = nextProductStocks[toId] || (nextProductStocks[toId] = {});

                const available = Number(fromBucket[p.id] ?? 0);
                if (q > available) {
                    result = { ok: false, error: `Not enough stock. Available: ${available}.` };
                    return s;
                }

                const now = new Date();
                const transferId = createId('t');
                const safeDate = String(date || now.toISOString().slice(0, 10));
                const transfer = {
                    id: transferId,
                    date: safeDate,
                    createdAt: now.toISOString(),
                    fromBranchId: fromId,
                    toBranchId: toId,
                    productId: p.id,
                    qty: q,
                    status: 'Pending',
                    applied: false,
                };

                result = { ok: true, transferId };
                return { ...s, transfers: [transfer, ...transfers], productStocks: nextProductStocks };
            });

            return result;
        }

        function updateTransferStatus({ transferId, status }) {
            if (ONLINE_ONLY) return { ok: false, error: 'OnlineOnly' };
            const nextStatus = String(status || '').toUpperCase();
            if (!transferId) return { ok: false, error: 'Missing transferId.' };
            if (!nextStatus) return { ok: false, error: 'Missing status.' };

            let result = { ok: true };

            setState((s) => {
                const transfers = Array.isArray(s.transfers) ? s.transfers : [];
                const idx = transfers.findIndex((t) => String(t?.id || '') === String(transferId));
                if (idx < 0) {
                    result = { ok: false, error: 'Transfer not found.' };
                    return s;
                }

                const current = transfers[idx];
                const products = Array.isArray(s.products) ? s.products : [];
                const branches = Array.isArray(s.branches) ? s.branches : [];

                const fromId = String(current?.fromBranchId || '');
                const toId = String(current?.toBranchId || '');
                const productId = String(current?.productId || '');
                const qty = Number(current?.qty || 0);

                if (!fromId || !toId || !productId || !Number.isFinite(qty) || qty <= 0) {
                    result = { ok: false, error: 'Transfer data is invalid.' };
                    return s;
                }

                const p = products.find((x) => String(x?.id || '') === productId);
                if (!p) {
                    result = { ok: false, error: 'Product for this transfer no longer exists.' };
                    return s;
                }

                const branchIds = branches.map((b) => String(b.id || '')).filter(Boolean);
                const nextProductStocks = ensureStockBuckets(s, branchIds);
                const fromBucket = nextProductStocks[fromId] || (nextProductStocks[fromId] = {});
                const toBucket = nextProductStocks[toId] || (nextProductStocks[toId] = {});

                const applied = Boolean(current?.applied);
                const updated = { ...current, status: nextStatus };

                if (nextStatus === 'COMPLETED' && !applied) {
                    const available = Number(fromBucket[productId] ?? 0);
                    if (qty > available) {
                        result = { ok: false, error: `Not enough stock to complete. Available: ${available}.` };
                        return s;
                    }
                    fromBucket[productId] = Math.max(0, available - qty);
                    toBucket[productId] = Number(toBucket[productId] ?? 0) + qty;
                    updated.applied = true;
                }

                const nextTransfers = transfers.slice();
                nextTransfers[idx] = updated;
                return { ...s, transfers: nextTransfers, productStocks: nextProductStocks };
            });

            return result;
        }

        function create(collection, row) {
            if (ONLINE_ONLY) throw new Error('OnlineOnly');
            if (collection === 'products' && !row.id) {
                let createdId = '';
                setState((s) => {
                    const branches = Array.isArray(s.branches) ? s.branches : [];
                    const activeBranchId = String(s.settings?.activeBranchId || branches[0]?.id || '');
                    const nextProductStocks = ensureStockBuckets(s, branches.map((b) => String(b.id || '')).filter(Boolean));

                    const { id, nextSeq } = nextProductId(s);
                    createdId = id;
                    const next = { ...row, id };

                    const initialStock = Number(next.stock || 0);
                    for (const b of branches) {
                        const bid = String(b?.id || '');
                        if (!bid) continue;
                        const bucket = nextProductStocks[bid] || (nextProductStocks[bid] = {});
                        if (bid === activeBranchId) bucket[id] = initialStock;
                        else if (bucket[id] == null) bucket[id] = 0;
                    }
                    return {
                        ...s,
                        counters: { ...(s.counters || {}), productSeq: nextSeq },
                        products: [next, ...(s.products || [])],
                        productStocks: nextProductStocks,
                    };
                });
                return createdId;
            }

            if (collection === 'staff') {
                const id = row.id || createId('u');
                let createdStaffId = String(row.staffId || '').trim();

                if (!createdStaffId) {
                    setState((s) => {
                        const list = Array.isArray(s.staff) ? s.staff : [];
                        const re = /^CLSTAFF(\d+)$/i;
                        let max = 0;
                        for (const st of list) {
                            const m = String(st?.staffId || '').trim().match(re);
                            if (!m) continue;
                            const n = Number(m[1]);
                            if (Number.isFinite(n)) max = Math.max(max, n);
                        }
                        createdStaffId = `CLSTAFF${String(max + 1).padStart(2, '0')}`;
                        const next = {
                            ...row,
                            id,
                            staffId: createdStaffId,
                            email: String(row.email || ''),
                            password: String(row.password || ''),
                        };
                        return { ...s, staff: [next, ...list] };
                    });

                    return id;
                }

                const next = { ...row, id, staffId: createdStaffId };
                setState((s) => ({ ...s, staff: [next, ...(s.staff || [])] }));
                return id;
            }

            const id = row.id || createId(collection.slice(0, 1));
            const next = { ...row, id };
            setState((s) => ({ ...s, [collection]: [next, ...(s[collection] || [])] }));
            return id;
        }

        function update(collection, id, patch) {
            if (ONLINE_ONLY) throw new Error('OnlineOnly');
            if (collection === 'products' && Object.prototype.hasOwnProperty.call(patch || {}, 'stock')) {
                setState((s) => {
                    const branches = Array.isArray(s.branches) ? s.branches : [];
                    const activeBranchId = String(s.settings?.activeBranchId || branches[0]?.id || '');
                    const nextProductStocks = ensureStockBuckets(s, branches.map((b) => String(b.id || '')).filter(Boolean));
                    const bucket = nextProductStocks[activeBranchId] || (nextProductStocks[activeBranchId] = {});
                    const n = Number(patch.stock || 0);
                    bucket[id] = Number.isFinite(n) && n >= 0 ? n : 0;

                    return {
                        ...s,
                        [collection]: (s[collection] || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
                        productStocks: nextProductStocks,
                    };
                });
                return;
            }

            setState((s) => ({
                ...s,
                [collection]: (s[collection] || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
            }));
        }

        function remove(collection, id) {
            if (ONLINE_ONLY) throw new Error('OnlineOnly');
            setState((s) => ({
                ...s,
                [collection]: (s[collection] || []).filter((r) => r.id !== id),
            }));
        }

        function reset() {
            if (ONLINE_ONLY) {
                throw new Error('OnlineOnly');
            }
            const seeded = seedState();
            saveState(seeded);
            setState(seeded);
        }

        function hydrate(payload) {
            const next = payload && typeof payload === 'object' ? payload : {};
            setState((s) => ({
                ...s,
                branches: Array.isArray(next.branches) ? next.branches : s.branches,
                products: Array.isArray(next.products) ? next.products : s.products,
                productStocks: next.productStocks && typeof next.productStocks === 'object' ? next.productStocks : s.productStocks,
                customers: Array.isArray(next.customers) ? next.customers : s.customers,
                sales: Array.isArray(next.sales) ? next.sales : s.sales,
                expenses: Array.isArray(next.expenses) ? next.expenses : s.expenses,
                transfers: Array.isArray(next.transfers) ? next.transfers : s.transfers,
            }));
        }

        return {
            setSettings,
            recordSale,
            transferStock,
            updateTransferStatus,
            create,
            update,
            remove,
            reset,
            hydrate,
        };
    }, []);

    const value = React.useMemo(() => ({ state, setState, api }), [state, api]);

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
    const ctx = React.useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}
