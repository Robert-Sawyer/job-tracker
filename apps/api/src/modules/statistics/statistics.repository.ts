import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { DashboardStatistics } from "@job-tracker/shared";

type ApplicationsOverTimeRow = DashboardStatistics["applicationsOverTime"][number];
type StatusConversionRow = DashboardStatistics["statusConversion"][number];
type ResponseTimeRow = Pick<DashboardStatistics, "averageResponseTimeHours">;

export function createStatisticsRepository(prisma: PrismaClient) {
  return {
    async getDashboard(userId: string): Promise<DashboardStatistics> {
      const [applicationsOverTime, statusConversion, responseTime] = await prisma.$transaction([
        prisma.$queryRaw<ApplicationsOverTimeRow[]>(Prisma.sql`
          WITH days AS (
            SELECT generate_series(
              CURRENT_DATE - INTERVAL '29 days',
              CURRENT_DATE,
              INTERVAL '1 day'
            )::date AS day
          ),
          daily AS (
            SELECT a."createdAt"::date AS day, COUNT(*)::int AS count
            FROM "applications" a
            WHERE a."userId" = ${userId}::uuid
              AND a."createdAt" >= CURRENT_DATE - INTERVAL '29 days'
            GROUP BY a."createdAt"::date
          ),
          series AS (
            SELECT days.day, COALESCE(daily.count, 0)::int AS count
            FROM days
            LEFT JOIN daily ON daily.day = days.day
          )
          SELECT
            TO_CHAR(day, 'YYYY-MM-DD') AS date,
            count,
            CASE
              WHEN MAX(count) OVER () = 0 THEN 0
              ELSE ROUND((count::numeric / MAX(count) OVER ()) * 100)::int
            END AS percentage
          FROM series
          ORDER BY day
        `),
        prisma.$queryRaw<StatusConversionRow[]>(Prisma.sql`
          WITH status_order(status, sort_order) AS (
            VALUES
              ('saved'::"ApplicationStatus", 1),
              ('applied'::"ApplicationStatus", 2),
              ('interview'::"ApplicationStatus", 3),
              ('offer'::"ApplicationStatus", 4),
              ('rejected'::"ApplicationStatus", 5)
          ),
          counts AS (
            SELECT a.status, COUNT(*)::int AS count
            FROM "applications" a
            WHERE a."userId" = ${userId}::uuid
            GROUP BY a.status
          ),
          total AS (
            SELECT COALESCE(SUM(count), 0)::int AS count FROM counts
          )
          SELECT
            status_order.status::text AS status,
            COALESCE(counts.count, 0)::int AS count,
            CASE
              WHEN total.count = 0 THEN 0
              ELSE ROUND((COALESCE(counts.count, 0)::numeric / total.count) * 100)::int
            END AS percentage
          FROM status_order
          LEFT JOIN counts ON counts.status = status_order.status
          CROSS JOIN total
          ORDER BY status_order.sort_order
        `),
        prisma.$queryRaw<ResponseTimeRow[]>(Prisma.sql`
          WITH applied AS (
            SELECT sc."applicationId", MIN(sc."changedAt") AS "appliedAt"
            FROM "status_changes" sc
            INNER JOIN "applications" a ON a.id = sc."applicationId"
            WHERE a."userId" = ${userId}::uuid
              AND sc."toStatus" = 'applied'::"ApplicationStatus"
            GROUP BY sc."applicationId"
          ),
          responses AS (
            SELECT applied."applicationId", applied."appliedAt", MIN(sc."changedAt") AS "respondedAt"
            FROM applied
            INNER JOIN "status_changes" sc
              ON sc."applicationId" = applied."applicationId"
              AND sc."changedAt" >= applied."appliedAt"
              AND sc."toStatus" IN (
                'interview'::"ApplicationStatus",
                'offer'::"ApplicationStatus",
                'rejected'::"ApplicationStatus"
              )
            GROUP BY applied."applicationId", applied."appliedAt"
          )
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM ("respondedAt" - "appliedAt")) / 3600))::int
            AS "averageResponseTimeHours"
          FROM responses
        `),
      ]);

      return {
        applicationsOverTime,
        statusConversion,
        averageResponseTimeHours: responseTime[0]?.averageResponseTimeHours ?? null,
      };
    },
  };
}

export type StatisticsRepository = ReturnType<typeof createStatisticsRepository>;
