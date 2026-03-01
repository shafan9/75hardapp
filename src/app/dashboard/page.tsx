"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DailyChecklist } from "@/components/checklist/daily-checklist";
import { TaskItem } from "@/components/checklist/task-item";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast-provider";
import { TOTAL_DAYS } from "@/lib/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { springs } from "@/lib/animations";
import { getMotivationalQuoteForDay, getProgressPercent, getStreakMessage } from "@/lib/utils";

type HistoryTask = {
  key: string;
  label: string;
  description: string;
  emoji: string;
  optional: boolean;
  completed: boolean;
  note: string | null;
};

type HistoryPayload = {
  day: number;
  date: string;
  isToday: boolean;
  currentSquadDay: number;
  squadToday: string;
  squadTimezone: string;
  tasks: HistoryTask[];
  error?: string;
};

type DayStatus = "complete" | "partial" | "empty";

function getRequiredStats(tasks: HistoryTask[]) {
  const required = tasks.filter((task) => !task.optional);
  const done = required.filter((task) => task.completed).length;
  return { done, total: required.length };
}

function getStatus(tasks: HistoryTask[]): DayStatus {
  const { done, total } = getRequiredStats(tasks);
  if (total === 0 || done === 0) return "empty";
  if (done >= total) return "complete";
  return "partial";
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();

  const authReady = !authLoading;
  const authEnabled = authReady && Boolean(user);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const { group, loading: groupLoading } = useGroup({ enabled: authEnabled });

  const {
    todayCompleted,
    customTasks,
    loading: checklistLoading,
    toggleTask,
    addNote,
    addCustomTask,
    removeCustomTask,
    isAllDone,
    currentDay,
    refreshChecklist,
  } = useChecklist(group?.id, { enabled: authEnabled });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayData, setDayData] = useState<Record<number, HistoryPayload>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMutating, setHistoryMutating] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loading = authLoading || (authEnabled && (groupLoading || checklistLoading));

  const dayNumber = Math.min(Math.max(currentDay || 1, 1), TOTAL_DAYS);

  useEffect(() => {
    setSelectedDay((prev) => {
      if (!prev) return dayNumber;
      return prev > dayNumber ? dayNumber : prev;
    });
  }, [dayNumber]);

  const fetchDay = useCallback(
    async (day: number) => {
      if (!group?.id || !user?.id) return null;

      const params = new URLSearchParams({
        groupId: group.id,
        userId: user.id,
        day: String(day),
      });

      const response = await fetch(`/api/group/member-day?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "X-Timezone": timezone },
      });

      const payload = (await response.json().catch(() => ({}))) as HistoryPayload;
      if (!response.ok) {
        throw new Error(payload.error || `Could not load day ${day}.`);
      }

      return payload;
    },
    [group?.id, timezone, user?.id]
  );

  const refreshRecentDays = useCallback(async () => {
    if (!group?.id || !user?.id) return;

    const start = Math.max(dayNumber - 6, 1);
    const days = Array.from({ length: dayNumber - start + 1 }, (_, index) => start + index);

    setHistoryLoading(true);
    try {
      const results = await Promise.all(days.map((day) => fetchDay(day)));
      const next: Record<number, HistoryPayload> = {};

      for (const payload of results) {
        if (!payload) continue;
        next[payload.day] = payload;
      }

      setDayData((prev) => ({ ...prev, ...next }));
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  }, [dayNumber, fetchDay, group?.id, user?.id]);

  useEffect(() => {
    if (!group?.id || !user?.id || !dayNumber) return;
    void refreshRecentDays();
  }, [dayNumber, group?.id, refreshRecentDays, user?.id]);

  const currentSelectedDay = selectedDay ?? dayNumber;
  const isViewingToday = currentSelectedDay === dayNumber;
  const selectedHistory = dayData[currentSelectedDay];

  const selectedTasks = useMemo(
    () => (isViewingToday ? null : selectedHistory?.tasks ?? []),
    [isViewingToday, selectedHistory]
  );

  const todayRequiredStats = useMemo(() => {
    const requiredKeys = ["workout_outdoor", "workout_indoor", "diet", "water", "reading"];
    const done = requiredKeys.filter((key) => todayCompleted.includes(key)).length;
    return { done, total: requiredKeys.length };
  }, [todayCompleted]);

  const selectedRequiredStats = useMemo(() => {
    if (isViewingToday) return todayRequiredStats;
    return getRequiredStats(selectedTasks ?? []);
  }, [isViewingToday, selectedTasks, todayRequiredStats]);

  const displayDay = isViewingToday ? dayNumber : currentSelectedDay;
  const progressPercent = getProgressPercent(displayDay, TOTAL_DAYS);
  const quoteOfTheDay = getMotivationalQuoteForDay(displayDay);
  const streakMessage = getStreakMessage(dayNumber);

  const dayPickerItems = useMemo(() => {
    const start = Math.max(dayNumber - 6, 1);
    return Array.from({ length: dayNumber - start + 1 }, (_, index) => {
      const day = start + index;
      const payload = dayData[day];
      const status = payload ? getStatus(payload.tasks) : (day === dayNumber ? (isAllDone ? "complete" : "partial") : "empty");

      return {
        day,
        date: payload?.date,
        status,
        isToday: day === dayNumber,
      };
    });
  }, [dayData, dayNumber, isAllDone]);

  const mutatePastDayTask = useCallback(
    async (taskKey: string, note?: string) => {
      if (!group?.id || !selectedHistory || isViewingToday) return;

      setHistoryMutating(true);
      setHistoryError(null);

      const action = typeof note === "string" ? "addNote" : "toggleTask";
      const body = {
        action,
        groupId: group.id,
        taskKey,
        targetDate: selectedHistory.date,
        ...(typeof note === "string" ? { note } : {}),
      };

      try {
        const response = await fetch("/api/checklist", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Timezone": timezone,
          },
          body: JSON.stringify(body),
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Could not update this day.");
        }

        const refreshed = await fetchDay(currentSelectedDay);
        if (refreshed) {
          setDayData((prev) => ({ ...prev, [refreshed.day]: refreshed }));
        }

        await refreshChecklist();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update this day.";
        setHistoryError(message);
        toast.error(message);
      } finally {
        setHistoryMutating(false);
      }
    },
    [currentSelectedDay, fetchDay, group?.id, isViewingToday, refreshChecklist, selectedHistory, timezone, toast]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-2xl">
        <p className="text-3xl" aria-hidden="true">🔐</p>
        <h1 className="mt-3 text-xl font-black text-text-primary">Sign in required</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in to open your dashboard and complete daily tasks.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2.5 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const flameScale = Math.min(1 + displayDay / 180, 1.35);

  return (
    <div className="relative mx-auto w-full max-w-3xl space-y-5 pb-6">
      <motion.section
        className="glass-card rounded-[30px] p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
      >
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            variant="hero"
            progress={progressPercent}
            label={String(displayDay)}
            sublabel="DAY"
          />

          <h1 className="mt-5 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            Day {displayDay} of {TOTAL_DAYS}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <motion.span
              animate={{ scale: [flameScale, flameScale * 1.07, flameScale] }}
              transition={{ duration: 1.3, repeat: Infinity }}
              className="inline-block"
              aria-hidden="true"
            >
              🔥
            </motion.span>
            {isViewingToday ? streakMessage : `Viewing day ${displayDay}`}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {selectedRequiredStats.done}/{selectedRequiredStats.total} required tasks done
          </p>
        </div>

        <div className="mt-5 -mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 px-1">
            {dayPickerItems.map((item) => {
              const isActive = item.day === currentSelectedDay;
              const statusClass =
                item.status === "complete"
                  ? "bg-accent-success"
                  : item.status === "partial"
                    ? "bg-accent-orange"
                    : "bg-white/20";

              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={async () => {
                    setSelectedDay(item.day);
                    if (!dayData[item.day]) {
                      try {
                        const payload = await fetchDay(item.day);
                        if (payload) {
                          setDayData((prev) => ({ ...prev, [payload.day]: payload }));
                        }
                      } catch {
                        toast.error(`Could not load Day ${item.day}.`);
                      }
                    }
                  }}
                  className={
                    `rounded-2xl border px-3 py-2 text-left transition-colors ` +
                    (isActive
                      ? "border-accent-cyan bg-accent-cyan/12"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]")
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {item.isToday ? "Today" : `Day ${item.day}`}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${statusClass}`} aria-hidden="true" />
                    <span className="text-xs font-semibold text-text-secondary">
                      {item.date ? item.date.slice(5) : `D${item.day}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="glass-card rounded-[30px] p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.03 }}
      >
        <p className="text-4xl leading-none text-accent-cyan/25" aria-hidden="true">&ldquo;</p>
        <p className="-mt-2 text-lg italic leading-relaxed text-text-primary">{quoteOfTheDay.text}</p>
        <p className="mt-2 text-sm text-text-secondary">{quoteOfTheDay.author}</p>
      </motion.section>

      <motion.section
        className="glass-card rounded-[30px] p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.smooth, delay: 0.06 }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-text-primary">Today&apos;s Tasks</h2>
            <p className="text-xs text-text-muted">
              {isViewingToday
                ? "Complete your checklist and trigger celebration."
                : `Editing Day ${currentSelectedDay} (${selectedHistory?.date ?? ""})`}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-text-secondary">
            {selectedRequiredStats.done}/{selectedRequiredStats.total}
          </span>
        </div>

        {!group ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-text-secondary">
            Join or create a squad in the <Link href="/dashboard/group" className="text-accent-cyan">Squad tab</Link> to unlock your checklist.
          </div>
        ) : isViewingToday ? (
          <DailyChecklist
            completions={todayCompleted}
            customTasks={customTasks}
            onToggleTask={toggleTask}
            onAddNote={addNote}
            onAddCustomTask={addCustomTask}
            onRemoveCustomTask={removeCustomTask}
            isAllDone={isAllDone}
            currentDay={dayNumber}
          />
        ) : historyLoading && !selectedHistory ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-text-secondary">
            Loading day {currentSelectedDay}…
          </div>
        ) : (
          <div className="space-y-3">
            {historyError ? <p className="text-sm text-accent-danger">{historyError}</p> : null}
            {(selectedTasks ?? []).map((task) => (
              <TaskItem
                key={task.key}
                taskKey={task.key}
                emoji={task.emoji}
                label={task.label}
                description={task.description}
                isCompleted={task.completed}
                isOptional={task.optional}
                note={task.note ?? ""}
                onToggle={() => {
                  void mutatePastDayTask(task.key);
                }}
                onAddNote={(note) => {
                  void mutatePastDayTask(task.key, note);
                }}
              />
            ))}
            {historyMutating ? (
              <p className="text-xs text-text-muted">Saving updates…</p>
            ) : null}
          </div>
        )}
      </motion.section>

      <p className="px-1 text-center text-xs text-text-muted">
        Hi {profile?.display_name || "there"}. Squad setup and invites live in the Squad tab.
      </p>
    </div>
  );
}
