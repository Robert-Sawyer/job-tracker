import type { PrismaClient } from "../../generated/prisma/client.js";

export interface HealthReport {
  status: "ok" | "degraded";
  uptime: number;
  checks: { database: "up" | "down" };
}

export function createHealthService(prisma: PrismaClient) {
  return {
    async check(): Promise<HealthReport> {
      let database: "up" | "down" = "up";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = "down";
      }

      return {
        status: database === "up" ? "ok" : "degraded",
        uptime: Math.round(process.uptime()),
        checks: { database },
      };
    },
  };
}
