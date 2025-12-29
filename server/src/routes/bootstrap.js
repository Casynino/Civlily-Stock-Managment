import express from 'express';

import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const bootstrapRouter = express.Router();

bootstrapRouter.get(
    '/bootstrap',
    requireAuth,
    asyncHandler(async (req, res) => {
        const role = String(req.user?.role || '').toUpperCase();

        const branches =
            role === 'ADMIN'
                ? await prisma.branch.findMany({ orderBy: { name: 'asc' } })
                : await prisma.branch.findMany({ where: { id: String(req.user?.branchId || '') } });

        const branchIds = branches.map((b) => b.id);

        const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });

        const sales = branchIds.length
            ? await prisma.sale.findMany({
                where: { branchId: { in: branchIds } },
                orderBy: { createdAt: 'desc' },
                take: 100,
            })
            : [];

        const stockRows = branchIds.length
            ? await prisma.branchStock.findMany({
                where: { branchId: { in: branchIds } },
            })
            : [];

        const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });

        const productStocks = {};
        for (const bid of branchIds) productStocks[bid] = {};
        for (const row of stockRows) {
            if (!productStocks[row.branchId]) productStocks[row.branchId] = {};
            productStocks[row.branchId][row.productId] = row.quantity;
        }

        res.json({
            branches,
            products: products.map((p) => ({
                ...p,
                sellingPrice: String(p.sellingPrice),
                costPrice: String(p.costPrice),
            })),
            productStocks,
            sales: sales.map((s) => ({
                id: s.id,
                code: s.code,
                date: s.date,
                time: s.time,
                total: String(s.total),
                paid: String(s.paid),
                change: String(s.change),
                status: s.status,
                paymentMethod: s.paymentMethod,
                branchId: s.branchId,
                createdAt: s.createdAt,
                customerName: '-',
            })),
            expenses: [],
            transfers: [],
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
