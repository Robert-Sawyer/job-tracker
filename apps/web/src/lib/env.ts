import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid client environment: ${JSON.stringify(z.treeifyError(parsed.error))}`);
}

export const env = parsed.data;
