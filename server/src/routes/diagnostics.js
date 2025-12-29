import { Router } from 'express';

import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const diagnosticsRouter = Router();

diagnosticsRouter.get(
    '/diagnostics/db',
    requireAuth,
    asyncHandler(async (req, res) => {
        const role = String(req.user?.role || '').toUpperCase();
        if (role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const checkId = `diag-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        // DB connectivity check
        const now = await prisma.$queryRaw`SELECT NOW() as now`;

        // Simple write/read check using a harmless Product row
        const created = await prisma.product.create({
            data: {
                name: `DIAG ${checkId}`,
                sku: `DIAG-${checkId}`,
                qr: `DIAG-${checkId}`,
                sellingPrice: '0',
                costPrice: '0',
                status: 'Inactive',
            },
            select: { id: true, name: true, sku: true, qr: true, createdAt: true },
        });

        const fetched = await prisma.product.findUnique({
            where: { id: created.id },
            select: { id: true, name: true, sku: true, qr: true, createdAt: true },
        });

        res.json({
            ok: true,
            env: {
                nodeEnv: process.env.NODE_ENV || null,
                commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || null,
            },
            db: {
                now,
                writeReadOk: Boolean(fetched && fetched.id === created.id),
                created,
            },
        });
    })
);
