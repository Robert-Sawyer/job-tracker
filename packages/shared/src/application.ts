import { z } from "zod";
import { paginationQuerySchema } from "./pagination.js";
import { APPLICATION_STATUSES } from "./status.js";

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

const baseFields = {
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  url: z.string().max(2000).nullish(),
  source: z.string().trim().max(100).nullish(),
  location: z.string().trim().max(200).nullish(),
  salaryMin: z.number().int().nonnegative().nullish(),
  salaryMax: z.number().int().nonnegative().nullish(),
  currency: z.string().length(3).toUpperCase().nullish(),
  notes: z.string().max(10_000).nullish(),
  appliedAt: z.iso.datetime().nullish(),
};

export const createApplicationSchema = z
  .object({
    ...baseFields,
    status: applicationStatusSchema.default("saved"),
  })
  .refine((v) => v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax, {
    message: "salaryMin must not exceed salaryMax",
    path: ["salaryMin"],
  });

export const updateApplicationSchema = z
  .object({ ...baseFields, status: applicationStatusSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const changeStatusSchema = z.object({
  status: applicationStatusSchema,
  note: z.string().max(500).nullish(),
});

export const applicationIdParamSchema = z.object({ id: z.uuid() });

export const listApplicationsQuerySchema = paginationQuerySchema.extend({
  status: z
    .union([applicationStatusSchema, z.array(applicationStatusSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(["createdAt", "updatedAt", "appliedAt", "company", "position"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const applicationSchema = z.object({
  id: z.uuid(),
  company: z.string(),
  position: z.string(),
  url: z.string().nullable(),
  source: z.string().nullable(),
  location: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string().nullable(),
  status: applicationStatusSchema,
  notes: z.string().nullable(),
  appliedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ApplicationDto = z.infer<typeof applicationSchema>;
