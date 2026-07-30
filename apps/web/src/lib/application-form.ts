import type { ApplicationDto, ApplicationFormInput } from "@job-tracker/shared";

function toDateInput(value: Date | string | null): string {
  if (value === null) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export const emptyApplicationForm: ApplicationFormInput = {
  company: "",
  position: "",
  status: "saved",
  url: "",
  source: "",
  location: "",
  salaryMin: "",
  salaryMax: "",
  currency: "PLN",
  notes: "",
  appliedAt: "",
};

export function toFormInput(application: ApplicationDto): ApplicationFormInput {
  return {
    company: application.company,
    position: application.position,
    status: application.status,
    url: application.url ?? "",
    source: application.source ?? "",
    location: application.location ?? "",
    salaryMin: application.salaryMin === null ? "" : String(application.salaryMin),
    salaryMax: application.salaryMax === null ? "" : String(application.salaryMax),
    currency: application.currency ?? "",
    notes: application.notes ?? "",
    appliedAt: toDateInput(application.appliedAt),
  };
}
