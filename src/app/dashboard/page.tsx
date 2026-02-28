"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DailyChecklist } from "@/components/checklist/daily-checklist";
import { GroupGrid } from "@/components/dashboard/group-grid";
import { InviteCard } from "@/components/dashboard/invite-card";
import { DASHBOARD_TABS, DashboardTabBar } from "@/components/dashboard/dashboard-tab-bar";
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
  const authReady = !authLoading;
  const authEnabled = authReady && Boolean(user);

  const { group, loading: groupLoading, createGroup, joinGroup } = useGroup({
    enabled: authEnabled,
  });
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
  } = useChecklist(group?.id, {
    enabled: authEnabled,
  });
  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id, {
    enabled: authEnabled && Boolean(group?.id),
  });

  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loading = authLoading || (authEnabled && (groupLoading || checklistLoading));

  const dayNumber = Math.min(Math.max(currentDay || 1, 1), TOTAL_DAYS);
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
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-9 w-9 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
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
        <h1 className="mt-3 text-xl font-black text-white">Sign in required</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign in to open your squad dashboard. You will stay signed in on this browser until you sign out.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-dvh overflow-hidden pb-28 pt-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(80rem_42rem_at_15%_-10%,rgba(66,153,225,0.12),transparent_65%),radial-gradient(56rem_34rem_at_86%_0%,rgba(236,72,153,0.14),transparent_62%),radial-gradient(48rem_28rem_at_50%_100%,rgba(251,191,36,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-5 px-3 sm:px-4">
        <motion.section
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4 backdrop-blur-2xl sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pointer-events-none absolute -left-12 top-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-white/45">75 SQUAD</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl [text-wrap:balance]">
                <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent">
                  Today
                </span>
              </h1>
              <p className="mt-1 text-sm text-white/70">
                {profile?.display_name ? `Hey ${profile.display_name}, ` : ""}
                {streakMessage}
              </p>
              <p className="mt-1 text-[11px] text-white/50">
                Stay locked in: this browser stays signed in until you sign out.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/history"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                Backfill / History
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                disabled={signingOut}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 backdrop-blur-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-2">
                  <ProgressRing
                    progress={progressPercent}
                    size={104}
                    strokeWidth={8}
                    label={String(dayNumber)}
                    sublabel="Day"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">TODAY</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl [text-wrap:balance]">
                    {getDayLabel(currentDay, TOTAL_DAYS)}
                  </h2>
                  <p className="mt-1 text-sm text-white/65">
                    Required tasks done today: {requiredCompletedCount}/{DEFAULT_TASK_KEYS.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[220px]">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">PROGRESS</p>
                  <p className="mt-1 text-lg font-black text-white tabular-nums">{progressPercent}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">CUSTOM TASKS</p>
                  <p className="mt-1 text-lg font-black text-white tabular-nums">{customTasks.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-white/45">QUOTE OF THE DAY</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/90">
                    &ldquo;{quoteOfTheDay.text}&rdquo;
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">{quoteOfTheDay.author} · same quote for the squad</p>
                </div>
                {isAllDone ? (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                    All required done
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,34,0.88),rgba(8,10,18,0.92))] p-4 backdrop-blur-2xl sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">QUICK OPEN</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white">Your launch tabs</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-white/60">
                5 tabs
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {DASHBOARD_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition-colors ${
                    tab.href === "/dashboard"
                      ? "border-white/15 bg-white/[0.06] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{tab.icon}</span>
                    <span className="font-semibold">{tab.label}</span>
                  </span>
                  <span className="text-white/35" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 backdrop-blur-2xl sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Checklist</h2>
              <p className="text-xs text-white/55">
                Tap to complete. Use History to backfill past days if you forgot to log something.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/history"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                Edit past days
              </Link>
              {isAllDone ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200">
                  Today complete
                </span>
              ) : null}
            </div>
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
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/70">
              Create or join a squad below to unlock your daily checklist and tracking.
            </div>
          )}
        </motion.section>

        <motion.section
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 backdrop-blur-2xl sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Squad</h2>
              {group ? (
                <p className="text-xs text-white/55">
                  {memberStatuses.length} members, {finishedToday} finished all required tasks today
                </p>
              ) : (
                <p className="text-xs text-white/55">Create a squad or join with an invite code to start together.</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link href="/dashboard/feed" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white">
                Open Feed
              </Link>
              <Link href="/dashboard/group" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white">
                Squad tab
              </Link>
            </div>
          </div>

          {!group && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/45">CREATE SQUAD</p>
                <h3 className="mt-1 text-lg font-black text-white">Start your 75 Hard group</h3>
                <p className="mt-1 text-sm text-white/60">Create a private squad, then send the invite link to your people.</p>
                <label htmlFor="squad-name" className="sr-only">Squad name</label>
                <input
                  id="squad-name"
                  type="text"
                  name="squad_name"
                  autoComplete="off"
                  spellCheck={false}
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Team name"
                  maxLength={48}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateGroup();
                  }}
                  disabled={!groupName.trim() || creatingGroup}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {creatingGroup ? "Creating…" : "Create Squad"}
                </button>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/45">JOIN SQUAD</p>
                <h3 className="mt-1 text-lg font-black text-white">Join with invite code</h3>
                <p className="mt-1 text-sm text-white/60">Paste your code and get straight into the group.</p>
                <label htmlFor="invite-code" className="sr-only">Invite code</label>
                <input
                  id="invite-code"
                  type="text"
                  name="invite_code"
                  autoComplete="off"
                  spellCheck={false}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="Invite code"
                  maxLength={32}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleJoinGroup();
                  }}
                  disabled={!inviteCode.trim() || joiningGroup}
                  className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
                >
                  {joiningGroup ? "Joining…" : "Join Squad"}
                </button>
              </div>
            </div>
          )}

          {group && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.02] p-3">
                <InviteCard inviteCode={group.invite_code} groupName={group.name} />
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[0.16em] text-white/45">MEMBERS</p>
                  <Link href={`/dashboard/member/${user.id}`} className="text-xs text-white/60 hover:text-white">
                    Open my member view
                  </Link>
                </div>
                {statusLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/70">
                    Loading member progress…
                  </div>
                ) : (
                  <GroupGrid members={memberStatuses} totalRequired={DEFAULT_TASK_KEYS.length} />
                )}
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <DashboardTabBar activeHref="/dashboard" />
    </div>
  );
}
