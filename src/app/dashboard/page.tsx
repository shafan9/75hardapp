"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DailyChecklist } from "@/components/checklist/daily-checklist";
import { GroupGrid } from "@/components/dashboard/group-grid";
import { InviteCard } from "@/components/dashboard/invite-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { useMemberStatus } from "@/lib/hooks/use-member-status";
import {
  getDayLabel,
  getMotivationalQuoteForDay,
  getProgressPercent,
  getStreakMessage,
} from "@/lib/utils";

export default function DashboardPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { group, loading: groupLoading, createGroup, joinGroup } = useGroup();
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
  } = useChecklist(group?.id);
  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id);

  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loading = authLoading || groupLoading || checklistLoading;
  const progressPercent = getProgressPercent(currentDay, TOTAL_DAYS);
  const streakMessage = getStreakMessage(currentDay);
  const quoteOfTheDay = getMotivationalQuoteForDay(currentDay || 1);

  const requiredCompletedCount = useMemo(
    () => DEFAULT_TASK_KEYS.filter((key) => todayCompleted.includes(key)).length,
    [todayCompleted]
  );

  const finishedToday = useMemo(
    () =>
      memberStatuses.filter((member) =>
        DEFAULT_TASK_KEYS.every((key) => member.completedTasks.includes(key))
      ).length,
    [memberStatuses]
  );

  async function handleCreateGroup() {
    const name = groupName.trim();
    if (!name || creatingGroup) return;

    setCreatingGroup(true);
    const created = await createGroup(name);
    if (created) {
      setGroupName("");
    }
    setCreatingGroup(false);
  }

  async function handleJoinGroup() {
    const code = inviteCode.trim();
    if (!code || joiningGroup) return;

    setJoiningGroup(true);
    const joined = await joinGroup(code);
    if (joined) {
      setInviteCode("");
    }
    setJoiningGroup(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
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
      <div className="glass-card mx-auto mt-8 max-w-lg p-6 text-center">
        <p className="text-2xl">🔐</p>
        <h1 className="mt-2 text-lg font-bold text-text-primary">Sign in required</h1>
        <p className="mt-1 text-sm text-text-secondary">Please sign in to access your dashboard.</p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 pt-2">
      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">75 Squad</p>
            <h1 className="gradient-text text-3xl font-black">Today</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {profile?.display_name ? `Hey ${profile.display_name},` : ""} {streakMessage}
            </p>
          </div>

          <button
            onClick={() => {
              void handleSignOut();
            }}
            disabled={signingOut}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </motion.section>

      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Day</p>
              <p className="mt-1 text-5xl font-black gradient-text">{Math.min(currentDay, TOTAL_DAYS)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-text-primary">{getDayLabel(currentDay, TOTAL_DAYS)}</p>
              <p className="text-xs font-semibold text-text-muted">{progressPercent}%</p>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-xs text-text-secondary">
              Required tasks done today: {requiredCompletedCount}/{DEFAULT_TASK_KEYS.length}
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-[14px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Daily motivation
              </p>
              <p className="mt-2 text-sm text-text-primary">&ldquo;{quoteOfTheDay.text}&rdquo;</p>
              <p className="mt-1 text-xs text-text-muted">- {quoteOfTheDay.author}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="glass-card p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Checklist</h2>
          {isAllDone && (
            <span className="rounded-full bg-accent-emerald/15 px-2.5 py-1 text-xs font-semibold text-accent-emerald">
              All required tasks done
            </span>
          )}
        </div>

        {group ? (
          <DailyChecklist
            completions={todayCompleted}
            customTasks={customTasks}
            onToggleTask={toggleTask}
            onAddNote={addNote}
            onAddCustomTask={addCustomTask}
            onRemoveCustomTask={removeCustomTask}
            isAllDone={isAllDone}
          />
        ) : (
          <div className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
            Create or join a squad below to unlock your daily checklist and tracking.
          </div>
        )}
      </motion.section>

      <motion.section
        className="glass-card space-y-4 p-4 sm:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text-primary">Squad</h2>
          {group && (
            <p className="text-xs text-text-muted">
              {memberStatuses.length} members, {finishedToday} finished all required tasks today
            </p>
          )}
        </div>

        {!group && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border bg-bg-surface p-4">
              <p className="text-sm font-semibold text-text-primary">Create squad</p>
              <label htmlFor="squad-name" className="sr-only">
                Squad name
              </label>
              <input
                id="squad-name"
                type="text"
                name="squad_name"
                autoComplete="off"
                spellCheck={false}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Team name…"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
                maxLength={48}
              />
              <button
                onClick={() => {
                  void handleCreateGroup();
                }}
                disabled={!groupName.trim() || creatingGroup}
                className="w-full rounded-lg bg-gradient-to-r from-accent-violet to-accent-pink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                {creatingGroup ? "Creating…" : "Create Squad"}
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-bg-surface p-4">
              <p className="text-sm font-semibold text-text-primary">Join by invite code</p>
              <label htmlFor="invite-code" className="sr-only">
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                name="invite_code"
                autoComplete="off"
                spellCheck={false}
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Invite code…"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
                maxLength={32}
              />
              <button
                onClick={() => {
                  void handleJoinGroup();
                }}
                disabled={!inviteCode.trim() || joiningGroup}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-card-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                {joiningGroup ? "Joining…" : "Join Squad"}
              </button>
            </div>
          </div>
        )}

        {group && (
          <>
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Members</p>
              {statusLoading ? (
                <div className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
                  Loading member progress…
                </div>
              ) : (
                <GroupGrid members={memberStatuses} totalRequired={DEFAULT_TASK_KEYS.length} />
              )}
            </div>
          </>
        )}
      </motion.section>

      <section className="glass-card p-4 text-xs text-text-secondary">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/profile" className="hover:text-text-primary">
            Profile & notification settings
          </Link>
          <Link href={`/dashboard/member/${user.id}`} className="hover:text-text-primary">
            View your history
          </Link>
        </div>
      </section>
    </div>
  );
}
