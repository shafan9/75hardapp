"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { DailyChecklist } from "@/components/checklist/daily-checklist";
import { ProgressRing } from "@/components/ui/progress-ring";
import { TOTAL_DAYS } from "@/lib/constants";
import { useAchievements } from "@/lib/hooks/use-achievements";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { getDayLabel, getProgressPercent, getStreakMessage } from "@/lib/utils";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup();
  const {
    todayCompleted,
    customTasks,
    loading: checklistLoading,
    toggleTask,
    addNote,
    addCustomTask,
    removeCustomTask,
    isAllDone,
    currentDay,
  } = useChecklist(group?.id);
  const { checkAndAward } = useAchievements(user?.id, group?.id);

  useEffect(() => {
    if (!user?.id || !group?.id) return;
    void checkAndAward();
  }, [user?.id, group?.id, todayCompleted.join("|"), checkAndAward]);

  const loading = authLoading || groupLoading || checklistLoading;
  const progressPercent = getProgressPercent(currentDay, TOTAL_DAYS);
  const streakMessage = getStreakMessage(currentDay);

  if (loading) {
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
        <motion.h1
          className="text-2xl font-black gradient-text"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Today
        </motion.h1>

        <motion.div
          className="glass-card p-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-3xl">👥</p>
          <h2 className="mt-2 text-lg font-bold text-text-primary">
            You are not in a squad yet
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create a squad or join one to start tracking your challenge.
          </p>

          <Link
            href="/dashboard/group"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Squad Setup
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center">
          <ProgressRing
            progress={progressPercent}
            size={150}
            label={`${progressPercent}%`}
            sublabel={`Day ${Math.min(currentDay, TOTAL_DAYS)} / ${TOTAL_DAYS}`}
          />
        </div>

        <h1 className="mt-4 text-2xl font-black gradient-text">
          {getDayLabel(currentDay, TOTAL_DAYS)}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{streakMessage}</p>

        <Link
          href="/dashboard/achievements"
          className="mt-4 inline-flex rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover"
        >
          View Achievements
        </Link>
      </motion.div>

      <DailyChecklist
        completions={todayCompleted}
        customTasks={customTasks}
        onToggleTask={toggleTask}
        onAddNote={addNote}
        onAddCustomTask={addCustomTask}
        onRemoveCustomTask={removeCustomTask}
        currentDay={currentDay}
        isAllDone={isAllDone}
      />
    </div>
  );
}
