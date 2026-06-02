import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let realPrisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (realPrisma) return realPrisma;

  if (globalForPrisma.prisma) {
    realPrisma = globalForPrisma.prisma;
    return realPrisma;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("⚠️ DATABASE_URL environment variable is not defined! Prisma operations will fail if executed.");
  }

  realPrisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl || "",
      },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = realPrisma;
  }

  return realPrisma;
}

// Export a Proxy that lazily initializes PrismaClient and throws an informative error at query-time if keys are missing
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // Avoid intercepting inspection properties or standard JS methods if needed, but do runtime check for database query properties
    if (prop !== "then" && prop !== "toJSON" && typeof prop === "string" && !prop.startsWith("_")) {
      if (!process.env.DATABASE_URL) {
        throw new Error("پایگاه داده به درستى پیکربندى نشده است. لطفاً متغیر DATABASE_URL را تنظیم کنید.");
      }
    }
    const client = getPrismaClient();
    const val = Reflect.get(client, prop, receiver);
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

