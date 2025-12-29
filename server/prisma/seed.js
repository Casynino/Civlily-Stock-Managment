import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    const mainBranch = await prisma.branch.upsert({
        where: { name: 'Main Branch' },
        update: {},
        create: { name: 'Main Branch', manager: 'Nino', status: 'Active' },
    });

    const eastBranch = await prisma.branch.upsert({
        where: { name: 'East Branch' },
        update: {},
        create: { name: 'East Branch', manager: 'Asha', status: 'Active' },
    });

    const adminPass = await bcrypt.hash('Admin123!', 10);
    await prisma.staff.upsert({
        where: { staffId: 'ADMIN001' },
        update: {},
        create: {
            staffId: 'ADMIN001',
            name: 'Admin',
            email: 'admin@civlily.local',
            passwordHash: adminPass,
            role: 'ADMIN',
            branchId: mainBranch.id,
            status: 'Active',
        },
    });

    const cashierPass = await bcrypt.hash('Cashier123!', 10);
    await prisma.staff.upsert({
        where: { staffId: 'CLSTAFF01' },
        update: {},
        create: {
            staffId: 'CLSTAFF01',
            name: 'Cashier',
            email: 'cashier@civlily.local',
            passwordHash: cashierPass,
            role: 'CASHIER',
            branchId: mainBranch.id,
            status: 'Active',
        },
    });

    const p1 = await prisma.product.upsert({
        where: { sku: 'PRD003' },
        update: { name: '108mm Smoking Paper', qr: 'PRD003', sellingPrice: '1000', costPrice: '600', status: 'Active' },
        create: {
            name: '108mm Smoking Paper',
            sku: 'PRD003',
            qr: 'PRD003',
            sellingPrice: '1000',
            costPrice: '600',
            status: 'Active',
        },
    });

    await prisma.branchStock.upsert({
        where: { branchId_productId: { branchId: mainBranch.id, productId: p1.id } },
        update: { quantity: 200 },
        create: { branchId: mainBranch.id, productId: p1.id, quantity: 200 },
    });

    await prisma.branchStock.upsert({
        where: { branchId_productId: { branchId: eastBranch.id, productId: p1.id } },
        update: { quantity: 0 },
        create: { branchId: eastBranch.id, productId: p1.id, quantity: 0 },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('Seed complete');
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
