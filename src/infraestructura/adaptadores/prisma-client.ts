import { PrismaClient } from '@prisma/client';

// Singleton de PrismaClient. En desarrollo, Next.js recarga módulos en caliente
// y sin este patrón se abrirían decenas de conexiones a la base de datos.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
