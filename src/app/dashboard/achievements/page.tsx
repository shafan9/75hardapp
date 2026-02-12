"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// TODO: replace with real data from hook
const MOCK_EARNED: Record<string, string> = {
  streak_7: "2025-01-15T10:00:00Z",
  streak_14: "2025-01-22T08:30:00Z",
  first_finish_1: "2025-01-10T06:45:00Z",
  first_finish_5: "2025-01-18T07:00:00Z",
  bookworm: "2025-01-22T20:00:00Z",
};

// Progress towards unearned achievements
const MOCK_PROGRESS: Record<string, { current: number; target: number }> = {
  streak_30: { current: 14, target: 30 },
  streak_50: { current: 14, target: 50 },
  streak_75: { current: 14, target: 75 },
  first_finish_10: { current: 5, target: 10 },
  iron_will: { current: 12, target: 30 },
  hydration_hero: { current: 10, target: 21 },
  clean_machine: { current: 14, target: 30 },
  double_trouble: { current: 8, target: 14 },
};

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  streak: { label: "Streaks", emoji: "🔥" },
  first: { label: "First to Finish", emoji: "⚡" },
  category: { label: "Category Masters", emoji: "🎯" },
};

type AchievementType = (typeof ACHIEVEMENTS)[number];

function AchievementCard({
  achievement,
  earned,
  progress,
  index,
  onSelect,
}: {
  achievement: AchievementType;
  earned: boolean;
  progress?: { current: number; target: number };
  index: number;
  onSelect: () => void;
}) {
  const progressPercent = progress
    ? Math.round((progress.current / progress.target) * 100)
    : earned
    ? 100
    : 0;

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "glass-card p-4 flex flex-col items-center gap-2 text-center cursor-pointer relative overflow-hidden",
        earned && "border-accent-amber/50",
        !earned && "opacity-60"
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: earned ? 1 : 0.6, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 200, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect for earned */}
      {earned && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-accent-amber/10 via-transparent to-accent-violet/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      <motion.span
        className={cn("text-4xl relative z-10", !earned && "grayscale")}
        animate={earned ? { rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        {achievement.emoji}
      </motion.span>
      <p className={cn("text-xs font-bold relative z-10", earned ? "text-text-primary" : "text-text-muted")}>
        {achievement.label}
      </p>

      {/* Lock icon for unearned */}
      {!earned && !progress && (
        <span className="text-[10px] text-text-muted">🔒</span>
      )}

      {/* Progress bar for in-progress */}
      {!earned && progress && (
        <div className="w-full relative z-10">
          <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-pink"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, delay: index * 0.04 + 0.3 }}
            />
          </div>
          <p className="text-[9px] text-text-muted mt-1">
            {progress.current}/{progress.target}
          </p>
        </div>
      )}
    </motion.button>
  );
}

export default function AchievementsPage() {
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementType | null>(null);
  const earnedCount = Object.keys(MOCK_EARNED).length;
  const totalCount = ACHIEVEMENTS.length;

  const categories = [...new Set(ACHIEVEMENTS.map((a) => a.category))];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black gradient-text">Achievements 🏅</h1>
        <p className="text-sm text-text-secondary mt-1">
          {earnedCount} of {totalCount} unlocked
        </p>
      </motion.div>

      {/* Overall progress */}
      <motion.div
        className="glass-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted font-semibold">Collection Progress</span>
          <span className="text-xs font-bold text-accent-amber">{Math.round((earnedCount / totalCount) * 100)}%</span>
        </div>
        <div className="h-3 rounded-full bg-bg-surface overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-amber via-accent-pink to-accent-violet"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Achievement categories */}
      {categories.map((category) => {
        const catInfo = CATEGORY_LABELS[category] || { label: category, emoji: "🎯" };
        const catAchievements = ACHIEVEMENTS.filter((a) => a.category === category);

        return (
          <div key={category}>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1 mb-3 flex items-center gap-2">
              <span>{catInfo.emoji}</span>
              {catInfo.label}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {catAchievements.map((achievement, i) => (
                <AchievementCard
                  key={achievement.key}
                  achievement={achievement}
                  earned={achievement.key in MOCK_EARNED}
                  progress={MOCK_PROGRESS[achievement.key]}
                  index={i}
                  onSelect={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Achievement detail modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAchievement(null)}
            />

            {/* Modal */}
            <motion.div
              className="glass-card p-6 max-w-sm w-full relative z-10 text-center space-y-4"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.span
                className="text-6xl inline-block"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {selectedAchievement.emoji}
              </motion.span>
              <h3 className="text-xl font-black text-text-primary">
                {selectedAchievement.label}
              </h3>
              <p className="text-sm text-text-secondary">
                {selectedAchievement.description}
              </p>

              {selectedAchievement.key in MOCK_EARNED ? (
                <div className="space-y-2">
                  <p className="text-accent-emerald font-semibold text-sm">Unlocked! ✅</p>
                  <p className="text-xs text-text-muted">
                    Earned on {new Date(MOCK_EARNED[selectedAchievement.key]).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {MOCK_PROGRESS[selectedAchievement.key] ? (
                    <>
                      <p className="text-accent-violet font-semibold text-sm">In Progress 🔄</p>
                      <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-pink"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(MOCK_PROGRESS[selectedAchievement.key].current / MOCK_PROGRESS[selectedAchievement.key].target) * 100}%`,
                          }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <p className="text-xs text-text-muted">
                        {MOCK_PROGRESS[selectedAchievement.key].current} / {MOCK_PROGRESS[selectedAchievement.key].target}
                      </p>
                    </>
                  ) : (
                    <p className="text-text-muted text-sm">🔒 Locked</p>
                  )}
                </div>
              )}

              <motion.button
                onClick={() => setSelectedAchievement(null)}
                className="mt-2 px-6 py-2 rounded-xl bg-bg-surface border border-border text-sm font-semibold text-text-secondary cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
