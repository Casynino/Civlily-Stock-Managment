import jwt from 'jsonwebtoken';

import { httpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req, _res, next) {
    try {
        const header = String(req.headers.authorization || '');
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return next(httpError(401, 'Unauthorized'));

        const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
        const staffId = String(payload?.staffId || '');
        if (!staffId) return next(httpError(401, 'Unauthorized'));

        const staff = await prisma.staff.findUnique({ where: { id: staffId } });
        if (!staff) return next(httpError(401, 'Unauthorized'));
        if (String(staff.status || '').toLowerCase() !== 'active') return next(httpError(403, 'InactiveAccount'));

        req.user = {
            id: staff.id,
            staffId: staff.staffId,
            role: staff.role,
            branchId: staff.branchId,
            name: staff.name,
            email: staff.email,
        };

        return next();
    } catch (e) {
        return next(httpError(401, 'Unauthorized'));
    }
}

export function requireRole(roles) {
    const allowed = Array.isArray(roles) ? roles : [];
    return (req, _res, next) => {
        const r = String(req.user?.role || '').toUpperCase();
        if (!allowed.includes(r)) return next(httpError(403, 'Forbidden'));
        return next();
    };
}

export function resolveBranchScope(req) {
    const role = String(req.user?.role || '').toUpperCase();
    const headerBranch = String(req.headers['x-branch-id'] || '').trim();

    if (role === 'ADMIN') return headerBranch || String(req.user?.branchId || '');
    return String(req.user?.branchId || '');
}
