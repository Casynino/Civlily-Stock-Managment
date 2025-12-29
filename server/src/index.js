import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { salesRouter } from './routes/sales.js';

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
        credentials: true,
    })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true }));

app.use('/api', healthRouter);
app.use('/api', authRouter);
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
