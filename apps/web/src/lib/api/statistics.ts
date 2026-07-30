import type { DashboardStatistics } from "@job-tracker/shared";
import { apiFetch } from "../api-client.ts";

export function getDashboardStatistics() {
  return apiFetch<DashboardStatistics>("/statistics/dashboard");
}
