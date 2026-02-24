"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TaskItem } from "@/components/checklist/task-item";
import { useAuth } from "@/lib/hooks/use-auth";
import { useGroup } from "@/lib/hooks/use-group";
import { useToast } from "@/components/ui/toast-provider";

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
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
  day: number;
  date: string;
  isToday: boolean;
  currentSquadDay: number;
  squadStartDate: string;
  squadToday: string;
  squadTimezone: string;
  tasks: HistoryTask[];
  error?: string;
};

const TOTAL_DAYS = 75;

export default function HistoryPage() {
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup({ enabled: !authLoading && !!user });

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const [day, setDay] = useState<number | null>(null);
  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingTaskKey, setMutatingTaskKey] = useState<string | null>(null);
  const [savingNoteTaskKey, setSavingNoteTaskKey] = useState<string | null>(null);

  const loadDay = useCallback(
    async (requestedDay: number | null) => {
      if (!group?.id || !user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        qs.set("groupId", group.id);
        qs.set("userId", user.id);
        if (requestedDay) qs.set("day", String(requestedDay));

        const response = await fetch(`/api/group/member-day?${qs.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "X-Timezone": timezone },
        });

        const data = (await response.json().catch(() => ({}))) as HistoryPayload;
        if (!response.ok) {
          throw new Error(data.error || "Could not load history.");
        }

        setPayload(data);
        setDay(data.day);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load history.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [group?.id, timezone, user?.id]
  );

  useEffect(() => {
    if (!group?.id || !user?.id) return;
    void loadDay(day);
  }, [day, group?.id, user?.id, loadDay]);

  const canGoPrev = (day ?? 1) > 1;
  const maxDay = payload?.currentSquadDay ?? TOTAL_DAYS;
  const canGoNext = (day ?? 1) < maxDay;
  const canEditSelectedDay = payload ? payload.date <= payload.squadToday : false;

  const requiredDone = useMemo(
    () => payload?.tasks.filter((task) => !task.optional && task.completed).length ?? 0,
    [payload]
  );
  const requiredTotal = useMemo(
    () => payload?.tasks.filter((task) => !task.optional).length ?? 0,
    [payload]
  );

  const toggleTask = useCallback(
    async (taskKey: string) => {
      if (!group?.id || !payload || !canEditSelectedDay) return;

      setMutatingTaskKey(taskKey);
      setError(null);

      try {
        const response = await fetch("/api/checklist", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Timezone": timezone,
          },
          body: JSON.stringify({
            action: "toggleTask",
            groupId: group.id,
            taskKey,
            targetDate: payload.date,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error || "Could not update task.");
        }

        await loadDay(payload.day);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not update task.";
        setError(message);
        toast.error(message);
      } finally {
        setMutatingTaskKey(null);
      }
    },
    [canEditSelectedDay, group?.id, loadDay, payload, timezone, toast]
  );

  const saveNote = useCallback(
    async (taskKey: string, note: string) => {
      if (!group?.id || !payload || !canEditSelectedDay) return;

      setSavingNoteTaskKey(taskKey);
      setError(null);

      try {
        const response = await fetch("/api/checklist", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Timezone": timezone,
          },
          body: JSON.stringify({
            action: "addNote",
            groupId: group.id,
            taskKey,
            note,
            targetDate: payload.date,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error || "Could not save note.");
        }

        toast.success(payload.isToday ? "Note saved." : `Updated Day ${payload.day}.`);
        await loadDay(payload.day);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save note.";
        setError(message);
        toast.error(message);
      } finally {
        setSavingNoteTaskKey(null);
      }
    },
    [canEditSelectedDay, group?.id, loadDay, payload, timezone, toast]
  );

  if (authLoading || groupLoading) {
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

  if (!user) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">History</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">🔐</p>
          <p className="mt-2 text-sm text-text-secondary">Please sign in to view your history.</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">History</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 text-sm text-text-secondary">
            Join a squad to unlock day-by-day history and backfill editing.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 pt-2">
      <motion.section className="glass-card p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">History</p>
            <h1 className="gradient-text text-2xl font-black sm:text-3xl">Your Progress Timeline</h1>
            {payload && (
              <p className="mt-1 text-sm text-text-secondary">
                Day {payload.day} of {TOTAL_DAYS} · {payload.date} ({payload.squadTimezone})
              </p>
            )}
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover"
          >
            Back to Today
          </Link>
        </div>
      </motion.section>

      <motion.section className="glass-card p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!canGoPrev || loading) return;
                void loadDay((day ?? 1) - 1);
              }}
              disabled={!canGoPrev || loading}
              className="rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-card-hover disabled:opacity-60"
            >
              Prev
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Day</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxDay}
                value={day ?? ""}
                onChange={(event) => setDay(event.target.value ? Number(event.target.value) : null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && day) {
                    void loadDay(Math.min(day, maxDay));
                  }
                }}
                onBlur={() => {
                  if (day) void loadDay(Math.min(day, maxDay));
                }}
                className="w-16 bg-transparent text-sm font-semibold text-text-primary focus-visible:outline-none"
                aria-label="Day number"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!canGoNext || loading) return;
                void loadDay((day ?? 1) + 1);
              }}
              disabled={!canGoNext || loading}
              className="rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-card-hover disabled:opacity-60"
            >
              Next
            </button>
          </div>

          <div className="text-right text-xs text-text-muted">
            <p>
              Required: <span className="font-semibold text-text-secondary">{requiredDone}/{requiredTotal}</span>
            </p>
            {payload && !payload.isToday && (
              <p className="mt-1">Backfill edits enabled for past days</p>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}
      </motion.section>

      <motion.section className="glass-card p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Daily Checklist</h2>
            <p className="mt-1 text-xs text-text-muted">
              {payload?.isToday ? "Today (live)" : "Past day (editable backfill)"}
            </p>
          </div>
          {(mutatingTaskKey || savingNoteTaskKey) && (
            <p className="text-xs text-text-muted">Saving changes…</p>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">Loading history…</div>
        ) : payload ? (
          <div className="space-y-2">
            {payload.tasks.map((task) => (
              <div key={`${payload.date}:${task.key}`} className={mutatingTaskKey === task.key ? "opacity-80" : ""}>
                <TaskItem
                  taskKey={task.key}
                  emoji={task.emoji}
                  label={task.label}
                  description={task.description}
                  isCompleted={task.completed}
                  isOptional={task.optional}
                  note={task.note ?? undefined}
                  onToggle={() => {
                    void toggleTask(task.key);
                  }}
                  onAddNote={(note) => {
                    void saveNote(task.key, note);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
            Choose a day to view and edit your checklist.
          </div>
        )}
      </motion.section>
    </div>
  );
}
