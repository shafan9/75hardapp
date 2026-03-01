"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MemberDayStatus } from "@/lib/types";
import { DEFAULT_TASKS, DEFAULT_TASK_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";

interface GroupGridProps {
  members: MemberDayStatus[];
  totalRequired: number;
  onSelectMember?: (member: MemberDayStatus) => void;
}

const requiredTasks = DEFAULT_TASKS.filter((task) => !("optional" in task && task.optional));

function getMemberStatusColors(completedCount: number, totalRequired: number) {
  if (completedCount >= totalRequired) {
    return {
      ring: "border-accent-cyan shadow-[0_0_0_2px_rgba(0,212,255,0.18)]",
      glow: "glow-cyan",
    };
  }

  if (completedCount > 0) {
    return {
      ring: "border-accent-orange",
      glow: "",
    };
  }

  return {
    ring: "border-white/20",
    glow: "",
  };
}

export function GroupGrid({ members, totalRequired, onSelectMember }: GroupGridProps) {
  const sorted = useMemo(() => {
    const requiredCompletedCount = (member: MemberDayStatus) =>
      DEFAULT_TASK_KEYS.filter((key) => member.completedTasks.includes(key)).length;

    return [...members].sort((a, b) => {
      const aCompleted = requiredCompletedCount(a);
      const bCompleted = requiredCompletedCount(b);
      const aAllDone = aCompleted >= totalRequired;
      const bAllDone = bCompleted >= totalRequired;

      if (aAllDone && !bAllDone) return -1;
      if (!aAllDone && bAllDone) return 1;
      return bCompleted - aCompleted;
    });
  }, [members, totalRequired]);

  return (
    <motion.div layout className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {sorted.map((member) => {
        const requiredCompleted = DEFAULT_TASK_KEYS.filter((key) =>
          member.completedTasks.includes(key)
        ).length;
        const allDone = requiredCompleted >= totalRequired;
        const profile = member.profile;
        const avatarFallback = (profile.display_name || "?")[0]?.toUpperCase() || "?";
        const colors = getMemberStatusColors(requiredCompleted, totalRequired);

        return (
          <motion.button
            key={profile.id}
            type="button"
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={() => onSelectMember?.(member)}
            className={cn(
              "w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors",
              "hover:bg-white/[0.08]",
              allDone && "border-accent-cyan/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={cn("inline-flex rounded-full p-[2px] border-2", colors.ring, colors.glow)}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-card text-sm font-bold text-text-primary">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name || "User"}
                      width={44}
                      height={44}
                      loading="lazy"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    avatarFallback
                  )}
                </div>
              </div>

              <div className="-mr-1 -mt-1">
                <ProgressRing
                  variant="mini"
                  progress={(requiredCompleted / Math.max(totalRequired, 1)) * 100}
                  innerProgress={Math.min((member.currentDay / 75) * 100, 100)}
                  label={String(requiredCompleted)}
                />
              </div>
            </div>

            <p className="mt-3 truncate text-sm font-semibold text-text-primary">
              {profile.display_name || "Anonymous"}
            </p>
            <p className="text-xs text-text-secondary">Day {member.currentDay}</p>

            <div className="mt-3 flex items-center gap-1.5">
              {requiredTasks.map((task) => {
                const done = member.completedTasks.includes(task.key);
                return (
                  <span
                    key={task.key}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm transition-opacity",
                      done ? "bg-white/10 opacity-100" : "bg-white/5 opacity-40"
                    )}
                    title={`${task.label}${done ? " complete" : " pending"}`}
                    aria-label={`${task.label}${done ? " complete" : " pending"}`}
                  >
                    {task.emoji}
                  </span>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-text-muted">
              {requiredCompleted}/{totalRequired} required tasks done
            </p>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
