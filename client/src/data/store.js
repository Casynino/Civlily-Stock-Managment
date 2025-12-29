export const STORAGE_KEY = 'civlily_frontend_v1';

export const ONLINE_ONLY = (() => {
    try {
        const prod = Boolean(import.meta?.env?.PROD);
        const base = String(import.meta?.env?.VITE_API_BASE || '');
        if (!prod) return false;
        if (!base) return true;
        return !/localhost|127\.0\.0\.1/i.test(base);
    } catch {
        return false;
    }
})();

function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_CATEGORIES = [];

function normalizeState(state) {
    if (!state || typeof state !== 'object') return state;

    const settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    const restSettings = { ...settings };
    if (Object.prototype.hasOwnProperty.call(restSettings, 'businessName')) delete restSettings.businessName;
    const language = String(settings.language || 'en');
    const rawCurrency = String(settings.currency || 'TZS');
    const allowedCurrencies = new Set(['TZS', 'USD', 'CNY']);
    const currency = allowedCurrencies.has(rawCurrency) ? rawCurrency : 'TZS';
    const activeBranchId = String(settings.activeBranchId || '');

    const branches = Array.isArray(state.branches) ? state.branches : [];
    const primaryBranchId = activeBranchId || String(branches[0]?.id || 'b-main');

    const rawCategories = Array.isArray(state.categories) ? state.categories : [];
    const categories = rawCategories
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({ id: String(c.id || ''), name: String(c.name || '').trim() }))
        .filter((c) => c.id && c.name);

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

    // Ensure default categories exist
    const nextCategories = categories.slice();
    for (const name of DEFAULT_CATEGORIES) {
        const key = name.toLowerCase();
        if (!categoryByName.has(key)) {
            const created = { id: uid('cat'), name };
            nextCategories.push(created);
            categoryByName.set(key, created);
        }
    }

    const products = Array.isArray(state.products) ? state.products : [];

    const rawStaff = Array.isArray(state.staff) ? state.staff : [];
    const nextStaff = rawStaff
        .filter((s) => s && typeof s === 'object')
        .map((s) => {
            const id = String(s.id || '');
            const base = {
                ...s,
                id,
                name: String(s.name || ''),
                role: String(s.role || ''),
                branchId: String(s.branchId || ''),
                status: String(s.status || ''),
                staffId: String(s.staffId || ''),
                email: String(s.email || ''),
                password: String(s.password || ''),
            };

            return base;
        });

    const prdRe = /^PRD(\d{3,})$/i;
    let maxProductSeq = 0;
    for (const p of products) {
        const id = String(p?.id || '');
        const m = id.match(prdRe);
        if (!m) continue;
        const n = Number(m[1]);
        if (Number.isFinite(n)) maxProductSeq = Math.max(maxProductSeq, n);
    }

    const nextProducts = products.map((p) => {
        const sellingPrice = p.sellingPrice ?? p.price ?? 0;
        const buyingPrice = p.buyingPrice ?? 0;

        const legacyCategoryName = String(p.category || '').trim();
        const legacyKey = legacyCategoryName.toLowerCase();
        const existingCategory = legacyKey ? categoryByName.get(legacyKey) : null;

        let categoryId = String(p.categoryId || '');
        if (!categoryId && existingCategory) categoryId = existingCategory.id;
        if (!categoryId && legacyCategoryName) {
            const created = { id: uid('cat'), name: legacyCategoryName };
            nextCategories.push(created);
            categoryByName.set(legacyKey, created);
            categoryId = created.id;
        }

        return {
            ...p,
            sku: String(p.sku || ''),
            categoryId,
            barcode: String(p.barcode || ''),
            barcodeImageDataUrl: typeof p.barcodeImageDataUrl === 'string' ? p.barcodeImageDataUrl : '',
            description: String(p.description || ''),
            imageDataUrl: typeof p.imageDataUrl === 'string' ? p.imageDataUrl : '',
            supplierName: String(p.supplierName || ''),
            supplierPhone: String(p.supplierPhone || ''),
            buyingPrice: Number(buyingPrice || 0),
            sellingPrice: Number(sellingPrice || 0),
            stock: Number(p.stock || 0),
        };
    });

    // Branch-level stock ledger
    const rawProductStocks = state.productStocks && typeof state.productStocks === 'object' ? state.productStocks : null;
    const nextProductStocks = rawProductStocks ? JSON.parse(JSON.stringify(rawProductStocks)) : {};

    // Ensure branch buckets exist
    const branchIds = (Array.isArray(branches) ? branches : []).map((b) => String(b?.id || '')).filter(Boolean);
    const ensuredBranchIds = branchIds.length ? branchIds : [primaryBranchId];
    for (const bid of ensuredBranchIds) {
        if (!nextProductStocks[bid] || typeof nextProductStocks[bid] !== 'object') nextProductStocks[bid] = {};
    }

    // If missing ledger, migrate legacy stock into primary branch
    if (!rawProductStocks) {
        const bucket = nextProductStocks[primaryBranchId] || (nextProductStocks[primaryBranchId] = {});
        for (const p of nextProducts) {
            const pid = String(p.id || '');
            if (!pid) continue;
            bucket[pid] = Number(p.stock || 0);
        }
    }

    // Normalize ledger entries
    for (const bid of Object.keys(nextProductStocks)) {
        const bucket = nextProductStocks[bid];
        if (!bucket || typeof bucket !== 'object') continue;
        for (const p of nextProducts) {
            const pid = String(p.id || '');
            if (!pid) continue;
            const n = Number(bucket[pid] || 0);
            bucket[pid] = Number.isFinite(n) && n >= 0 ? n : 0;
        }
    }

    const transfers = Array.isArray(state.transfers) ? state.transfers : [];

    return {
        ...state,
        settings: {
            ...restSettings,
            language,
            currency,
            activeBranchId,
        },
        counters: {
            productSeq: Math.max(Number(state?.counters?.productSeq || 0), maxProductSeq + 1, 1),
        },
        categories: nextCategories,
        branches,
        products: nextProducts,
        productStocks: nextProductStocks,
        customers: Array.isArray(state.customers) ? state.customers : [],
        staff: nextStaff,
        sales: Array.isArray(state.sales) ? state.sales : [],
        transfers,
    };
}

export function seedState() {
    return {
        version: 1,
        counters: {
            productSeq: 1,
        },
        settings: {
            currency: 'TZS',
            activeBranchId: '',
            language: 'en',
        },
        categories: [],
        branches: [],
        staff: [],
        customers: [],
        products: [],
        productStocks: {},
        expenses: [],
        sales: [],
        transfers: [],
    };
}

export function loadState() {
    if (ONLINE_ONLY) return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return normalizeState(parsed);
    } catch {
        return null;
    }
}

export function saveState(state) {
    if (ONLINE_ONLY) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function ensureState() {
    const existing = loadState();
    if (existing) return existing;
    if (ONLINE_ONLY) {
        return normalizeState({
            version: 1,
            counters: { productSeq: 1 },
            settings: {
                currency: 'TZS',
                activeBranchId: '',
                language: 'en',
            },
            categories: [],
            branches: [],
            products: [],
            productStocks: {},
            customers: [],
            staff: [],
            expenses: [],
            sales: [],
            transfers: [],
        });
    }
    const seeded = seedState();
    saveState(seeded);
    return seeded;
}

export function createId(prefix) {
    return uid(prefix);
}
