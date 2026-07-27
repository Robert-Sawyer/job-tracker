import { buildMeta } from "@job-tracker/shared";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ChangeStatusInput,
  ListApplicationsQuery,
} from "@job-tracker/shared";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import type { ApplicationRepository } from "./application.repository.js";

export function createApplicationService(repo: ApplicationRepository) {
  async function getOwned(userId: string, id: string) {
    const found = await repo.findById(userId, id);
    if (!found) throw new NotFoundError("Application");
    return found;
  }

  return {
    async list(userId: string, query: ListApplicationsQuery) {
      const { items, total } = await repo.findMany(userId, query);
      return { items, meta: buildMeta(total, query) };
    },

    async getById(userId: string, id: string) {
      const application = await getOwned(userId, id);
      const history = await repo.listStatusChanges(id);
      return { ...application, statusChanges: history };
    },

    create(userId: string, input: CreateApplicationInput) {
      return repo.create(userId, {
        ...input,
        appliedAt: input.appliedAt ? new Date(input.appliedAt) : null,
      });
    },

    async update(userId: string, id: string, input: UpdateApplicationInput) {
      const current = await getOwned(userId, id);

      const min = input.salaryMin ?? current.salaryMin;
      const max = input.salaryMax ?? current.salaryMax;
      if (min != null && max != null && min > max) {
        throw new ValidationError({ salaryMin: "must not exceed salaryMax" });
      }

      if (input.status && input.status !== current.status) {
        return repo.updateStatus(id, current.status, input.status);
      }

      return repo.update(id, {
        ...input,
        ...(input.appliedAt !== undefined
          ? { appliedAt: input.appliedAt ? new Date(input.appliedAt) : null }
          : {}),
      });
    },

    async changeStatus(userId: string, id: string, input: ChangeStatusInput) {
      const current = await getOwned(userId, id);
      if (current.status === input.status) return current;
      return repo.updateStatus(id, current.status, input.status, input.note);
    },

    async remove(userId: string, id: string) {
      await getOwned(userId, id);
      await repo.delete(id);
    },
  };
}

export type ApplicationService = ReturnType<typeof createApplicationService>;
