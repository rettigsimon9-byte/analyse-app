/* eslint-disable @typescript-eslint/no-require-imports */
// PrismaClient is generated at build time — types only available after `prisma generate`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PrismaClient } = require('@prisma/client') as { PrismaClient: any };

const globalForPrisma = globalThis as unknown as { prisma: typeof PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
