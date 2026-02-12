"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import type {
  TaskCompletion,
  ChallengeProgress,
  CustomTask,
} from "@/lib/types";

export function useChecklist(groupId: string | undefined) {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const today = format(new Date(), "yyyy-MM-dd");

  const currentDay = progress?.current_day ?? 0;
  const isAllDone = DEFAULT_TASK_KEYS.every((key) =>
    todayCompleted.includes(key)
  );

  const fetchCompletions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !groupId) return;

    const { data, error } = await supabase
      .from("task_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("group_id", groupId)
      .eq("date", today);

    if (error) {
      console.error("Error fetching completions:", error);
      return;
    }

    const completionData = (data ?? []) as TaskCompletion[];
    setCompletions(completionData);
    setTodayCompleted(completionData.map((c) => c.task_key));
  }, [supabase, groupId, today]);

  const fetchProgress = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !groupId) return;

    const { data, error } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("group_id", groupId)
      .single();

    if (error) {
      console.error("Error fetching progress:", error);
      return;
    }

    setProgress(data as ChallengeProgress);
  }, [supabase, groupId]);

  const fetchCustomTasks = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("custom_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching custom tasks:", error);
      return;
    }

    setCustomTasks((data ?? []) as CustomTask[]);
  }, [supabase]);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchCompletions(),
        fetchProgress(),
        fetchCustomTasks(),
      ]);
      setLoading(false);
    };

    loadAll();
  }, [groupId, fetchCompletions, fetchProgress, fetchCustomTasks]);

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
          fetchCompletions();
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
        return;
      }

      setProgress((prev) =>
        prev
          ? { ...prev, current_day: newDay, last_completed_date: today }
          : prev
      );
    },
    [progress, groupId, today, supabase]
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
      return;
    }

    setCustomTasks((prev) => [...prev, data as CustomTask]);
  };

  const removeCustomTask = async (id: string) => {
    const { error } = await supabase
      .from("custom_tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing custom task:", error);
      return;
    }

    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
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
