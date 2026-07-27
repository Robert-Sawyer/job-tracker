import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: "Password must contain lowercase, uppercase and a digit",
  });

export const registerSchema = z.object({
  email: z.email().max(254).toLowerCase(),
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
});

export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  createdAt: z.date(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: userDtoSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserDto = z.infer<typeof userDtoSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
