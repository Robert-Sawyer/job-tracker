import type { StatisticsRepository } from "./statistics.repository.js";

export function createStatisticsService(repo: StatisticsRepository) {
  return {
    dashboard(userId: string) {
      return repo.getDashboard(userId);
    },
  };
}
