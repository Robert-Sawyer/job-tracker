import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import type { ListApplicationsQuery } from "@job-tracker/shared";

export function createApplicationRepository(prisma: PrismaClient) {
  function buildWhere(userId: string, q: ListApplicationsQuery): Prisma.ApplicationWhereInput {
    return {
      userId,
      ...(q.status?.length ? { status: { in: q.status } } : {}),
      ...(q.search
        ? {
            OR: [
              { company: { contains: q.search, mode: "insensitive" } },
              { position: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  return {
    async findMany(userId: string, q: ListApplicationsQuery) {
      const where = buildWhere(userId, q);

      const [items, total] = await prisma.$transaction([
        prisma.application.findMany({
          where,
          orderBy: { [q.sort]: q.order },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.application.count({ where }),
      ]);

      return { items, total };
    },

    findById(userId: string, id: string) {
      return prisma.application.findFirst({ where: { id, userId } });
    },

    create(userId: string, data: Prisma.ApplicationCreateWithoutUserInput) {
      return prisma.application.create({
        data: {
          ...data,
          ...(data.status === "applied" && data.appliedAt == null ? { appliedAt: new Date() } : {}),
          user: { connect: { id: userId } },
          statusChanges: { create: { fromStatus: null, toStatus: data.status ?? "saved" } },
        },
      });
    },

    update(id: string, data: Prisma.ApplicationUpdateInput) {
      return prisma.application.update({ where: { id }, data });
    },

    updateStatus(id: string, from: string | null, to: string, note?: string | null) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id },
          data: {
            status: to as never,
            ...(to === "applied" ? { appliedAt: new Date() } : {}),
          },
        });

        await tx.statusChange.create({
          data: {
            applicationId: id,
            fromStatus: from as never,
            toStatus: to as never,
            note: note ?? null,
          },
        });

        return updated;
      });
    },

    delete(id: string) {
      return prisma.application.delete({ where: { id } });
    },

    listStatusChanges(applicationId: string) {
      return prisma.statusChange.findMany({
        where: { applicationId },
        orderBy: { changedAt: "asc" },
      });
    },
  };
}

export type ApplicationRepository = ReturnType<typeof createApplicationRepository>;
