"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const nanoid_1 = require("nanoid");
const prisma = new client_1.PrismaClient();
async function main() {
    const admin = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        create: { email: "admin@example.com", name: "Admin User" },
        update: {},
    });
    const member = await prisma.user.upsert({
        where: { email: "member@example.com" },
        create: { email: "member@example.com", name: "Member User" },
        update: {},
    });
    const mess = await prisma.mess.upsert({
        where: { username: "demo-mess" },
        create: {
            name: "Demo Mess",
            username: "demo-mess",
            description: "Seed data for local development",
            joinCode: (0, nanoid_1.nanoid)(8),
            createdById: admin.id,
            settings: { create: {} },
            memberships: {
                create: [
                    { userId: admin.id, role: "ADMIN" },
                    { userId: member.id, role: "MEMBER" },
                ],
            },
        },
        update: {},
    });
    const now = new Date();
    await prisma.accountingPeriod.upsert({
        where: { messId_year_month: { messId: mess.id, year: now.getFullYear(), month: now.getMonth() + 1 } },
        create: {
            messId: mess.id,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
            status: "OPEN",
        },
        update: {},
    });
    // eslint-disable-next-line no-console
    console.log("Seeded:", { mess: mess.username, joinCode: mess.joinCode });
}
main()
    .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
})
    .finally(async () => prisma.$disconnect());
//# sourceMappingURL=seed.js.map