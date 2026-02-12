"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import type {
  TaskCompletion,
  ChallengeProgress,
  CustomTask,
} from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

const REQUEST_TIMEOUT_MS = 12000;

export function useChecklist(groupId: string | undefined) {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const today = format(new Date(), "yyyy-MM-dd");

  const withTimeout = useCallback(async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const currentDay = progress?.current_day ?? 0;
  const isAllDone = DEFAULT_TASK_KEYS.every((key) =>
    todayCompleted.includes(key)
  );

  const fetchCompletions = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), "Loading user for checklist");

      if (!user || !groupId) return;

      const { data, error } = await withTimeout(
        supabase
          .from("task_completions")
          .select("*")
          .eq("user_id", user.id)
          .eq("group_id", groupId)
          .eq("date", today),
        "Loading task completions"
      );

      if (error) {
        console.error("Error fetching completions:", error);
        toast.error("Could not load today’s checklist.");
        return;
      }

      const completionData = (data ?? []) as TaskCompletion[];
      setCompletions(completionData);
      setTodayCompleted(completionData.map((c) => c.task_key));
    } catch (error) {
      console.error("Error loading completions:", error);
      toast.error("Could not load today’s checklist.");
    }
  }, [supabase, groupId, today, toast, withTimeout]);

  const fetchProgress = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), "Loading user progress");

      if (!user || !groupId) return;

      const { data, error } = await withTimeout(
        supabase
          .from("challenge_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("group_id", groupId)
          .single(),
        "Loading challenge progress"
      );

      if (error) {
        console.error("Error fetching progress:", error);
        toast.error("Could not load progress.");
        return;
      }

      setProgress(data as ChallengeProgress);
    } catch (error) {
      console.error("Error loading progress:", error);
      toast.error("Could not load progress.");
    }
  }, [supabase, groupId, toast, withTimeout]);

  const fetchCustomTasks = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), "Loading user custom tasks");

      if (!user) return;

      const { data, error } = await withTimeout(
        supabase
          .from("custom_tasks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        "Loading custom tasks"
      );

      if (error) {
        console.error("Error fetching custom tasks:", error);
        toast.error("Could not load custom tasks.");
        return;
      }

      setCustomTasks((data ?? []) as CustomTask[]);
    } catch (error) {
      console.error("Error loading custom tasks:", error);
      toast.error("Could not load custom tasks.");
    }
  }, [supabase, toast, withTimeout]);

  useEffect(() => {
    let isMounted = true;

    const failSafeId = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      console.warn("Checklist loading timeout reached; continuing with fallback state.");
    }, REQUEST_TIMEOUT_MS + 2000);

    const loadAll = async () => {
      setLoading(true);

      try {
        await fetchCustomTasks();

        if (groupId) {
          await Promise.allSettled([fetchCompletions(), fetchProgress()]);
        } else {
          setCompletions([]);
          setTodayCompleted([]);
          setProgress(null);
        }
      } catch (error) {
        console.error("Error loading checklist data:", error);
        toast.error("Could not load checklist data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadAll();

    return () => {
      isMounted = false;
      clearTimeout(failSafeId);
    };
  }, [groupId, fetchCompletions, fetchProgress, fetchCustomTasks, toast]);

  // Subscribe to realtime changes on task_completions for this group
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`task_completions:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_completions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void fetchCompletions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, fetchCompletions]);

  const checkAndAdvanceDay = useCallback(
    async (updatedCompleted: string[]) => {
      const allDone = DEFAULT_TASK_KEYS.every((key) =>
        updatedCompleted.includes(key)
      );

      if (!allDone || !progress || !groupId) return;

      // Only advance if we haven't already completed today
      if (progress.last_completed_date === today) return;

      const newDay = Math.min(progress.current_day + 1, TOTAL_DAYS);

      const { error } = await supabase
        .from("challenge_progress")
        .update({
          current_day: newDay,
          last_completed_date: today,
        })
        .eq("id", progress.id);

      if (error) {
        console.error("Error advancing day:", error);
        toast.error("Failed to update your challenge day.");
        return;
      }

      setProgress((prev) =>
        prev
          ? { ...prev, current_day: newDay, last_completed_date: today }
          : prev
      );
      toast.success(`Day ${newDay} completed.`);
    },
    [progress, groupId, today, supabase, toast]
  );

  const toggleTask = async (taskKey: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !groupId) return;

    const isCompleted = todayCompleted.includes(taskKey);

    if (isCompleted) {
      // Delete the completion
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .eq("task_key", taskKey)
        .eq("date", today);

      if (error) {
        console.error("Error removing completion:", error);
        toast.error("Could not uncheck task.");
        return;
      }

      const updated = todayCompleted.filter((k) => k !== taskKey);
      setTodayCompleted(updated);
      setCompletions((prev) => prev.filter((c) => c.task_key !== taskKey));
    } else {
      // Insert the completion
      const { data, error } = await supabase
        .from("task_completions")
        .insert({
          user_id: user.id,
          group_id: groupId,
          task_key: taskKey,
          date: today,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding completion:", error);
        toast.error("Could not complete task.");
        return;
      }

      const updated = [...todayCompleted, taskKey];
      setTodayCompleted(updated);
      setCompletions((prev) => [...prev, data as TaskCompletion]);

      // Check if all tasks are now done
      await checkAndAdvanceDay(updated);
    }
  };

  const addNote = async (taskKey: string, note: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !groupId) return;

    const { error } = await supabase
      .from("task_completions")
      .update({ note })
      .eq("user_id", user.id)
      .eq("group_id", groupId)
      .eq("task_key", taskKey)
      .eq("date", today);

    if (error) {
      console.error("Error adding note:", error);
      toast.error("Could not save note.");
      return;
    }

    setCompletions((prev) =>
      prev.map((c) => (c.task_key === taskKey ? { ...c, note } : c))
    );
  };

  const addCustomTask = async (name: string, emoji: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("custom_tasks")
      .insert({
        user_id: user.id,
        name,
        emoji,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding custom task:", error);
      toast.error("Could not add custom task.");
      return;
    }

    setCustomTasks((prev) => [...prev, data as CustomTask]);
    toast.success("Custom task added.");
  };

  const removeCustomTask = async (id: string) => {
    const { error } = await supabase
      .from("custom_tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing custom task:", error);
      toast.error("Could not remove custom task.");
      return;
    }

    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Custom task removed.");
  };

  return {
    completions,
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
  };
}
