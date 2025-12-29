import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.js';
import { bootstrapRouter } from './routes/bootstrap.js';
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
app.use('/api', productsRouter);
app.use('/api', salesRouter);

// error handler
app.use((err, _req, res, _next) => {
    const status = Number(err?.status || 500);
    const message = err?.message || 'ServerError';
    res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
