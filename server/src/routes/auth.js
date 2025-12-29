import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
        const body = z
            .object({
                identifier: z.string().min(1),
                password: z.string().min(1),
            })
            .parse(req.body);

        const ident = body.identifier.trim().toLowerCase();
        const staff = await prisma.staff.findFirst({
            where: {
                OR: [{ staffId: { equals: body.identifier.trim(), mode: 'insensitive' } }, { email: ident }],
            },
        });

        if (!staff) throw httpError(401, 'InvalidCredentials');
        if (String(staff.status || '').toLowerCase() !== 'active') throw httpError(403, 'InactiveAccount');

        const ok = await bcrypt.compare(body.password, staff.passwordHash);
        if (!ok) throw httpError(401, 'InvalidCredentials');

        const token = jwt.sign(
            { staffId: staff.id, role: staff.role },
            process.env.JWT_SECRET || 'change-me',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            staff: {
                id: staff.id,
                staffId: staff.staffId,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                branchId: staff.branchId,
                status: staff.status,
            },
        });
    })
);

authRouter.get(
    '/auth/me',
    requireAuth,
    asyncHandler(async (req, res) => {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (!staff) throw httpError(401, 'Unauthorized');
        res.json({
            staff: {
                id: staff.id,
                staffId: staff.staffId,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                branchId: staff.branchId,
                status: staff.status,
            },
        });
    })
);
