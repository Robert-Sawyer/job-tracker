import type { PrismaClient } from "../../generated/prisma/client.js";

export function createAuthRepository(prisma: PrismaClient) {
  return {
    findUserByEmail(email: string) {
      return prisma.user.findUnique({ where: { email } });
    },

    findUserById(id: string) {
      return prisma.user.findUnique({ where: { id } });
    },

    createUser(email: string, passwordHash: string, displayName?: string) {
      return prisma.user.create({
        data: { email, passwordHash, displayName: displayName ?? null },
      });
    },

    updatePasswordHash(id: string, passwordHash: string) {
      return prisma.user.update({ where: { id }, data: { passwordHash } });
    },

    storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
      return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    },

    findRefreshToken(tokenHash: string) {
      return prisma.refreshToken.findUnique({ where: { tokenHash } });
    },

    revokeRefreshToken(id: string) {
      return prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    },

    revokeAllForUser(userId: string) {
      return prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },

    deleteExpired() {
      return prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
