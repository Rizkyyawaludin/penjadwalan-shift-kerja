import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

// Versi skema saat ini (diperbarui agar cache globalThis.prisma lama di Next.js dev server otomatis di-reset)
const CURRENT_SCHEMA_VERSION = "v7-kaggle-dataset-1";

if (globalForPrisma.prismaVersion !== CURRENT_SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaVersion = CURRENT_SCHEMA_VERSION;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
