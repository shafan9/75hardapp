"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { MemberDayStatus } from "@/lib/types";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GroupGridProps {
  members: MemberDayStatus[];
  totalRequired: number;
}

export function GroupGrid({ members, totalRequired }: GroupGridProps) {
  // Sort: completed all first, then by number completed desc
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
        const requiredCompleted = DEFAULT_TASK_KEYS.filter((key) => member.completedTasks.includes(key)).length;
        const allDone = requiredCompleted >= totalRequired;
        const profile = member.profile;
        const avatarFallback = (profile.display_name || "?")[0].toUpperCase();

        return (
          <Link key={profile.id} href={`/dashboard/member/${profile.id}`} className="block">
            <motion.div
              layout
              layoutId={profile.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "rounded-2xl border p-3 transition-colors",
                allDone ? "border-accent-emerald/30 bg-accent-emerald/5" : "border-border bg-bg-card"
              )}
              style={
                allDone
                  ? {
                      boxShadow:
                        "0 0 20px rgba(16, 185, 129, 0.2), 0 0 60px rgba(16, 185, 129, 0.05)",
                    }
                  : undefined
              }
            >
              {/* Avatar + Name */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet to-accent-pink text-xs font-bold text-white">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || "User"}
                      width={32}
                      height={32}
                      loading="lazy"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    avatarFallback
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-primary">{profile.display_name || "Anonymous"}</p>
                  <p className="text-[10px] text-text-muted">Day {member.currentDay}</p>
                </div>
                {allDone && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="flex-shrink-0 rounded-full bg-accent-emerald/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-emerald"
                  >
                    DONE
                  </motion.span>
                )}
              </div>

              {/* Task circles */}
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TASK_KEYS.map((key) => {
                  const completed = member.completedTasks.includes(key);
                  return (
                    <motion.div
                      key={key}
                      initial={false}
                      animate={completed ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                        completed ? "bg-accent-emerald" : "border border-border-light bg-transparent"
                      )}
                    >
                      {completed && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 5.5L4 7.5L8 3" />
                        </svg>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </Link>
        );
      })}
    </motion.div>
  );
}
