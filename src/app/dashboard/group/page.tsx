"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GroupGrid } from "@/components/dashboard/group-grid";
import { InviteCard } from "@/components/dashboard/invite-card";
import { useAuth } from "@/lib/hooks/use-auth";
import { useGroup } from "@/lib/hooks/use-group";
import { useMemberStatus } from "@/lib/hooks/use-member-status";
import { DEFAULT_TASKS, DEFAULT_TASK_KEYS } from "@/lib/constants";
import type { MemberDayStatus } from "@/lib/types";
import { springs } from "@/lib/animations";

export default function GroupPage() {
  const { user, loading: authLoading } = useAuth();
  const authEnabled = !authLoading && Boolean(user);

  const { group, loading: groupLoading, createGroup, joinGroup } = useGroup({
    enabled: authEnabled,
  });

  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id, {
    enabled: authEnabled && Boolean(group?.id),
  });

  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDayStatus | null>(null);

  const loading = authLoading || (authEnabled && groupLoading);

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
          className="h-10 w-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan"
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
      <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-2xl">
        <p className="text-3xl" aria-hidden="true">🔐</p>
        <h1 className="mt-3 text-xl font-black text-text-primary">Sign in required</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in to open your squad and invites.</p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2.5 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
      <motion.section
        className="glass-card rounded-[30px] p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Squad</p>
        <h1 className="mt-1 text-3xl font-black text-text-primary">
          {group ? group.name : "Build Your Squad"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {group
            ? `${memberStatuses.length} members • ${finishedToday} finished all required tasks today`
            : "Create a private squad or join one with an invite code."}
        </p>
      </motion.section>

      {!group ? (
        <motion.section
          className="grid gap-4 sm:grid-cols-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.smooth, delay: 0.03 }}
        >
          <div className="glass-card rounded-[26px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Create Squad</p>
            <h2 className="mt-2 text-xl font-black text-text-primary">Start your challenge crew</h2>
            <p className="mt-1 text-sm text-text-secondary">Give your squad a name and invite your people.</p>
            <input
              type="text"
              name="squad_name"
              autoComplete="off"
              spellCheck={false}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Team name"
              maxLength={48}
              className="mt-4 w-full rounded-xl border border-white/10 bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateGroup();
              }}
              disabled={!groupName.trim() || creatingGroup}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-cyan to-accent-info px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-55"
            >
              {creatingGroup ? "Creating…" : "Create Squad"}
            </button>
          </div>

          <div className="glass-card rounded-[26px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Join Squad</p>
            <h2 className="mt-2 text-xl font-black text-text-primary">Already have an invite?</h2>
            <p className="mt-1 text-sm text-text-secondary">Paste your invite code to jump in.</p>
            <input
              type="text"
              name="invite_code"
              autoComplete="off"
              spellCheck={false}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="Invite code"
              maxLength={32}
              className="mt-4 w-full rounded-xl border border-white/10 bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={() => {
                void handleJoinGroup();
              }}
              disabled={!inviteCode.trim() || joiningGroup}
              className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-text-primary disabled:opacity-55"
            >
              {joiningGroup ? "Joining…" : "Join Squad"}
            </button>
          </div>
        </motion.section>
      ) : (
        <>
          <motion.section
            className="glass-card rounded-[30px] p-5 sm:p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.smooth, delay: 0.03 }}
          >
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />
          </motion.section>

          <motion.section
            className="glass-card rounded-[30px] p-5 sm:p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.smooth, delay: 0.06 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-text-primary">Members</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-text-secondary">
                Tap a card for details
              </span>
            </div>

            {statusLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-text-secondary">
                Loading member progress…
              </div>
            ) : (
              <GroupGrid
                members={memberStatuses}
                totalRequired={DEFAULT_TASK_KEYS.length}
                onSelectMember={setSelectedMember}
              />
            )}
          </motion.section>
        </>
      )}

      <AnimatePresence>
        {selectedMember && (
          <motion.div
            className="fixed inset-0 z-[110] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-white/10 bg-bg-card p-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={springs.smooth}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
              <h3 className="text-xl font-black text-text-primary">
                {selectedMember.profile.display_name || "Anonymous"}
              </h3>
              <p className="text-sm text-text-secondary">Day {selectedMember.currentDay} • {selectedMember.completedTasks.length} tasks done today</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {DEFAULT_TASKS.map((task) => {
                  const done = selectedMember.completedTasks.includes(task.key);
                  return (
                    <div
                      key={task.key}
                      className={
                        "rounded-xl border px-3 py-2 text-sm " +
                        (done
                          ? "border-accent-cyan/30 bg-accent-cyan/10 text-text-primary"
                          : "border-white/10 bg-white/[0.03] text-text-secondary")
                      }
                    >
                      <span className="mr-2" aria-hidden="true">{task.emoji}</span>
                      {task.label}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
