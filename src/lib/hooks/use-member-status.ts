"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import type { MemberDayStatus, ChallengeProgress, Profile } from "@/lib/types";

export function useMemberStatus(groupId: string | undefined) {
  const [memberStatuses, setMemberStatuses] = useState<MemberDayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchStatuses = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all group members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("user_id, profiles(*)")
        .eq("group_id", groupId);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        setLoading(false);
        return;
      }

      const members = membersData ?? [];

      if (members.length === 0) {
        setMemberStatuses([]);
        setLoading(false);
        return;
      }

      const userIds = members.map((m) => m.user_id as string);

      // Fetch today's completions for all members in the group
      const { data: completionsData, error: completionsError } = await supabase
        .from("task_completions")
        .select("user_id, task_key")
        .eq("group_id", groupId)
        .eq("date", today)
        .in("user_id", userIds);

      if (completionsError) {
        console.error("Error fetching completions:", completionsError);
      }

      const completions = completionsData ?? [];

      // Group completions by user_id
      const completionsByUser: Record<string, string[]> = {};
      for (const c of completions) {
        const uid = c.user_id as string;
        if (!completionsByUser[uid]) completionsByUser[uid] = [];
        completionsByUser[uid].push(c.task_key as string);
      }

      // Fetch challenge_progress for all members in this group
      const { data: progressData, error: progressError } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("group_id", groupId)
        .in("user_id", userIds);

      if (progressError) {
        console.error("Error fetching progress:", progressError);
      }

      const progressList = (progressData ?? []) as ChallengeProgress[];
      const progressByUser: Record<string, ChallengeProgress> = {};
      for (const p of progressList) {
        progressByUser[p.user_id] = p;
      }

      // Build statuses
      const statuses: MemberDayStatus[] = members.map((m) => {
        const uid = m.user_id as string;
        const profile = m.profiles as unknown as Profile;
        const completedTasks = completionsByUser[uid] ?? [];
        const progress = progressByUser[uid] ?? null;

        return {
          profile: profile ?? {
            id: uid,
            display_name: null,
            avatar_url: null,
            created_at: "",
          },
          completedTasks,
          currentDay: progress?.current_day ?? 0,
          progress,
        };
      });

      // Sort: those who completed all required tasks first, then by number of
      // required tasks completed desc.
      statuses.sort((a, b) => {
        const aCompleted = DEFAULT_TASK_KEYS.filter((k) =>
          a.completedTasks.includes(k)
        ).length;
        const bCompleted = DEFAULT_TASK_KEYS.filter((k) =>
          b.completedTasks.includes(k)
        ).length;
        const aAllDone = aCompleted >= DEFAULT_TASK_KEYS.length;
        const bAllDone = bCompleted >= DEFAULT_TASK_KEYS.length;

        if (aAllDone && !bAllDone) return -1;
        if (!aAllDone && bAllDone) return 1;
        return bCompleted - aCompleted;
      });

      setMemberStatuses(statuses);
    } catch (error) {
      console.error("Error in fetchStatuses:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, groupId, today]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to realtime changes on task_completions and challenge_progress
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`member_status:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_completions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchStatuses();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_progress",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchStatuses();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, fetchStatuses]);

  return {
    memberStatuses,
    loading,
  };
}
