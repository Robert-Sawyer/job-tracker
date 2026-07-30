import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset " +
  "placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50";

function ring(invalid: boolean): string {
  return invalid ? "ring-rose-400 focus:ring-rose-500" : "ring-slate-300";
}

export function Input({
  invalid = false,
  className,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid} className={cn(base, ring(invalid), className)} />;
}

export function Textarea({
  invalid = false,
  className,
  ...props
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea {...props} aria-invalid={invalid} className={cn(base, ring(invalid), className)} />
  );
}

export function Select({
  invalid = false,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalid}
      className={cn(base, ring(invalid), "pr-8", className)}
    >
      {children}
    </select>
  );
}
