import { z } from "zod";

const queueEnvSchema = z.object({
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
});

const parsed = queueEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid queue environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const queueEnv = parsed.data;

export const bullMqConnection = {
  host: queueEnv.REDIS_HOST,
  port: queueEnv.REDIS_PORT,
};
