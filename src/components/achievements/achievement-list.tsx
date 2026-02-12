"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ACHIEVEMENTS } from "@/lib/constants";
import { Badge } from "./badge";

interface AchievementListProps {
  achievements: typeof ACHIEVEMENTS;
  earned: string[];
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  streak: { label: "Streak Milestones", emoji: "🔥" },
  first: { label: "First to Finish", emoji: "⚡" },
  category: { label: "Category Champions", emoji: "🏅" },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  show: { opacity: 1, scale: 1, y: 0 },
};

export function AchievementList({
  achievements,
  earned,
}: AchievementListProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, typeof achievements[number][]> = {};
    for (const a of achievements) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, [achievements]);

  const earnedCount = earned.length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Achievements</h2>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 rounded-full bg-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%`,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-amber"
            />
          </div>
          <span className="text-xs font-medium text-text-muted">
            {earnedCount} of {totalCount}
          </span>
        </div>
      </div>

      {/* Grouped sections */}
      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_LABELS[category] || {
          label: category,
          emoji: "🎯",
        };
        return (
          <div key={category} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.emoji}</span>
              <h3 className="text-sm font-semibold text-text-secondary">
                {meta.label}
              </h3>
            </div>

            {/* Badges grid */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-4 sm:grid-cols-5 gap-4"
            >
              {items.map((achievement) => (
                <motion.div key={achievement.key} variants={item}>
                  <Badge
                    achievement={achievement}
                    earned={earned.includes(achievement.key)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
