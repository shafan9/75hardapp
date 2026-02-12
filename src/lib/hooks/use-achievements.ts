"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import type { UserAchievement, ChallengeProgress } from "@/lib/types";

export function useAchievements(
  userId: string | undefined,
  groupId: string | undefined
) {
  const [earned, setEarned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEarned = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching achievements:", error);
      setLoading(false);
      return;
    }

    const achievements = (data ?? []) as UserAchievement[];
    setEarned(achievements.map((a) => a.achievement_key));
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchEarned();
  }, [fetchEarned]);

  /**
   * Count consecutive days a specific task (or set of tasks) was completed,
   * ending at the most recent completion. Returns the length of the current
   * streak from the latest date going backward with no gaps.
   */
  const countConsecutiveDays = useCallback(
    async (taskKeys: string[]): Promise<number> => {
      if (!userId || !groupId) return 0;

      // For multiple task keys, we need dates where ALL keys were completed
      // Fetch all completions for these task keys, ordered by date descending
      const { data, error } = await supabase
        .from("task_completions")
        .select("date, task_key")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .in("task_key", taskKeys)
        .order("date", { ascending: false });

      if (error || !data || data.length === 0) return 0;

      // Group by date and check which dates have all required task keys
      const dateMap: Record<string, Set<string>> = {};
      for (const row of data) {
        const d = row.date as string;
        if (!dateMap[d]) dateMap[d] = new Set();
        dateMap[d].add(row.task_key as string);
      }

      // Get dates where all task keys are present, sorted descending
      const completeDates = Object.entries(dateMap)
        .filter(([, keys]) => taskKeys.every((k) => keys.has(k)))
        .map(([date]) => date)
        .sort()
        .reverse();

      if (completeDates.length === 0) return 0;

      // Count consecutive days from the most recent
      let streak = 1;
      for (let i = 1; i < completeDates.length; i++) {
        const prev = new Date(completeDates[i - 1]);
        const curr = new Date(completeDates[i]);
        const diffMs = prev.getTime() - curr.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    },
    [supabase, userId, groupId]
  );

  /**
   * Count how many times the user was the first in the group to complete
   * all required tasks for a given day.
   */
  const countFirstFinishes = useCallback(async (): Promise<number> => {
    if (!userId || !groupId) return 0;

    // Get all completions for the group
    const { data, error } = await supabase
      .from("task_completions")
      .select("user_id, date, task_key, completed_at")
      .eq("group_id", groupId)
      .order("completed_at", { ascending: true });

    if (error || !data || data.length === 0) return 0;

    // Group by user_id + date, find the time each user completed all tasks
    const userDateCompletions: Record<
      string,
      Record<string, { keys: Set<string>; latestTime: string }>
    > = {};

    for (const row of data) {
      const uid = row.user_id as string;
      const date = row.date as string;
      const key = `${uid}`;

      if (!userDateCompletions[key]) userDateCompletions[key] = {};
      if (!userDateCompletions[key][date]) {
        userDateCompletions[key][date] = {
          keys: new Set(),
          latestTime: row.completed_at as string,
        };
      }

      userDateCompletions[key][date].keys.add(row.task_key as string);
      // Track the latest completion time (when all tasks were done)
      if (
        (row.completed_at as string) >
        userDateCompletions[key][date].latestTime
      ) {
        userDateCompletions[key][date].latestTime =
          row.completed_at as string;
      }
    }

    // For each date, find who finished all required tasks first
    const allDates = new Set(data.map((r) => r.date as string));
    let firstCount = 0;

    for (const date of allDates) {
      let earliestTime: string | null = null;
      let earliestUser: string | null = null;

      for (const [uid, dates] of Object.entries(userDateCompletions)) {
        const dayData = dates[date];
        if (!dayData) continue;

        const hasAll = DEFAULT_TASK_KEYS.every((k) => dayData.keys.has(k));
        if (!hasAll) continue;

        if (!earliestTime || dayData.latestTime < earliestTime) {
          earliestTime = dayData.latestTime;
          earliestUser = uid;
        }
      }

      if (earliestUser === userId) {
        firstCount++;
      }
    }

    return firstCount;
  }, [supabase, userId, groupId]);

  const awardAchievement = useCallback(
    async (achievementKey: string) => {
      if (!userId) return;

      const { error } = await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_key: achievementKey,
      });

      if (error) {
        // Likely a duplicate, which is fine
        if (!error.message.includes("duplicate")) {
          console.error("Error awarding achievement:", error);
        }
        return;
      }

      setEarned((prev) => [...prev, achievementKey]);
    },
    [supabase, userId]
  );

  const checkAndAward = useCallback(async () => {
    if (!userId || !groupId) return;

    // Fetch current challenge progress
    const { data: progressData, error: progressError } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .single();

    if (progressError || !progressData) {
      console.error("Error fetching progress for achievements:", progressError);
      return;
    }

    const progress = progressData as ChallengeProgress;
    const newAwards: string[] = [];

    // --- Streak milestones ---
    const streakChecks: [string, number][] = [
      ["streak_7", 7],
      ["streak_14", 14],
      ["streak_30", 30],
      ["streak_50", 50],
      ["streak_75", 75],
    ];

    for (const [key, threshold] of streakChecks) {
      if (!earned.includes(key) && progress.current_day >= threshold) {
        newAwards.push(key);
      }
    }

    // --- First to finish ---
    const firstFinishes = await countFirstFinishes();

    const firstChecks: [string, number][] = [
      ["first_finish_1", 1],
      ["first_finish_5", 5],
      ["first_finish_10", 10],
    ];

    for (const [key, threshold] of firstChecks) {
      if (!earned.includes(key) && firstFinishes >= threshold) {
        newAwards.push(key);
      }
    }

    // --- Category-specific consecutive day achievements ---

    // Bookworm: reading for 14 consecutive days
    if (!earned.includes("bookworm")) {
      const readingStreak = await countConsecutiveDays(["reading"]);
      if (readingStreak >= 14) {
        newAwards.push("bookworm");
      }
    }

    // Iron Will: outdoor workout for 30 consecutive days
    if (!earned.includes("iron_will")) {
      const outdoorStreak = await countConsecutiveDays(["workout_outdoor"]);
      if (outdoorStreak >= 30) {
        newAwards.push("iron_will");
      }
    }

    // Hydration Hero: water for 21 consecutive days
    if (!earned.includes("hydration_hero")) {
      const waterStreak = await countConsecutiveDays(["water"]);
      if (waterStreak >= 21) {
        newAwards.push("hydration_hero");
      }
    }

    // Clean Machine: diet for 30 consecutive days
    if (!earned.includes("clean_machine")) {
      const dietStreak = await countConsecutiveDays(["diet"]);
      if (dietStreak >= 30) {
        newAwards.push("clean_machine");
      }
    }

    // Double Trouble: both workouts for 14 consecutive days
    if (!earned.includes("double_trouble")) {
      const doubleStreak = await countConsecutiveDays([
        "workout_outdoor",
        "workout_indoor",
      ]);
      if (doubleStreak >= 14) {
        newAwards.push("double_trouble");
      }
    }

    // Award all new achievements
    for (const key of newAwards) {
      await awardAchievement(key);
    }
  }, [
    userId,
    groupId,
    earned,
    supabase,
    countConsecutiveDays,
    countFirstFinishes,
    awardAchievement,
  ]);

  return {
    earned,
    checkAndAward,
    loading,
  };
}
