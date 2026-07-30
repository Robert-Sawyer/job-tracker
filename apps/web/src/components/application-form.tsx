"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  APPLICATION_STATUSES,
  applicationFormSchema,
  type ApplicationFormInput,
  type ApplicationFormValues,
} from "@job-tracker/shared";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input, Select, Textarea } from "./ui/input";

export function ApplicationForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  serverError,
}: {
  defaultValues: ApplicationFormInput;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  serverError?: string | undefined;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormInput, unknown, ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      // React Query exposes the mutation error through `serverError` above.
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {serverError !== undefined ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="company" error={errors.company?.message}>
          <Input
            id="company"
            autoFocus
            invalid={errors.company !== undefined}
            {...register("company")}
          />
        </Field>

        <Field label="Position" htmlFor="position" error={errors.position?.message}>
          <Input id="position" invalid={errors.position !== undefined} {...register("position")} />
        </Field>

        <Field label="Status" htmlFor="status" error={errors.status?.message}>
          <Select id="status" invalid={errors.status !== undefined} {...register("status")}>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Applied on"
          htmlFor="appliedAt"
          error={errors.appliedAt?.message}
          hint="Leave empty if not applied yet"
        >
          <Input
            id="appliedAt"
            type="date"
            invalid={errors.appliedAt !== undefined}
            {...register("appliedAt")}
          />
        </Field>

        <Field label="Location" htmlFor="location" error={errors.location?.message}>
          <Input id="location" invalid={errors.location !== undefined} {...register("location")} />
        </Field>

        <Field
          label="Source"
          htmlFor="source"
          error={errors.source?.message}
          hint="e.g. pracuj.pl, referral"
        >
          <Input id="source" invalid={errors.source !== undefined} {...register("source")} />
        </Field>

        <Field label="Salary from" htmlFor="salaryMin" error={errors.salaryMin?.message}>
          <Input
            id="salaryMin"
            inputMode="numeric"
            invalid={errors.salaryMin !== undefined}
            {...register("salaryMin")}
          />
        </Field>

        <Field label="Salary to" htmlFor="salaryMax" error={errors.salaryMax?.message}>
          <Input
            id="salaryMax"
            inputMode="numeric"
            invalid={errors.salaryMax !== undefined}
            {...register("salaryMax")}
          />
        </Field>

        <Field label="Currency" htmlFor="currency" error={errors.currency?.message}>
          <Input
            id="currency"
            maxLength={3}
            invalid={errors.currency !== undefined}
            {...register("currency")}
          />
        </Field>

        <Field label="Offer URL" htmlFor="url" error={errors.url?.message}>
          <Input id="url" invalid={errors.url !== undefined} {...register("url")} />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={4} invalid={errors.notes !== undefined} {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
