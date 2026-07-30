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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || z.url().safeParse(v).success, "Enter a valid URL")
  .transform((v) => (v === "" ? null : v));

const optionalInt = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+$/.test(v), "Enter a whole number")
  .transform((v) => (v === "" ? null : Number(v)));

const optionalCurrency = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^[A-Z]{3}$/.test(v), "Use a 3-letter code, e.g. PLN")
  .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00.000Z`).toISOString()));

export const applicationFormSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required").max(200),
    position: z.string().trim().min(1, "Position is required").max(200),
    status: applicationStatusSchema,
    url: optionalUrl,
    source: optionalText(100),
    location: optionalText(200),
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    currency: optionalCurrency,
    notes: optionalText(10_000),
    appliedAt: optionalDate,
  })
  .refine((v) => v.salaryMin === null || v.salaryMax === null || v.salaryMin <= v.salaryMax, {
    message: "Minimum salary must not exceed maximum",
    path: ["salaryMin"],
  });

export type ApplicationFormInput = z.input<typeof applicationFormSchema>;
export type ApplicationFormValues = z.output<typeof applicationFormSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ApplicationDto = z.infer<typeof applicationSchema>;
