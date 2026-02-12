"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// TODO: replace with real data from hook
interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  streak: number;
  todayCompleted: number;
  todayTotal: number;
  overallPercent: number;
  finishedFirst: boolean;
  finishTime: string | null;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: "u1", name: "Sarah K.", avatar_url: null, streak: 14, todayCompleted: 5, todayTotal: 5, overallPercent: 92, finishedFirst: true, finishTime: "6:12 AM" },
  { id: "u3", name: "Jordan P.", avatar_url: null, streak: 12, todayCompleted: 5, todayTotal: 5, overallPercent: 88, finishedFirst: false, finishTime: "7:45 AM" },
  { id: "u2", name: "Mike D.", avatar_url: null, streak: 14, todayCompleted: 3, todayTotal: 5, overallPercent: 85, finishedFirst: false, finishTime: null },
  { id: "u4", name: "Alex R.", avatar_url: null, streak: 10, todayCompleted: 2, todayTotal: 5, overallPercent: 78, finishedFirst: false, finishTime: null },
  { id: "u5", name: "Taylor M.", avatar_url: null, streak: 8, todayCompleted: 0, todayTotal: 5, overallPercent: 65, finishedFirst: false, finishTime: null },
];

const RANK_BADGES = ["👑", "🥈", "🥉"];

const AVATAR_COLORS = [
  "from-accent-violet to-accent-pink",
  "from-accent-pink to-accent-amber",
  "from-accent-amber to-accent-emerald",
  "from-accent-emerald to-accent-blue",
  "from-accent-blue to-accent-violet",
];

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const colorIndex = parseInt(entry.id.replace(/\D/g, "")) % AVATAR_COLORS.length;
  const isTopThree = rank <= 3;
  const todayPercent = Math.round((entry.todayCompleted / entry.todayTotal) * 100);

  return (
    <motion.div
      layout
      className={cn(
        "glass-card p-4",
        rank === 1 && "border-accent-amber/50 glow-violet",
        rank === 2 && "border-text-secondary/30",
        rank === 3 && "border-accent-amber/20"
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.08, type: "spring", stiffness: 200, damping: 25 }}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className="w-8 text-center shrink-0">
          {isTopThree ? (
            <motion.span
              className="text-2xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, delay: rank * 0.08 + 0.2 }}
            >
              {RANK_BADGES[rank - 1]}
            </motion.span>
          ) : (
            <span className="text-lg font-bold text-text-muted">#{rank}</span>
          )}
        </div>

        {/* Avatar */}
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
            AVATAR_COLORS[colorIndex]
          )}
        >
          {getInitials(entry.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-text-primary truncate">{entry.name}</p>
            {entry.finishedFirst && (
              <span className="text-[10px] bg-accent-amber/20 text-accent-amber px-1.5 py-0.5 rounded-full font-semibold">
                FIRST ⚡
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            🔥 {entry.streak} day streak
          </p>
        </div>

        {/* Stats */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-text-primary">{entry.overallPercent}%</p>
          <p className="text-[10px] text-text-muted">overall</p>
        </div>
      </div>

      {/* Today progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-muted">
            Today: {entry.todayCompleted}/{entry.todayTotal}
          </span>
          {entry.finishTime && (
            <span className="text-[10px] text-accent-emerald">
              Done at {entry.finishTime}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              todayPercent === 100
                ? "bg-gradient-to-r from-accent-emerald to-accent-blue"
                : "bg-gradient-to-r from-accent-violet to-accent-pink"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${todayPercent}%` }}
            transition={{ duration: 0.8, delay: rank * 0.08 + 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const todayFinished = MOCK_LEADERBOARD.filter((e) => e.todayCompleted === e.todayTotal);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black gradient-text">Leaderboard 🏆</h1>
        <p className="text-sm text-text-secondary mt-1">
          Who&apos;s crushing it?
        </p>
      </motion.div>

      {/* Today's Race */}
      <motion.div
        className="glass-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">
          Today&apos;s Race ⚡
        </p>
        {todayFinished.length > 0 ? (
          <div className="space-y-2">
            {todayFinished.map((entry, i) => (
              <motion.div
                key={entry.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-bg-surface/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <p className="text-sm font-semibold text-text-primary flex-1">{entry.name}</p>
                <p className="text-xs text-accent-emerald font-medium">{entry.finishTime}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-2">
            No one finished yet today. Be the first! 🏁
          </p>
        )}
      </motion.div>

      {/* Rankings */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1 mb-3">
          Overall Rankings
        </p>
        <div className="space-y-3">
          {MOCK_LEADERBOARD.map((entry, i) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Fun stats */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4">
          Squad Stats 📊
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black gradient-text">62%</p>
            <p className="text-[10px] text-text-muted mt-1">Avg Completion</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-amber">12</p>
            <p className="text-[10px] text-text-muted mt-1">Best Streak</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-emerald">24</p>
            <p className="text-[10px] text-text-muted mt-1">Tasks Today</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
