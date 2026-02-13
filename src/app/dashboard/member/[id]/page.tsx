"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useGroup } from "@/lib/hooks/use-group";
import { cn } from "@/lib/utils";

const TOTAL_DAYS = 75;

type MemberDayTask = {
  key: string;
  label: string;
  description: string;
  emoji: string;
  optional: boolean;
  completed: boolean;
  note: string | null;
};

type MemberDayPayload = {
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
  tasks: MemberDayTask[];
  error?: string;
};

function TaskRow({ task }: { task: MemberDayTask }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-[18px]",
        "shadow-[0_10px_30px_rgba(0,0,0,0.28)]",
        task.completed ? "bg-accent-emerald/10" : "hover:bg-white/10"
      )}
    >
      <div
        className={cn(
          "grid h-12 w-12 place-items-center rounded-2xl",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset]",
          task.completed
            ? "bg-gradient-to-br from-accent-emerald/80 to-accent-blue/60"
            : "bg-gradient-to-br from-accent-violet/70 to-accent-pink/60"
        )}
        aria-hidden="true"
      >
        <span className="text-xl leading-none">{task.emoji}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{task.label}</p>
          {task.optional && (
            <span className="flex-shrink-0 rounded-full bg-accent-amber/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-amber">
              optional
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-muted">{task.description}</p>
        {task.note && (
          <p className="mt-1 truncate text-xs text-text-secondary">Note: {task.note}</p>
        )}
      </div>

      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        {task.completed ? (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8.5L6.5 12L13 4"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="h-2 w-2 rounded-full bg-white/25" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export default function MemberHistoryPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id;

  const { group, loading: groupLoading } = useGroup();

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const [day, setDay] = useState<number | null>(null);
  const [payload, setPayload] = useState<MemberDayPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(
    async (requestedDay: number | null) => {
      if (!group?.id || !memberId) return;

      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        qs.set("groupId", group.id);
        qs.set("userId", memberId);
        if (requestedDay) qs.set("day", String(requestedDay));

        const response = await fetch(`/api/group/member-day?${qs.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "X-Timezone": timezone },
        });

        const data = (await response.json().catch(() => ({}))) as MemberDayPayload;
        if (!response.ok) {
          throw new Error(data.error || "Could not load member history.");
        }

        setPayload(data);
        setDay(data.day);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load member history.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [group?.id, memberId, timezone]
  );

  useEffect(() => {
    if (!group?.id || !memberId) return;
    void loadDay(null);
  }, [group?.id, memberId, loadDay]);

  const canGoPrev = (day ?? 1) > 1;
  const canGoNext = (day ?? 1) < TOTAL_DAYS;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 pt-2">
      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">Squad history</p>
            <h1 className="gradient-text text-2xl font-black sm:text-3xl">
              {payload?.profile?.display_name || "Member"}
            </h1>
            {payload && (
              <p className="mt-1 text-sm text-text-secondary">
                Day {payload.day} of {TOTAL_DAYS}{" "}
                <span className="text-text-muted">({payload.date}, {payload.squadTimezone})</span>
              </p>
            )}
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover"
          >
            Back
          </Link>
        </div>
      </motion.section>

      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
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
                max={TOTAL_DAYS}
                value={day ?? ""}
                onChange={(e) => setDay(e.target.value ? Number(e.target.value) : null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && day) {
                    void loadDay(day);
                  }
                }}
                onBlur={() => {
                  if (day) void loadDay(day);
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

          {payload && (
            <div className="text-xs text-text-muted">
              Squad day today:{" "}
              <span className="font-semibold text-text-secondary">{payload.currentSquadDay}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}
      </motion.section>

      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-bold text-text-primary">Tasks</h2>
        <p className="mt-1 text-xs text-text-muted">
          {payload?.isToday ? "Today's status (live)" : "Historical view"}
        </p>

        {groupLoading || loading ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
            Loading...
          </div>
        ) : payload ? (
          <div className="mt-4 space-y-2">
            {payload.tasks.map((task) => (
              <TaskRow key={task.key} task={task} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
            Select a day to view tasks.
          </div>
        )}
      </motion.section>
    </div>
  );
}
