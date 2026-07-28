import type { User } from "../../generated/prisma/client.js";
import type { RegisterInput, LoginInput, UserDto } from "@job-tracker/shared";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import { hashPassword, verifyPassword, needsRehash } from "../../lib/password.js";
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiry } from "./token.service.js";
import type { AuthRepository } from "./auth.repository.js";

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export function createAuthService(
  repo: AuthRepository,
  log: { warn: (o: object, m: string) => void },
) {
  async function issueRefreshToken(userId: string) {
    const token = generateRefreshToken();
    await repo.storeRefreshToken(userId, hashRefreshToken(token), refreshTokenExpiry());
    return token;
  }

  return {
    async register(input: RegisterInput) {
      const existing = await repo.findUserByEmail(input.email);
      if (existing) throw new ConflictError("Email already registered");

      const user = await repo.createUser(
        input.email,
        await hashPassword(input.password),
        input.displayName,
      );

      return { user, refreshToken: await issueRefreshToken(user.id) };
    },

    async login(input: LoginInput) {
      const user = await repo.findUserByEmail(input.email);

      if (!user) {
        // wyrównanie czasu odpowiedzi — bez tego brak konta odpowiada zauważalnie szybciej
        await hashPassword(input.password);
        throw new UnauthorizedError("Invalid email or password");
      }

      if (!(await verifyPassword(user.passwordHash, input.password))) {
        throw new UnauthorizedError("Invalid email or password");
      }

      if (needsRehash(user.passwordHash)) {
        await repo.updatePasswordHash(user.id, await hashPassword(input.password));
      }

      return { user, refreshToken: await issueRefreshToken(user.id) };
    },

    async refresh(presentedToken: string) {
      const stored = await repo.findRefreshToken(hashRefreshToken(presentedToken));

      if (!stored) throw new UnauthorizedError("Invalid refresh token");

      if (stored.revokedAt) {
        // token już zużyty — ktoś odtwarza skradzioną wartość
        await repo.revokeAllForUser(stored.userId);
        log.warn({ userId: stored.userId }, "refresh token reuse detected, all sessions revoked");
        throw new UnauthorizedError("Refresh token reuse detected");
      }

      if (stored.expiresAt < new Date()) throw new UnauthorizedError("Refresh token expired");

      const user = await repo.findUserById(stored.userId);
      if (!user) throw new UnauthorizedError("Invalid refresh token");

      await repo.revokeRefreshToken(stored.id);

      return { user, refreshToken: await issueRefreshToken(user.id) };
    },

    async logout(presentedToken: string | undefined) {
      if (!presentedToken) return;
      const stored = await repo.findRefreshToken(hashRefreshToken(presentedToken));
      if (stored && !stored.revokedAt) await repo.revokeRefreshToken(stored.id);
    },

    async logoutAll(userId: string) {
      await repo.revokeAllForUser(userId);
    },

    async me(userId: string) {
      const user = await repo.findUserById(userId);
      if (!user) throw new UnauthorizedError();
      return toUserDto(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
