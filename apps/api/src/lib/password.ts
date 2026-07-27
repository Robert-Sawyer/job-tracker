import { argon2id, hash, needsRehash as argonNeedsRehash, verify, type HashOptions } from "argon2";

const OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 19_456, // 19 MiB, OWASP recommendation
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await verify(hash, plain);
  } catch {
    return false;
  }
}

export function needsRehash(hash: string): boolean {
  return argonNeedsRehash(hash, OPTIONS);
}
