import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { asyncHandler, httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function setSessionCookie(res, token) {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const sameSite = isProd ? 'None' : 'Lax';
    const parts = [
        `civlily_token=${encodeURIComponent(String(token || ''))}`,
        'Path=/',
        `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
        'HttpOnly',
        `SameSite=${sameSite}`,
    ];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const sameSite = isProd ? 'None' : 'Lax';
    const parts = [
        'civlily_token=',
        'Path=/',
        'Max-Age=0',
        'HttpOnly',
        `SameSite=${sameSite}`,
    ];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

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

        setSessionCookie(res, token);

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

authRouter.post(
    '/auth/logout',
    asyncHandler(async (_req, res) => {
        clearSessionCookie(res);
        res.json({ ok: true });
    })
);

authRouter.get(
    '/auth/me',
    requireAuth,
    asyncHandler(async (req, res) => {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (!staff) throw httpError(401, 'Unauthorized');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
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
