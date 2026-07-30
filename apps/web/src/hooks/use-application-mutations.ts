"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationDto,
  ChangeStatusInput,
  CreateApplicationInput,
  Paginated,
  UpdateApplicationInput,
} from "@job-tracker/shared";
import {
  createApplication,
  deleteApplication,
  changeStatus,
  updateApplication,
} from "@/lib/api/applications";
import { applicationKeys } from "./use-applications";
import { dashboardStatisticsKeys } from "./use-dashboard-statistics";

type ListSnapshot = Array<[readonly unknown[], Paginated<ApplicationDto> | undefined]>;

function invalidateApplicationData(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardStatisticsKeys.all }),
  ]);
}

function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function toDtoPatch(input: UpdateApplicationInput): Partial<ApplicationDto> {
  const { appliedAt, ...rest } = input;
  const patch = definedOnly(rest) as Partial<ApplicationDto>;
  if (appliedAt !== undefined) {
    patch.appliedAt = appliedAt === null ? null : new Date(appliedAt);
  }
  patch.updatedAt = new Date();
  return patch;
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApplicationInput) => createApplication(input),
    onSuccess: () => invalidateApplicationData(queryClient),
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateApplicationInput }) =>
      updateApplication(id, input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() });
      const snapshot: ListSnapshot = queryClient.getQueriesData<Paginated<ApplicationDto>>({
        queryKey: applicationKeys.lists(),
      });
      const patch = toDtoPatch(input);

      queryClient.setQueriesData<Paginated<ApplicationDto>>(
        { queryKey: applicationKeys.lists() },
        (old) =>
          old === undefined
            ? old
            : {
                ...old,
                items: old.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
              },
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => invalidateApplicationData(queryClient),
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChangeStatusInput }) =>
      changeStatus(id, input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() });
      const snapshot: ListSnapshot = queryClient.getQueriesData<Paginated<ApplicationDto>>({
        queryKey: applicationKeys.lists(),
      });

      queryClient.setQueriesData<Paginated<ApplicationDto>>(
        { queryKey: applicationKeys.lists() },
        (old) =>
          old === undefined
            ? old
            : {
                ...old,
                items: old.items.map((item) =>
                  item.id === id ? { ...item, status: input.status, updatedAt: new Date() } : item,
                ),
              },
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => invalidateApplicationData(queryClient),
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() });
      const snapshot: ListSnapshot = queryClient.getQueriesData<Paginated<ApplicationDto>>({
        queryKey: applicationKeys.lists(),
      });

      queryClient.setQueriesData<Paginated<ApplicationDto>>(
        { queryKey: applicationKeys.lists() },
        (old) => {
          if (old === undefined) return old;
          const items = old.items.filter((item) => item.id !== id);
          if (items.length === old.items.length) return old;
          return { ...old, items, meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) } };
        },
      );

      return { snapshot };
    },

    onError: (_error, _id, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => invalidateApplicationData(queryClient),
  });
}
