"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listFollowUpReminders, markReminderRead } from "@/lib/api/reminders";

export const followUpReminderKeys = {
  all: ["follow-up-reminders"] as const,
};

export function useFollowUpReminders() {
  return useQuery({
    queryKey: followUpReminderKeys.all,
    queryFn: listFollowUpReminders,
  });
}

export function useMarkReminderRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markReminderRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: followUpReminderKeys.all }),
  });
}
