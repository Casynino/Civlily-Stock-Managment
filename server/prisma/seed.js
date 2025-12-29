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
