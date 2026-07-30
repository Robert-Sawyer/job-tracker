import type {
  ApplicationDto,
  ListApplicationsQuery,
  Paginated,
  CreateApplicationInput,
  UpdateApplicationInput,
  ChangeStatusInput,
} from "@job-tracker/shared";
import { apiFetch } from "../api-client.ts";

export function buildQueryString(query: Partial<ListApplicationsQuery>): string {
  const params = new URLSearchParams();

  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.limit && query.limit !== 20) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.sort && query.sort !== "createdAt") params.set("sort", query.sort);
  if (query.order && query.order !== "desc") params.set("order", query.order);
  for (const status of query.status ?? []) params.append("status", status);

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listApplications(query: Partial<ListApplicationsQuery>) {
  return apiFetch<Paginated<ApplicationDto>>(`/applications${buildQueryString(query)}`);
}

export function getApplication(id: string) {
  return apiFetch<ApplicationDto & { statusChanges: unknown[] }>(`/applications/${id}`);
}

export function createApplication(body: CreateApplicationInput) {
  return apiFetch<ApplicationDto>("/applications", { method: "POST", body });
}

export function updateApplication(id: string, body: UpdateApplicationInput) {
  return apiFetch<ApplicationDto>(`/applications/${id}`, { method: "PATCH", body });
}

export function changeStatus(id: string, body: ChangeStatusInput) {
  return apiFetch<ApplicationDto>(`/applications/${id}/status`, { method: "PATCH", body });
}

export function deleteApplication(id: string) {
  return apiFetch<void>(`/applications/${id}`, { method: "DELETE" });
}
