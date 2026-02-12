"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/constants";
import { useAchievements } from "@/lib/hooks/use-achievements";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { subscribeUserToPush, unsubscribeUserFromPush } from "@/lib/push";
import { cn } from "@/lib/utils";
import type { NotificationChannel } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

interface NotificationSettingsForm {
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_e164: string;
  timezone: string;
  reminder_time: string;
}

function normalizeReminderTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "21:00:00";
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "21:00";
  return value.slice(0, 5);
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { group } = useGroup();
  const { customTasks, addCustomTask, removeCustomTask, currentDay } = useChecklist(group?.id);
  const { earned } = useAchievements(user?.id, group?.id);

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneE164, setPhoneE164] = useState("");
  const [timezone, setTimezone] = useState(localTimezone);
  const [reminderTime, setReminderTime] = useState("21:00");
  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTestChannel, setSendingTestChannel] = useState<NotificationChannel | null>(null);
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
          .select(
            "in_app_enabled, push_enabled, email_enabled, sms_enabled, phone_e164, timezone, reminder_time"
          )
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
        setInAppEnabled(Boolean(settingsResult.data.in_app_enabled ?? true));
        setPushEnabled(Boolean(settingsResult.data.push_enabled));
        setEmailEnabled(Boolean(settingsResult.data.email_enabled));
        setSmsEnabled(Boolean(settingsResult.data.sms_enabled));
        setPhoneE164(String(settingsResult.data.phone_e164 ?? ""));
        setTimezone(String(settingsResult.data.timezone ?? localTimezone));
        setReminderTime(toTimeInputValue(String(settingsResult.data.reminder_time ?? "21:00")));
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
  }, [localTimezone, supabase, user?.id]);

  async function persistSettings(settings?: Partial<NotificationSettingsForm>) {
    if (!user?.id) return false;

    const payload: NotificationSettingsForm = {
      in_app_enabled: settings?.in_app_enabled ?? inAppEnabled,
      push_enabled: settings?.push_enabled ?? pushEnabled,
      email_enabled: settings?.email_enabled ?? emailEnabled,
      sms_enabled: settings?.sms_enabled ?? smsEnabled,
      phone_e164: settings?.phone_e164 ?? phoneE164,
      timezone: settings?.timezone ?? timezone,
      reminder_time: settings?.reminder_time ?? reminderTime,
    };

    setSavingSettings(true);
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        in_app_enabled: payload.in_app_enabled,
        push_enabled: payload.push_enabled,
        email_enabled: payload.email_enabled,
        sms_enabled: payload.sms_enabled,
        phone_e164: payload.phone_e164.trim() || null,
        timezone: payload.timezone.trim() || localTimezone,
        reminder_time: normalizeReminderTime(payload.reminder_time),
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

  async function registerPushSubscription() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("Push is not configured yet. Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
      return false;
    }

    const subscription = await subscribeUserToPush(vapidPublicKey);
    const response = await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to save push subscription.");
    }

    return true;
  }

  async function removePushSubscription() {
    const { endpoint } = await unsubscribeUserFromPush();
    if (!endpoint) return true;

    const response = await fetch("/api/notifications/push-subscription", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to remove push subscription.");
    }

    return true;
  }

  async function toggleInApp() {
    const next = !inAppEnabled;
    setInAppEnabled(next);
    const ok = await persistSettings({ in_app_enabled: next });
    if (!ok) setInAppEnabled(!next);
  }

  async function togglePush() {
    const next = !pushEnabled;

    try {
      if (next) {
        await registerPushSubscription();
      } else {
        await removePushSubscription();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not update push subscription.");
      return;
    }

    setPushEnabled(next);
    const ok = await persistSettings({ push_enabled: next });
    if (!ok) {
      setPushEnabled(!next);
    }
  }

  async function toggleEmail() {
    const next = !emailEnabled;
    setEmailEnabled(next);
    const ok = await persistSettings({ email_enabled: next });
    if (!ok) setEmailEnabled(!next);
  }

  async function toggleSms() {
    const next = !smsEnabled;
    setSmsEnabled(next);
    const ok = await persistSettings({ sms_enabled: next });
    if (!ok) setSmsEnabled(!next);
  }

  async function saveAdvancedSettings() {
    const ok = await persistSettings();
    if (!ok) return;
  }

  async function sendTest(channel: NotificationChannel) {
    setSendingTestChannel(channel);
    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel }),
    });
    setSendingTestChannel(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? `Could not send ${channel} test notification.`);
      return;
    }

    toast.success(`${channel.toUpperCase()} test notification sent.`);
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
              <p className="text-sm font-medium text-text-primary">In-App Alerts</p>
              <p className="text-xs text-text-muted">Shown in your Alerts tab</p>
            </div>
            <motion.button
              onClick={() => {
                void toggleInApp();
              }}
              disabled={savingSettings}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                inAppEnabled ? "bg-accent-emerald" : "border border-border bg-bg-surface",
                savingSettings && "opacity-60"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 h-5 w-5 rounded-full bg-white"
                animate={{ left: inAppEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Push Notifications</p>
              <p className="text-xs text-text-muted">Browser/phone push reminders</p>
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
              <p className="text-sm font-medium text-text-primary">Email Notifications</p>
              <p className="text-xs text-text-muted">Reminder emails to your account</p>
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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">SMS Notifications</p>
              <p className="text-xs text-text-muted">Text reminders to your phone</p>
            </div>
            <motion.button
              onClick={() => {
                void toggleSms();
              }}
              disabled={savingSettings}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                smsEnabled ? "bg-accent-emerald" : "border border-border bg-bg-surface",
                savingSettings && "opacity-60"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 h-5 w-5 rounded-full bg-white"
                animate={{ left: smsEnabled ? 26 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          <div className="grid gap-3 border-t border-border/50 pt-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-text-secondary">Phone (E.164 for SMS)</span>
              <input
                type="tel"
                placeholder="+15551234567"
                value={phoneE164}
                onChange={(event) => setPhoneE164(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-text-secondary">Timezone</span>
                <input
                  type="text"
                  placeholder="America/New_York"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus:outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-text-secondary">Daily reminder time</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-violet/50 focus:outline-none"
                />
              </label>
            </div>

            <button
              onClick={() => {
                void saveAdvancedSettings();
              }}
              disabled={savingSettings}
              className="rounded-xl bg-accent-violet px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save Reminder Details
            </button>
          </div>

          <div className="grid gap-2 border-t border-border/50 pt-3 sm:grid-cols-2">
            <button
              onClick={() => {
                void sendTest("in_app");
              }}
              disabled={sendingTestChannel !== null}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-60"
            >
              {sendingTestChannel === "in_app" ? "Sending..." : "Test In-App"}
            </button>
            <button
              onClick={() => {
                void sendTest("push");
              }}
              disabled={sendingTestChannel !== null}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-60"
            >
              {sendingTestChannel === "push" ? "Sending..." : "Test Push"}
            </button>
            <button
              onClick={() => {
                void sendTest("email");
              }}
              disabled={sendingTestChannel !== null}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-60"
            >
              {sendingTestChannel === "email" ? "Sending..." : "Test Email"}
            </button>
            <button
              onClick={() => {
                void sendTest("sms");
              }}
              disabled={sendingTestChannel !== null}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-60"
            >
              {sendingTestChannel === "sms" ? "Sending..." : "Test SMS"}
            </button>
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
