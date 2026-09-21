import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The Prisma CLI resolves relative SQLite paths against the `prisma/` directory,
 * but the generated client resolves them against the process cwd. Normalize to
 * an absolute path so both the CLI and the app point at the same file.
 */
function resolveDatasourceUrl(url: string | undefined): string {
  const value = url ?? "";
  if (value.startsWith("file:") && !value.startsWith("file:/")) {
    const relativePath = value.slice("file:".length);
    const absolutePath = path
      .resolve(process.cwd(), "prisma", relativePath)
      .replace(/\\/g, "/");
    return `file:${absolutePath}`;
  }
  return value;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatasourceUrl(process.env.DATABASE_URL),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
