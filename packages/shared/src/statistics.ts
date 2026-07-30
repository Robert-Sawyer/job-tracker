import { z } from "zod";
import { applicationStatusSchema } from "./application.js";

export const dashboardStatisticsSchema = z.object({
  applicationsOverTime: z.array(
    z.object({
      date: z.string().date(),
      count: z.number().int().nonnegative(),
      percentage: z.number().int().min(0).max(100),
    }),
  ),
  statusConversion: z.array(
    z.object({
      status: applicationStatusSchema,
      count: z.number().int().nonnegative(),
      percentage: z.number().int().min(0).max(100),
    }),
  ),
  averageResponseTimeHours: z.number().int().nonnegative().nullable(),
});

export type DashboardStatistics = z.infer<typeof dashboardStatisticsSchema>;
