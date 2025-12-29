import { Router } from 'express';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const productsRouter = Router();

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
                name: product.name,
                sku: product.sku,
                qr: product.qr,
                sellingPrice: String(product.sellingPrice),
                costPrice: String(product.costPrice),
                status: product.status,
            },
        });
    })
);
