export function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (min == null && max == null) return "—";

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "PLN",
      maximumFractionDigits: 0,
    }).format(v);

  if (min != null && max != null) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return min != null ? `from ${fmt(min)}` : `up to ${fmt(max!)}`;
}
