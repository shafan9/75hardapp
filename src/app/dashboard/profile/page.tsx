"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { springs } from "@/lib/animations";

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

type SectionKey = "achievements" | "history" | "custom" | "notifications" | "account";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { group } = useGroup({ enabled: !loading && !!user });
  const { customTasks, addCustomTask, removeCustomTask, currentDay } = useChecklist(group?.id, {
    enabled: !loading && !!user,
  });
  const { earned } = useAchievements(user?.id, group?.id);

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>("achievements");

  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [pushConfigured, setPushConfigured] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [smsConfigured, setSmsConfigured] = useState(true);

  const [phoneE164, setPhoneE164] = useState("");
  const [timezone, setTimezone] = useState(localTimezone);
  const [reminderTime, setReminderTime] = useState("21:00");

  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [totalCompletions, setTotalCompletions] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    async function loadProfileState() {
      const [settingsResult, statsResponse, configResponse] = await Promise.all([
        supabase
          .from("user_settings")
          .select("in_app_enabled, push_enabled, email_enabled, sms_enabled, phone_e164, timezone, reminder_time")
          .eq("user_id", userId)
          .maybeSingle(),
        fetch("/api/profile/stats", { method: "GET", cache: "no-store" }),
        fetch("/api/notifications/config", { method: "GET", cache: "no-store" }),
      ]);

      if (settingsResult.data) {
        setInAppEnabled(Boolean(settingsResult.data.in_app_enabled ?? true));
        setPushEnabled(Boolean(settingsResult.data.push_enabled));
        setEmailEnabled(Boolean(settingsResult.data.email_enabled));
        setSmsEnabled(Boolean(settingsResult.data.sms_enabled));
        setPhoneE164(String(settingsResult.data.phone_e164 ?? ""));
        setTimezone(String(settingsResult.data.timezone ?? localTimezone));
        setReminderTime(String(settingsResult.data.reminder_time ?? "21:00").slice(0, 5));
      }

      if (configResponse.ok) {
        const config = (await configResponse.json().catch(() => ({}))) as {
          pushConfigured?: unknown;
          emailConfigured?: unknown;
          smsConfigured?: unknown;
        };

        setPushConfigured(Boolean(config.pushConfigured));
        setEmailConfigured(Boolean(config.emailConfigured));
        setSmsConfigured(Boolean(config.smsConfigured));
      }

      if (statsResponse.ok) {
        const payload = (await statsResponse.json().catch(() => ({}))) as {
          totalCompletions?: number;
          bestStreak?: number;
        };

        setTotalCompletions(Number(payload.totalCompletions ?? 0));
        setBestStreak(Number(payload.bestStreak ?? 0));
      }
    }

    void loadProfileState();
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to remove push subscription.");
    }

    return true;
  }

  async function toggleChannel(channel: NotificationChannel) {
    if (savingSettings) return;

    if (channel === "push" && !pushConfigured) {
      toast.error("Push notifications are not configured yet.");
      return;
    }

    if (channel === "email" && !emailConfigured) {
      toast.error("Email notifications are not configured yet.");
      return;
    }

    if (channel === "sms" && !smsConfigured) {
      toast.error("SMS notifications are not configured yet.");
      return;
    }

    if (channel === "in_app") {
      const next = !inAppEnabled;
      setInAppEnabled(next);
      const ok = await persistSettings({ in_app_enabled: next });
      if (!ok) setInAppEnabled(!next);
      return;
    }

    if (channel === "push") {
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
      if (!ok) setPushEnabled(!next);
      return;
    }

    if (channel === "email") {
      const next = !emailEnabled;
      setEmailEnabled(next);
      const ok = await persistSettings({ email_enabled: next });
      if (!ok) setEmailEnabled(!next);
      return;
    }

    const next = !smsEnabled;
    setSmsEnabled(next);
    const ok = await persistSettings({ sms_enabled: next });
    if (!ok) setSmsEnabled(!next);
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
          className="h-10 w-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-2xl">
        <p className="text-3xl" aria-hidden="true">👤</p>
        <h1 className="mt-3 text-xl font-black text-text-primary">Sign in required</h1>
        <p className="mt-2 text-sm text-text-secondary">Please sign in to view your profile.</p>
      </div>
    );
  }

  const stats = [
    { label: "Current Streak", value: currentDay, accent: "text-accent-orange", icon: "🔥" },
    { label: "Tasks Done", value: totalCompletions, accent: "text-accent-cyan", icon: "✅" },
    { label: "Best Streak", value: bestStreak, accent: "text-accent-gold", icon: "⚡" },
    { label: "Badges", value: earned.length, accent: "text-accent-info", icon: "🏅" },
  ];

  const sections: Array<{ key: SectionKey; label: string; description: string }> = [
    { key: "achievements", label: "Achievements", description: "Badge progress" },
    { key: "history", label: "History", description: "Past-day edits" },
    { key: "custom", label: "Custom Tasks", description: "Manage your personal tasks" },
    { key: "notifications", label: "Notifications", description: "Reminder channels" },
    { key: "account", label: "Account", description: "Sign out" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
      <motion.section
        className="glass-card rounded-[30px] p-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
      >
        <div className="mx-auto inline-flex rounded-full border-2 border-accent-cyan/45 p-[3px]">
          <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-gradient-to-br from-accent-cyan/80 to-accent-info/65 text-4xl font-black text-white">
            {profile.display_name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>

        {isEditingName ? (
          <div className="mx-auto mt-4 flex w-full max-w-sm items-center gap-2">
            <input
              type="text"
              name="display_name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void saveName();
                }
              }}
              className="flex-1 rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-center text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => {
                void saveName();
              }}
              className="rounded-xl bg-gradient-to-r from-accent-cyan to-accent-info px-3 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="mt-4 inline-flex items-center gap-2 text-2xl font-black text-text-primary"
          >
            {profile.display_name || "Anonymous"}
            <span className="text-sm text-text-muted">Edit</span>
          </button>
        )}

        <p className="mt-2 text-sm text-text-secondary">{user.email}</p>
      </motion.section>

      <motion.section
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.03 }}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{stat.label}</p>
            <p className={cn("mt-1 text-3xl font-black", stat.accent)}>
              {stat.icon} {stat.value}
            </p>
          </div>
        ))}
      </motion.section>

      <motion.section
        className="space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.06 }}
      >
        {sections.map((section) => {
          const isOpen = openSection === section.key;
          return (
            <div key={section.key} className="glass-card rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection((prev) => (prev === section.key ? null : section.key))}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{section.label}</p>
                  <p className="text-xs text-text-muted">{section.description}</p>
                </div>
                <span className="text-text-secondary">{isOpen ? "−" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={springs.smooth}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/10 px-4 py-4">
                      {section.key === "achievements" ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {ACHIEVEMENTS.map((achievement) => {
                            const unlocked = earned.includes(achievement.key);
                            return (
                              <div
                                key={achievement.key}
                                className={
                                  "rounded-xl border p-3 text-center " +
                                  (unlocked
                                    ? "border-accent-cyan/30 bg-accent-cyan/10"
                                    : "border-white/10 bg-white/[0.03]")
                                }
                              >
                                <p className="text-xl" aria-hidden="true">{achievement.emoji}</p>
                                <p className="mt-1 text-xs font-semibold text-text-primary">{achievement.label}</p>
                                <p className="mt-1 text-[11px] text-text-muted">{achievement.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {section.key === "history" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-text-secondary">
                            Review and edit past days when you miss a check-in.
                          </p>
                          <Link
                            href="/dashboard/history"
                            className="inline-flex rounded-xl bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2 text-sm font-semibold text-white"
                          >
                            Open History
                          </Link>
                        </div>
                      ) : null}

                      {section.key === "custom" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-text-secondary">Your custom tasks</p>
                            <button
                              type="button"
                              onClick={() => setShowAddTask((value) => !value)}
                              className="rounded-full bg-accent-cyan/14 px-3 py-1 text-xs font-semibold text-accent-cyan"
                            >
                              {showAddTask ? "Cancel" : "+ Add"}
                            </button>
                          </div>

                          <AnimatePresence>
                            {showAddTask && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    name="profile_custom_task_name"
                                    value={newTaskName}
                                    onChange={(event) => setNewTaskName(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        void handleAddCustomTask();
                                      }
                                    }}
                                    placeholder="Task name..."
                                    className="flex-1 rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleAddCustomTask();
                                    }}
                                    className="rounded-xl bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2 text-sm font-semibold text-white"
                                  >
                                    Add
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="space-y-2">
                            {customTasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                              >
                                <span aria-hidden="true">{task.emoji}</span>
                                <span className="flex-1 text-sm text-text-primary">{task.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void removeCustomTask(task.id);
                                  }}
                                  className="text-xs text-text-muted hover:text-accent-danger"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            {customTasks.length === 0 ? (
                              <p className="text-xs text-text-muted">No custom tasks yet.</p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {section.key === "notifications" ? (
                        <div className="space-y-3">
                          {[
                            {
                              key: "in_app" as NotificationChannel,
                              title: "In-App Alerts",
                              subtitle: "Shown in your alerts tab",
                              enabled: inAppEnabled,
                              configured: true,
                            },
                            {
                              key: "push" as NotificationChannel,
                              title: "Push Notifications",
                              subtitle: "Browser or phone reminders",
                              enabled: pushEnabled,
                              configured: pushConfigured,
                            },
                            {
                              key: "email" as NotificationChannel,
                              title: "Email Notifications",
                              subtitle: "Reminder emails",
                              enabled: emailEnabled,
                              configured: emailConfigured,
                            },
                            {
                              key: "sms" as NotificationChannel,
                              title: "SMS Notifications",
                              subtitle: "Text reminders",
                              enabled: smsEnabled,
                              configured: smsConfigured,
                            },
                          ].map((row) => (
                            <div key={row.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{row.title}</p>
                                <p className="text-xs text-text-muted">{row.subtitle}</p>
                                {!row.configured ? (
                                  <p className="text-xs text-accent-warning">Not configured yet</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  void toggleChannel(row.key);
                                }}
                                aria-label={`Toggle ${row.title}`}
                                role="switch"
                                aria-checked={row.enabled}
                                disabled={savingSettings || !row.configured}
                                className={cn(
                                  "relative h-7 w-12 rounded-full transition-colors",
                                  row.enabled ? "bg-accent-success" : "border border-white/15 bg-bg-surface",
                                  (savingSettings || !row.configured) && "opacity-60"
                                )}
                              >
                                <motion.div
                                  className="absolute top-1 h-5 w-5 rounded-full bg-white"
                                  animate={{ left: row.enabled ? 26 : 4 }}
                                  transition={springs.snappy}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {section.key === "account" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-text-secondary">
                            Sign out from this browser session.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void handleSignOut();
                            }}
                            disabled={signingOut}
                            className="rounded-xl border border-accent-danger/35 px-4 py-2 text-sm font-semibold text-accent-danger disabled:opacity-60"
                          >
                            {signingOut ? "Signing out..." : "Sign out"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.section>
    </div>
  );
}
