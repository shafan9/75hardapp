"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// TODO: replace with real data from hook
const MOCK_PROFILE = {
  id: "u1",
  display_name: "Sarah K.",
  avatar_url: null,
  email: "sarah@example.com",
};

const MOCK_STATS = {
  currentStreak: 14,
  totalDays: 14,
  achievementsEarned: 5,
  totalAchievements: 13,
  tasksCompleted: 68,
  bestStreak: 14,
};

const MOCK_CUSTOM_TASKS = [
  { id: "ct1", name: "Meditation", emoji: "🧘" },
  { id: "ct2", name: "Cold shower", emoji: "🥶" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(MOCK_PROFILE.display_name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [customTasks, setCustomTasks] = useState(MOCK_CUSTOM_TASKS);
  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function saveName() {
    // TODO: update profile in Supabase
    setIsEditingName(false);
  }

  function addCustomTask() {
    if (!newTaskName.trim()) return;
    setCustomTasks((prev) => [
      ...prev,
      { id: `ct_${Date.now()}`, name: newTaskName.trim(), emoji: "🎯" },
    ]);
    setNewTaskName("");
    setShowAddTask(false);
  }

  function removeCustomTask(id: string) {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black gradient-text">Profile</h1>
      </motion.div>

      {/* Avatar and name */}
      <motion.div
        className="glass-card p-6 flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-violet via-accent-pink to-accent-amber flex items-center justify-center text-3xl font-bold text-white">
          {MOCK_PROFILE.display_name?.[0]?.toUpperCase() || "?"}
        </div>

        {/* Name */}
        {isEditingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl bg-bg-surface border border-border text-sm text-text-primary text-center focus:outline-none focus:border-accent-violet/50"
            />
            <motion.button
              onClick={saveName}
              className="px-3 py-2 rounded-xl bg-accent-violet text-white text-sm font-semibold cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              Save
            </motion.button>
          </div>
        ) : (
          <motion.button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2 cursor-pointer"
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-lg font-bold text-text-primary">{displayName}</span>
            <span className="text-text-muted text-sm">✏️</span>
          </motion.button>
        )}

        <p className="text-xs text-text-muted">{MOCK_PROFILE.email}</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4">
          Your Stats 📊
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: MOCK_STATS.currentStreak, label: "Current Streak", emoji: "🔥", color: "text-accent-amber" },
            { value: MOCK_STATS.totalDays, label: "Days Done", emoji: "📅", color: "text-accent-emerald" },
            { value: MOCK_STATS.achievementsEarned, label: "Achievements", emoji: "🏅", color: "text-accent-violet" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-text-muted mt-1">{stat.emoji} {stat.label}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
          {[
            { value: MOCK_STATS.tasksCompleted, label: "Tasks Done", emoji: "✅" },
            { value: MOCK_STATS.bestStreak, label: "Best Streak", emoji: "⚡" },
            { value: `${MOCK_STATS.achievementsEarned}/${MOCK_STATS.totalAchievements}`, label: "Badges", emoji: "🎖️" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <p className="text-lg font-bold text-text-primary">{stat.value}</p>
              <p className="text-[10px] text-text-muted mt-1">{stat.emoji} {stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Custom Tasks */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Your Custom Tasks 🎯
          </p>
          <motion.button
            onClick={() => setShowAddTask(!showAddTask)}
            className="text-xs text-accent-violet font-semibold cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            {showAddTask ? "Cancel" : "+ Add"}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAddTask && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Task name..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
                  className="flex-1 px-3 py-2 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
                />
                <motion.button
                  onClick={addCustomTask}
                  className="px-4 py-2 rounded-xl bg-accent-violet text-white text-sm font-semibold cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  Add
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {customTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface/50 border border-border/50"
            >
              <span className="text-lg">{task.emoji}</span>
              <p className="flex-1 text-sm font-medium text-text-primary">{task.name}</p>
              <motion.button
                onClick={() => removeCustomTask(task.id)}
                className="text-text-muted hover:text-accent-red transition-colors cursor-pointer text-sm p-1"
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </motion.div>
          ))}
          {customTasks.length === 0 && (
            <p className="text-xs text-text-muted text-center py-3">
              No custom tasks. Add some to personalize your challenge!
            </p>
          )}
        </div>
      </motion.div>

      {/* Settings */}
      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4">
          Notifications 🔔
        </p>
        <div className="space-y-4">
          {/* Push toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Push Notifications</p>
              <p className="text-xs text-text-muted">Daily reminders & squad updates</p>
            </div>
            <motion.button
              onClick={() => setPushEnabled(!pushEnabled)}
              className={cn(
                "w-12 h-7 rounded-full relative cursor-pointer transition-colors",
                pushEnabled ? "bg-accent-emerald" : "bg-bg-surface border border-border"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white absolute top-1"
                animate={{ left: pushEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          {/* Email toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Email Summaries</p>
              <p className="text-xs text-text-muted">Weekly progress reports</p>
            </div>
            <motion.button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={cn(
                "w-12 h-7 rounded-full relative cursor-pointer transition-colors",
                emailEnabled ? "bg-accent-emerald" : "bg-bg-surface border border-border"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white absolute top-1"
                animate={{ left: emailEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3 rounded-2xl border border-accent-red/30 text-accent-red font-semibold text-sm hover:bg-accent-red/10 transition-colors cursor-pointer disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {signingOut ? "Signing out..." : "Sign Out 👋"}
        </motion.button>
      </motion.div>
    </div>
  );
}
