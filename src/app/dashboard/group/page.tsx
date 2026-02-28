"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GroupGrid } from "@/components/dashboard/group-grid";
import { InviteCard } from "@/components/dashboard/invite-card";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { useGroup } from "@/lib/hooks/use-group";
import { useMemberStatus } from "@/lib/hooks/use-member-status";

export default function GroupPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const authReady = !authLoading;
  const authEnabled = authReady && Boolean(user);

  const { group, members, loading: groupLoading, createGroup, joinGroup } = useGroup({ enabled: authEnabled });
  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id, {
    enabled: authEnabled && Boolean(group?.id),
  });
  const { todayCompleted, currentDay, customTasks } = useChecklist(group?.id, { enabled: authEnabled });

  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);

  const loading = authLoading || (authEnabled && groupLoading);
  const requiredDone = useMemo(
    () => DEFAULT_TASK_KEYS.filter((key) => todayCompleted.includes(key)).length,
    [todayCompleted]
  );
  const membersDoneToday = useMemo(
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
    if (created) setGroupName("");
    setCreatingGroup(false);
  }

  async function handleJoinGroup() {
    const code = inviteCode.trim();
    if (!code || joiningGroup) return;
    setJoiningGroup(true);
    const joined = await joinGroup(code);
    if (joined) setInviteCode("");
    setJoiningGroup(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-9 w-9 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Loading squad"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5 pb-6">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">SQUAD</p>
          <h1 className="mt-2 text-3xl font-black text-white">Your Squad</h1>
          <p className="mt-2 text-sm text-white/70">Sign in to create a squad, join an invite, and track everyone&apos;s progress.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <motion.section
        className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 backdrop-blur-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">SQUAD</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {group ? group.name : "Build your squad"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Invite-only accountability with live member progress. Tap any member card to see what they completed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white">
              Today
            </Link>
            <Link href="/dashboard/feed" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white">
              Feed
            </Link>
            <Link href="/dashboard/history" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white">
              History
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">DAY</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{currentDay}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">MY REQUIRED</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{requiredDone}/{DEFAULT_TASK_KEYS.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">MEMBERS</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{group ? members.length : 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">ALL DONE TODAY</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{membersDoneToday}</p>
          </div>
        </div>
      </motion.section>

      {!group ? (
        <motion.section
          className="grid gap-4 lg:grid-cols-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">CREATE SQUAD</p>
            <h2 className="mt-2 text-xl font-black text-white">Start your accountability group</h2>
            <p className="mt-2 text-sm text-white/65">Create a squad and share the invite link with your group. No hard cap is enforced.</p>
            <label htmlFor="squad-name" className="sr-only">Squad name</label>
            <input
              id="squad-name"
              type="text"
              name="squad_name"
              autoComplete="off"
              spellCheck={false}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="e.g. 75 Hard Core"
              maxLength={48}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateGroup();
              }}
              disabled={!groupName.trim() || creatingGroup}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creatingGroup ? "Creating…" : "Create Squad"}
            </button>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">JOIN SQUAD</p>
            <h2 className="mt-2 text-xl font-black text-white">Join with invite code</h2>
            <p className="mt-2 text-sm text-white/65">Paste a code from your squad leader to join instantly and keep your progress synced.</p>
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
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
            />
            <button
              type="button"
              onClick={() => {
                void handleJoinGroup();
              }}
              disabled={!inviteCode.trim() || joiningGroup}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/[0.07] disabled:opacity-60"
            >
              {joiningGroup ? "Joining…" : "Join Squad"}
            </button>
          </div>
        </motion.section>
      ) : (
        <>
          <motion.section
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />
          </motion.section>

          <motion.section
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Squad snapshot</h2>
                <p className="mt-1 text-sm text-white/60">
                  Tap a member to view their day-by-day completions. Progress updates refresh automatically.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-white/75">
                {memberStatuses.length} members • {membersDoneToday} done
              </div>
            </div>

            {statusLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/70">Loading member progress…</div>
            ) : (
              <GroupGrid members={memberStatuses} totalRequired={DEFAULT_TASK_KEYS.length} />
            )}
          </motion.section>

          <motion.section
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Member pulse</h2>
                <p className="mt-1 text-sm text-white/60">Clear per-person progress so you can see exactly who is locked in today.</p>
              </div>
              {profile?.id ? (
                <Link href={`/dashboard/member/${profile.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white">
                  Open my member view
                </Link>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {memberStatuses.map((member) => {
                const requiredCompleted = DEFAULT_TASK_KEYS.filter((key) => member.completedTasks.includes(key)).length;
                const percent = Math.round((requiredCompleted / DEFAULT_TASK_KEYS.length) * 100);
                return (
                  <Link key={member.profile.id} href={`/dashboard/member/${member.profile.id}`} className="block">
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4 transition-colors hover:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{member.profile.display_name || "Anonymous"}</p>
                          <p className="mt-1 text-xs text-white/50">
                            Day {member.currentDay} • {requiredCompleted}/{DEFAULT_TASK_KEYS.length} required
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white tabular-nums">{percent}%</p>
                          <p className="text-[10px] text-white/45">today</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-white/65">
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">Your custom tasks configured: <span className="font-semibold text-white">{customTasks.length}</span></div>
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">Invite-only auth: <span className="font-semibold text-white">Enabled</span></div>
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">Squad interactions: <span className="font-semibold text-white">Feed + member views</span></div>
            </div>
          </motion.section>
        </>
      )}
    </div>
  );
}
