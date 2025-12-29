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

        const stockRows = branchIds.length
            ? await prisma.branchStock.findMany({
                where: { branchId: { in: branchIds } },
            })
            : [];

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
            sales: [],
            expenses: [],
            transfers: [],
            customers: [],
        });
    })
);
