"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import type { ChallengeProgress, CustomTask } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

interface ChecklistStateResponse {
  customTasks?: CustomTask[];
  todayCompleted?: string[];
  progress?: ChallengeProgress | null;
  currentDay?: number;
  isAllDone?: boolean;
  error?: string;
}

export function useChecklist(groupId: string | undefined) {
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const authRetryRef = useRef(false);

  const isAllDone = useMemo(
    () => DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key)),
    [todayCompleted]
  );

  const applyState = useCallback((payload: ChecklistStateResponse) => {
    setTodayCompleted(payload.todayCompleted ?? []);
    setCustomTasks(payload.customTasks ?? []);
    setProgress((payload.progress as ChallengeProgress | null | undefined) ?? null);
    setCurrentDay(Number(payload.currentDay ?? 0));
  }, []);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (groupId) {
        params.set("groupId", groupId);
      }

      const response = await fetch(`/api/checklist?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Timezone": timezone },
        credentials: "same-origin",
      });

      if (response.status === 401) {
        // On fast redirects after sign-in, cookies can land a moment later.
        if (!authRetryRef.current) {
          authRetryRef.current = true;
          setTimeout(() => {
            void loadState();
          }, 700);
        }

        setTodayCompleted([]);
        setCustomTasks([]);
        setProgress(null);
        setCurrentDay(0);
        setLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as ChecklistStateResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Could not load checklist.");
      }

      authRetryRef.current = false;
      applyState(payload);
    } catch (error) {
      console.error("Error loading checklist:", error);
      toast.error("Could not load checklist data.");
    } finally {
      setLoading(false);
    }
  }, [applyState, groupId, timezone, toast]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    authRetryRef.current = false;
  }, [groupId]);

  const postAction = useCallback(
    async (payload: Record<string, unknown>, fallbackError: string) => {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Timezone": timezone },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as ChecklistStateResponse;
      if (!response.ok) {
        throw new Error(data.error || fallbackError);
      }

      applyState(data);
      return data;
    },
    [applyState, timezone]
  );

  const toggleTask = async (taskKey: string) => {
    if (!groupId) return;

    try {
      await postAction(
        {
          action: "toggleTask",
          groupId,
          taskKey,
        },
        "Could not update task."
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const addNote = async (taskKey: string, note: string) => {
    if (!groupId) return;

    try {
      await postAction(
        {
          action: "addNote",
          groupId,
          taskKey,
          note,
        },
        "Could not save note."
      );
      toast.success("Note saved.");
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error(error instanceof Error ? error.message : "Could not save note.");
    }
  };

  const addCustomTask = async (name: string, emoji: string) => {
    try {
      await postAction(
        {
          action: "addCustomTask",
          groupId,
          name,
          emoji,
        },
        "Could not add custom task."
      );
      toast.success("Custom task added.");
    } catch (error) {
      console.error("Error adding custom task:", error);
      toast.error(error instanceof Error ? error.message : "Could not add custom task.");
    }
  };

  const removeCustomTask = async (id: string) => {
    try {
      await postAction(
        {
          action: "removeCustomTask",
          groupId,
          id,
        },
        "Could not remove custom task."
      );
      toast.success("Custom task removed.");
    } catch (error) {
      console.error("Error removing custom task:", error);
      toast.error(error instanceof Error ? error.message : "Could not remove custom task.");
    }
  };

  return {
    completions: todayCompleted,
    todayCompleted,
    customTasks,
    loading,
    toggleTask,
    addNote,
    addCustomTask,
    removeCustomTask,
    isAllDone,
    currentDay,
    progress,
    refreshChecklist: loadState,
  };
}
