import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const customersRouter = Router();

function requireWriteRole(req) {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) throw httpError(403, 'Forbidden');
}

customersRouter.get(
    '/customers',
    requireAuth,
    asyncHandler(async (_req, res) => {
        const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({
            customers: customers.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                balance: String(c.balance),
                status: c.status,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            })),
        });
    })
);

customersRouter.post(
    '/customers',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);
        const body = z
            .object({
                name: z.string().min(1),
                phone: z.string().optional().nullable(),
                balance: z.number().optional().default(0),
                status: z.string().optional().default('Active'),
            })
            .parse(req.body);

        const created = await prisma.customer.create({
            data: {
                name: body.name.trim(),
                phone: body.phone ? String(body.phone).trim() : null,
                balance: String(Number(body.balance || 0)),
                status: String(body.status || 'Active'),
            },
        });

        res.status(201).json({
            customer: {
                id: created.id,
                name: created.name,
                phone: created.phone,
                balance: String(created.balance),
                status: created.status,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
            },
        });
    })
);

customersRouter.put(
    '/customers/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);
        const id = String(req.params.id || '');
        if (!id) throw httpError(400, 'MissingId');

        const body = z
            .object({
                name: z.string().min(1).optional(),
                phone: z.string().optional().nullable(),
                balance: z.number().optional(),
                status: z.string().optional(),
            })
            .parse(req.body);

        const updated = await prisma.customer.update({
            where: { id },
            data: {
                ...(body.name !== undefined ? { name: body.name.trim() } : {}),
                ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone).trim() : null } : {}),
                ...(body.balance !== undefined ? { balance: String(Number(body.balance || 0)) } : {}),
                ...(body.status !== undefined ? { status: String(body.status || 'Active') } : {}),
            },
        });

        res.json({
            customer: {
                id: updated.id,
                name: updated.name,
                phone: updated.phone,
                balance: String(updated.balance),
                status: updated.status,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            },
        });
    })
);

customersRouter.delete(
    '/customers/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);
        const id = String(req.params.id || '');
        if (!id) throw httpError(400, 'MissingId');

        await prisma.customer.delete({ where: { id } });
        res.json({ ok: true });
    })
);
