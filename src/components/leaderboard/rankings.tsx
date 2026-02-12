"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RankingMember {
  profile: Profile;
  currentDay: number;
  todayCompleted: number;
  totalRequired: number;
  streak: number;
}

interface RankingsProps {
  members: RankingMember[];
}

const RANK_BADGES = ["👑", "🥈", "🥉"];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const row = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function Rankings({ members }: RankingsProps) {
  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (b.currentDay !== a.currentDay) return b.currentDay - a.currentDay;
      return b.todayCompleted - a.todayCompleted;
    });
  }, [members]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {sorted.map((member, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;
        const isFirst = rank === 1;
        const profile = member.profile;
        const avatarFallback = (profile.display_name || "?")[0].toUpperCase();
        const progressPct =
          member.totalRequired > 0
            ? Math.round(
                (member.todayCompleted / member.totalRequired) * 100
              )
            : 0;

        return (
          <motion.div
            key={profile.id}
            variants={row}
            layoutId={`rank-${profile.id}`}
            data-testid="ranking-row"
            className={cn(
              "relative flex items-center gap-3 rounded-2xl border p-3 transition-colors",
              isFirst
                ? "border-accent-amber/30 bg-gradient-to-r from-accent-amber/10 via-accent-pink/5 to-transparent"
                : "border-border bg-bg-card"
            )}
            style={
              isFirst
                ? {
                    boxShadow:
                      "0 0 30px rgba(245, 158, 11, 0.15), 0 0 60px rgba(245, 158, 11, 0.05)",
                  }
                : undefined
            }
          >
            {/* Rank */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
              {isTop3 ? (
                <span className="text-xl">{RANK_BADGES[rank - 1]}</span>
              ) : (
                <span className="text-sm font-bold text-text-muted">
                  {rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                isFirst
                  ? "bg-gradient-to-br from-accent-amber to-accent-pink"
                  : "bg-gradient-to-br from-accent-violet to-accent-blue"
              )}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "User"}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                avatarFallback
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {profile.display_name || "Anonymous"}
                </p>
              </div>

              {/* Today's progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      progressPct === 100
                        ? "bg-accent-emerald"
                        : "bg-gradient-to-r from-accent-violet to-accent-pink"
                    )}
                  />
                </div>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {member.todayCompleted}/{member.totalRequired}
                </span>
              </div>
            </div>

            {/* Streak badge */}
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-sm">🔥</span>
              <span
                className={cn(
                  "text-xs font-bold",
                  isFirst ? "text-accent-amber" : "text-text-secondary"
                )}
              >
                {member.currentDay}
              </span>
              <span className="text-[9px] text-text-muted">days</span>
            </div>
          </motion.div>
        );
      })}

      {sorted.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="text-5xl mb-3">🏆</span>
          <p className="text-sm text-text-muted">
            No rankings yet. Start your challenge!
          </p>
        </div>
      )}
    </motion.div>
  );
}
