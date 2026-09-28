import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  if (process.env.VERCEL) {
    const dest = "/tmp/customer-loger.db";
    const src = path.join(process.cwd(), "prisma", "build.db");
    try {
      if (!existsSync("/tmp")) mkdirSync("/tmp", { recursive: true });
      if (!existsSync(dest) && existsSync(src)) copyFileSync(src, dest);
    } catch {
      // Schema is applied at build time; a missing copy still allows login pages to render.
    }
    return `file:${dest}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
}

process.env.DATABASE_URL = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
