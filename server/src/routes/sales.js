import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, resolveBranchScope } from '../middleware/auth.js';

export const salesRouter = Router();

salesRouter.post(
    '/sales',
    requireAuth,
    asyncHandler(async (req, res) => {
        const role = String(req.user.role || '').toUpperCase();
        if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
            throw httpError(403, 'Forbidden');
        }

        const body = z
            .object({
                branchId: z.string().min(1),
                paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER']),
                paid: z.number().nonnegative(),
                items: z
                    .array(
                        z.object({
                            productId: z.string().min(1),
                            quantity: z.number().int().positive(),
                        })
                    )
                    .min(1),
            })
            .parse(req.body);

        const scopedBranchId = resolveBranchScope(req);

        if (role !== 'ADMIN' && body.branchId !== scopedBranchId) {
            throw httpError(403, 'ForbiddenBranch');
        }

        const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
        if (!branch) throw httpError(400, 'InvalidBranch');

        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5);
        const code = `S-${String(now.getTime()).slice(-6)}`;

        const productIds = body.items.map((it) => it.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        const byId = new Map(products.map((p) => [p.id, p]));

        // Load stock
        const stocks = await prisma.branchStock.findMany({
            where: { branchId: body.branchId, productId: { in: productIds } },
        });
        const stockByProduct = new Map(stocks.map((s) => [s.productId, s]));

        let total = 0;
        const items = [];

        for (const it of body.items) {
            const p = byId.get(it.productId);
            if (!p) throw httpError(400, 'InvalidProduct');
            const stockRow = stockByProduct.get(it.productId);
            const available = Number(stockRow?.quantity || 0);
            if (it.quantity > available) throw httpError(400, `NotEnoughStock:${it.productId}`);

            const price = Number(p.sellingPrice);
            const lineTotal = price * it.quantity;
            total += lineTotal;
            items.push({
                productId: p.id,
                qty: it.quantity,
                price,
                total: lineTotal,
            });
        }

        const paid = Number(body.paid || 0);
        const change = Math.max(0, paid - total);

        const created = await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.create({
                data: {
                    code,
                    date,
                    time,
                    total,
                    paid,
                    change,
                    status: 'Paid',
                    paymentMethod: body.paymentMethod,
                    branchId: body.branchId,
                    staffId: req.user.id,
                    items: {
                        create: items.map((x) => ({
                            productId: x.productId,
                            qty: x.qty,
                            price: x.price,
                            total: x.total,
                        })),
                    },
                },
                include: { items: true },
            });

            for (const it of body.items) {
                await tx.branchStock.upsert({
                    where: { branchId_productId: { branchId: body.branchId, productId: it.productId } },
                    update: { quantity: { decrement: it.quantity } },
                    create: { branchId: body.branchId, productId: it.productId, quantity: Math.max(0, 0 - it.quantity) },
                });
            }

            return sale;
        });

        res.json({
            sale: {
                id: created.id,
                code: created.code,
                date: created.date,
                time: created.time,
                total: String(created.total),
                paid: String(created.paid),
                change: String(created.change),
                status: created.status,
            },
        });
    })
);
