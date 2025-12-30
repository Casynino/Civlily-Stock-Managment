import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, resolveBranchScope } from '../middleware/auth.js';

export const productsRouter = Router();

function requireWriteRole(req) {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER', 'STOREKEEPER'].includes(role)) throw httpError(403, 'Forbidden');
}

function normalizeOptionalUniqueString(v) {
    const s = String(v || '').trim();
    return s ? s : null;
}

async function nextProductCode(tx) {
    const existing = await tx.product.findMany({
        where: { code: { startsWith: 'PR' } },
        select: { code: true },
        orderBy: { code: 'desc' },
        take: 1,
    });
    const m = String(existing?.[0]?.code || '').match(/^PR(\d+)$/i);
    const max = m ? Number(m[1]) : 0;
    return `PR${String(Math.max(max + 1, 1)).padStart(3, '0')}`;
}

productsRouter.post(
    '/products',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);

        const body = z
            .object({
                branchId: z.string().min(1),
                name: z.string().min(1),
                sku: z.string().optional().nullable(),
                barcode: z.string().optional().nullable(),
                categoryId: z.string().optional().nullable(),
                description: z.string().optional().nullable(),
                imageDataUrl: z.string().optional().nullable(),
                sellingPrice: z.number().nonnegative().optional().default(0),
                costPrice: z.number().nonnegative().optional().default(0),
                stock: z.number().int().nonnegative().optional().default(0),
                status: z.string().optional().default('Active'),
            })
            .parse(req.body);

        const role = String(req.user?.role || '').toUpperCase();
        const scopedBranchId = resolveBranchScope(req);
        if (role !== 'ADMIN' && body.branchId !== scopedBranchId) throw httpError(403, 'ForbiddenBranch');

        const created = await prisma.$transaction(async (tx) => {
            const code = await nextProductCode(tx);
            const product = await tx.product.create({
                data: {
                    code,
                    name: body.name.trim(),
                    sku: normalizeOptionalUniqueString(body.sku),
                    qr: normalizeOptionalUniqueString(body.barcode),
                    categoryId: body.categoryId ? String(body.categoryId).trim() : null,
                    description: body.description ? String(body.description).trim() : null,
                    imageDataUrl: body.imageDataUrl ? String(body.imageDataUrl) : null,
                    sellingPrice: Number(body.sellingPrice || 0),
                    costPrice: Number(body.costPrice || 0),
                    status: String(body.status || 'Active'),
                },
            });

            await tx.branchStock.upsert({
                where: { branchId_productId: { branchId: body.branchId, productId: product.id } },
                update: { quantity: Number(body.stock || 0) },
                create: { branchId: body.branchId, productId: product.id, quantity: Number(body.stock || 0) },
            });

            return product;
        });

        res.status(201).json({
            product: {
                id: created.id,
                code: created.code,
                name: created.name,
                sku: created.sku,
                qr: created.qr,
                barcode: created.qr,
                categoryId: created.categoryId,
                description: created.description,
                imageDataUrl: created.imageDataUrl,
                sellingPrice: String(created.sellingPrice),
                costPrice: String(created.costPrice),
                status: created.status,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
            },
        });
    })
);

productsRouter.put(
    '/products/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);
        const id = String(req.params.id || '');
        if (!id) throw httpError(400, 'MissingId');

        const body = z
            .object({
                branchId: z.string().min(1),
                name: z.string().min(1).optional(),
                sku: z.string().optional().nullable(),
                barcode: z.string().optional().nullable(),
                categoryId: z.string().optional().nullable(),
                description: z.string().optional().nullable(),
                imageDataUrl: z.string().optional().nullable(),
                sellingPrice: z.number().nonnegative().optional(),
                costPrice: z.number().nonnegative().optional(),
                stock: z.number().int().nonnegative().optional(),
                status: z.string().optional(),
            })
            .parse(req.body);

        const role = String(req.user?.role || '').toUpperCase();
        const scopedBranchId = resolveBranchScope(req);
        if (role !== 'ADMIN' && body.branchId !== scopedBranchId) throw httpError(403, 'ForbiddenBranch');

        const updated = await prisma.$transaction(async (tx) => {
            const product = await tx.product.update({
                where: { id },
                data: {
                    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
                    ...(body.sku !== undefined ? { sku: normalizeOptionalUniqueString(body.sku) } : {}),
                    ...(body.barcode !== undefined ? { qr: normalizeOptionalUniqueString(body.barcode) } : {}),
                    ...(body.categoryId !== undefined ? { categoryId: body.categoryId ? String(body.categoryId).trim() : null } : {}),
                    ...(body.description !== undefined ? { description: body.description ? String(body.description).trim() : null } : {}),
                    ...(body.imageDataUrl !== undefined ? { imageDataUrl: body.imageDataUrl ? String(body.imageDataUrl) : null } : {}),
                    ...(body.sellingPrice !== undefined ? { sellingPrice: Number(body.sellingPrice || 0) } : {}),
                    ...(body.costPrice !== undefined ? { costPrice: Number(body.costPrice || 0) } : {}),
                    ...(body.status !== undefined ? { status: String(body.status || 'Active') } : {}),
                },
            });

            if (body.stock !== undefined) {
                await tx.branchStock.upsert({
                    where: { branchId_productId: { branchId: body.branchId, productId: product.id } },
                    update: { quantity: Number(body.stock || 0) },
                    create: { branchId: body.branchId, productId: product.id, quantity: Number(body.stock || 0) },
                });
            }

            return product;
        });

        res.json({
            product: {
                id: updated.id,
                code: updated.code,
                name: updated.name,
                sku: updated.sku,
                qr: updated.qr,
                barcode: updated.qr,
                categoryId: updated.categoryId,
                description: updated.description,
                imageDataUrl: updated.imageDataUrl,
                sellingPrice: String(updated.sellingPrice),
                costPrice: String(updated.costPrice),
                status: updated.status,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            },
        });
    })
);

productsRouter.delete(
    '/products/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        requireWriteRole(req);
        const id = String(req.params.id || '');
        if (!id) throw httpError(400, 'MissingId');

        try {
            await prisma.$transaction(async (tx) => {
                await tx.branchStock.deleteMany({ where: { productId: id } });
                await tx.product.delete({ where: { id } });
            });
        } catch {
            throw httpError(400, 'ProductDeleteFailed');
        }

        res.json({ ok: true });
    })
);

productsRouter.get(
    '/products/by-qr/:qr',
    requireAuth,
    asyncHandler(async (req, res) => {
        const qr = String(req.params.qr || '');
        if (!qr) throw httpError(400, 'MissingQr');

        const product = await prisma.product.findFirst({ where: { qr } });
        if (!product) throw httpError(404, 'ProductNotFound');

        res.json({
            product: {
                id: product.id,
                code: product.code,
                name: product.name,
                sku: product.sku,
                qr: product.qr,
                barcode: product.qr,
                categoryId: product.categoryId,
                description: product.description,
                imageDataUrl: product.imageDataUrl,
                sellingPrice: String(product.sellingPrice),
                costPrice: String(product.costPrice),
                status: product.status,
            },
        });
    })
);
