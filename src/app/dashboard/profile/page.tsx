"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/constants";
import { useAchievements } from "@/lib/hooks/use-achievements";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { group } = useGroup();
  const { customTasks, addCustomTask, removeCustomTask, currentDay } = useChecklist(group?.id);
  const { earned } = useAchievements(user?.id, group?.id);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    async function loadSettingsAndStats() {
      const [settingsResult, completionsResult, progressResult] = await Promise.all([
        supabase
          .from("user_settings")
          .select("push_enabled, email_enabled")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("task_completions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("challenge_progress")
          .select("current_day")
          .eq("user_id", userId),
      ]);

      if (settingsResult.data) {
        setPushEnabled(Boolean(settingsResult.data.push_enabled));
        setEmailEnabled(Boolean(settingsResult.data.email_enabled));
      }

      setTotalCompletions(completionsResult.count ?? 0);

      const best = Math.max(
        0,
        ...(progressResult.data ?? []).map((row) =>
          Number((row as { current_day: number }).current_day || 0)
        )
      );
      setBestStreak(best);
    }

    void loadSettingsAndStats();
  }, [supabase, user?.id]);

  async function persistSettings(nextPush: boolean, nextEmail: boolean) {
    if (!user?.id) return false;

    setSavingSettings(true);
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        push_enabled: nextPush,
        email_enabled: nextEmail,
      },
      { onConflict: "user_id" }
    );
    setSavingSettings(false);

    if (error) {
      console.error("Error saving settings:", error);
      toast.error("Could not save notification settings.");
      return false;
    }

    toast.success("Notification settings saved.");
    return true;
  }

  async function togglePush() {
    const next = !pushEnabled;
    setPushEnabled(next);
    const ok = await persistSettings(next, emailEnabled);
    if (!ok) setPushEnabled(!next);
  }

  async function toggleEmail() {
    const next = !emailEnabled;
    setEmailEnabled(next);
    const ok = await persistSettings(pushEnabled, next);
    if (!ok) setEmailEnabled(!next);
  }

  async function saveName() {
    if (!displayName.trim()) return;
    await updateProfile({ display_name: displayName.trim() });
    setIsEditingName(false);
  }

  async function handleAddCustomTask() {
    if (!newTaskName.trim()) return;
    await addCustomTask(newTaskName.trim(), "🎯");
    setNewTaskName("");
    setShowAddTask(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

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

  if (!user || !profile) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">Profile</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">👤</p>
          <p className="mt-2 text-sm text-text-secondary">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black gradient-text">Profile</h1>
      </motion.div>

      <motion.div
        className="glass-card flex flex-col items-center gap-4 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet via-accent-pink to-accent-amber text-3xl font-bold text-white">
          {profile.display_name?.[0]?.toUpperCase() || "?"}
        </div>

        {isEditingName ? (
          <div className="flex w-full max-w-xs items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              className="flex-1 rounded-xl border border-border bg-bg-surface px-3 py-2 text-center text-sm text-text-primary focus:border-accent-violet/50 focus:outline-none"
            />
            <motion.button
              onClick={saveName}
              className="rounded-xl bg-accent-violet px-3 py-2 text-sm font-semibold text-white"
              whileTap={{ scale: 0.95 }}
            >
              Save
            </motion.button>
          </div>
        ) : (
          <motion.button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-lg font-bold text-text-primary">
              {profile.display_name || "Anonymous"}
            </span>
            <span className="text-sm text-text-muted">✏️</span>
          </motion.button>
        )}

        <p className="text-xs text-text-muted">{user.email}</p>
      </motion.div>

      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Your Stats 📊
        </p>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-accent-amber">{currentDay}</p>
            <p className="mt-1 text-[10px] text-text-muted">🔥 Current Streak</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-violet">{earned.length}</p>
            <p className="mt-1 text-[10px] text-text-muted">🏅 Achievements</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-emerald">{totalCompletions}</p>
            <p className="mt-1 text-[10px] text-text-muted">✅ Tasks Done</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/50 pt-4 text-center">
          <div>
            <p className="text-lg font-bold text-text-primary">{bestStreak}</p>
            <p className="mt-1 text-[10px] text-text-muted">⚡ Best Streak</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">
              {earned.length}/{ACHIEVEMENTS.length}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">🎖️ Badges</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Your Custom Tasks 🎯
          </p>
          <motion.button
            onClick={() => setShowAddTask(!showAddTask)}
            className="text-xs font-semibold text-accent-violet"
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
              className="mb-3 overflow-hidden"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Task name..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddCustomTask()}
                  className="flex-1 rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus:outline-none"
                />
                <motion.button
                  onClick={() => {
                    void handleAddCustomTask();
                  }}
                  className="rounded-xl bg-accent-violet px-4 py-2 text-sm font-semibold text-white"
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
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-bg-surface/50 p-3"
            >
              <span className="text-lg">{task.emoji}</span>
              <p className="flex-1 text-sm font-medium text-text-primary">{task.name}</p>
              <motion.button
                onClick={() => {
                  void removeCustomTask(task.id);
                }}
                className="p-1 text-sm text-text-muted transition-colors hover:text-accent-red"
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </motion.div>
          ))}

          {customTasks.length === 0 && (
            <p className="py-3 text-center text-xs text-text-muted">
              No custom tasks yet.
            </p>
          )}
        </div>
      </motion.div>

      <motion.div
        className="glass-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Notifications 🔔
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Push Notifications</p>
              <p className="text-xs text-text-muted">Daily reminders and squad updates</p>
            </div>
            <motion.button
              onClick={() => {
                void togglePush();
              }}
              disabled={savingSettings}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                pushEnabled ? "bg-accent-emerald" : "border border-border bg-bg-surface",
                savingSettings && "opacity-60"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 h-5 w-5 rounded-full bg-white"
                animate={{ left: pushEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Email Summaries</p>
              <p className="text-xs text-text-muted">Weekly progress reports</p>
            </div>
            <motion.button
              onClick={() => {
                void toggleEmail();
              }}
              disabled={savingSettings}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                emailEnabled ? "bg-accent-emerald" : "border border-border bg-bg-surface",
                savingSettings && "opacity-60"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 h-5 w-5 rounded-full bg-white"
                animate={{ left: emailEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.button
        onClick={() => {
          void handleSignOut();
        }}
        disabled={signingOut}
        className="w-full rounded-2xl border border-accent-red/30 py-3 text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10 disabled:opacity-50"
        whileTap={{ scale: 0.98 }}
      >
        {signingOut ? "Signing out..." : "Sign Out 👋"}
      </motion.button>
    </div>
  );
}
