"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Rankings } from "@/components/leaderboard/rankings";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import { useGroup } from "@/lib/hooks/use-group";
import { useMemberStatus } from "@/lib/hooks/use-member-status";

export default function LeaderboardPage() {
  const { group, loading: groupLoading } = useGroup();
  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id);

  const totalRequired = DEFAULT_TASK_KEYS.length;

  const rankingMembers = useMemo(
    () =>
      memberStatuses.map((member) => ({
        profile: member.profile,
        currentDay: member.currentDay,
        streak: member.currentDay,
        totalRequired,
        todayCompleted: DEFAULT_TASK_KEYS.filter((taskKey) =>
          member.completedTasks.includes(taskKey)
        ).length,
      })),
    [memberStatuses, totalRequired]
  );

  const todayFinished = useMemo(
    () => rankingMembers.filter((member) => member.todayCompleted >= totalRequired),
    [rankingMembers, totalRequired]
  );

  const squadStats = useMemo(() => {
    const members = rankingMembers.length;
    const totalCompletedToday = rankingMembers.reduce(
      (total, member) => total + member.todayCompleted,
      0
    );
    const avgCompletion =
      members > 0 ? Math.round((totalCompletedToday / (members * totalRequired)) * 100) : 0;
    const bestStreak = rankingMembers.reduce(
      (best, member) => Math.max(best, member.currentDay),
      0
    );

    return {
      avgCompletion,
      bestStreak,
      totalCompletedToday,
    };
  }, [rankingMembers, totalRequired]);

  if (groupLoading || statusLoading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">Leaderboard</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 text-sm text-text-secondary">
            Join or create a squad to see rankings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black gradient-text">Leaderboard 🏆</h1>
        <p className="mt-1 text-sm text-text-secondary">Who is leading the challenge?</p>
      </motion.div>

      <motion.div
        className="glass-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Today&apos;s Race ⚡
        </p>

        {todayFinished.length > 0 ? (
          <div className="space-y-2">
            {todayFinished
              .sort((a, b) => b.currentDay - a.currentDay)
              .slice(0, 3)
              .map((member, index) => (
                <motion.div
                  key={member.profile.id}
                  className="flex items-center gap-3 rounded-xl bg-bg-surface/50 p-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                  <p className="flex-1 text-sm font-semibold text-text-primary">
                    {member.profile.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-accent-emerald">{member.currentDay} days</p>
                </motion.div>
              ))}
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-text-muted">
            Nobody has finished all required tasks yet today.
          </p>
        )}
      </motion.div>

      <div>
        <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Overall Rankings
        </p>
        <Rankings members={rankingMembers} />
      </div>

      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Squad Stats 📊
        </p>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black gradient-text">{squadStats.avgCompletion}%</p>
            <p className="mt-1 text-[10px] text-text-muted">Avg Completion</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-amber">{squadStats.bestStreak}</p>
            <p className="mt-1 text-[10px] text-text-muted">Best Streak</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-emerald">
              {squadStats.totalCompletedToday}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">Tasks Today</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
