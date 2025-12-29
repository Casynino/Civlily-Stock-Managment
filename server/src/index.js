import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { bootstrapRouter } from './routes/bootstrap.js';
import { customersRouter } from './routes/customers.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { salesRouter } from './routes/sales.js';

const app = express();

app.use(helmet());

const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOriginSet = new Set(configuredOrigins);
const isAllowedVercelOrigin = (origin) => {
    const o = String(origin || '');
    if (!o) return false;
    try {
        const { hostname, protocol } = new URL(o);
        if (protocol !== 'https:' && protocol !== 'http:') return false;
        return hostname.endsWith('.vercel.app');
    } catch {
        return false;
    }
};

app.use(
    cors({
        origin: (origin, cb) => {
            // allow non-browser clients (curl/postman) that may send no Origin
            if (!origin) return cb(null, true);
            if (allowedOriginSet.has(origin)) return cb(null, true);
            if (isAllowedVercelOrigin(origin)) return cb(null, true);
            return cb(null, false);
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true }));

app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', bootstrapRouter);
app.use('/api', diagnosticsRouter);
app.use('/api', customersRouter);
app.use('/api', productsRouter);
app.use('/api', salesRouter);

// error handler
app.use((err, _req, res, _next) => {
    const status = Number(err?.status || 500);
    const message = err?.message || 'ServerError';
    res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 4000);

async function ensureProductCodes() {
    const existing = await prisma.product.findMany({
        select: { id: true, code: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    const re = /^PR(\d+)$/i;
    let max = 0;
    for (const p of existing) {
        const m = String(p.code || '').trim().match(re);
        if (!m) continue;
        const n = Number(m[1]);
        if (Number.isFinite(n)) max = Math.max(max, n);
    }

    const missing = existing.filter((p) => !String(p.code || '').trim());
    if (missing.length === 0) return;

    let seq = max + 1;
    const updates = [];
    for (const p of missing) {
        const code = `PR${String(seq).padStart(3, '0')}`;
        seq += 1;
        updates.push(prisma.product.update({ where: { id: p.id }, data: { code } }));
    }
    await prisma.$transaction(updates);
}

async function ensureWalkInCustomerAndCodes() {
    const walkInCode = 'CU000';
    const walkInName = 'WALK-IN';

    const existingWalkIn = await prisma.customer.findFirst({
        where: {
            OR: [{ code: walkInCode }, { name: walkInName }],
        },
        orderBy: { createdAt: 'asc' },
    });

    if (!existingWalkIn) {
        await prisma.customer.create({
            data: {
                code: walkInCode,
                name: walkInName,
                phone: null,
                balance: '0',
                status: 'Active',
            },
        });
    } else if (existingWalkIn.code !== walkInCode || existingWalkIn.name !== walkInName) {
        await prisma.customer.update({
            where: { id: existingWalkIn.id },
            data: {
                code: walkInCode,
                name: walkInName,
            },
        });
    }

    const existing = await prisma.customer.findMany({
        select: { id: true, code: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    const re = /^CU(\d+)$/i;
    let max = 0;
    for (const c of existing) {
        const m = String(c.code || '').trim().match(re);
        if (!m) continue;
        const n = Number(m[1]);
        if (Number.isFinite(n)) max = Math.max(max, n);
    }

    const missing = existing.filter((c) => !String(c.code || '').trim());
    if (missing.length === 0) return;

    let seq = Math.max(max + 1, 1);
    const updates = [];
    for (const c of missing) {
        const code = `CU${String(seq).padStart(3, '0')}`;
        seq += 1;
        updates.push(prisma.customer.update({ where: { id: c.id }, data: { code } }));
    }
    await prisma.$transaction(updates);
}

(async () => {
    try {
        await ensureProductCodes();
        await ensureWalkInCustomerAndCodes();
    } catch (e) {
        console.error('Code backfill failed:', e);
    }

    app.listen(port, () => {
        console.log(`API listening on http://localhost:${port}`);
    });
})();
