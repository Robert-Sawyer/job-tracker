import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = databaseEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid database environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const databaseEnv = parsed.data;
