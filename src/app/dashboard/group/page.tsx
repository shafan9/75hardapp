"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GroupGrid } from "@/components/dashboard/group-grid";
import { InviteCard } from "@/components/dashboard/invite-card";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import { useGroup } from "@/lib/hooks/use-group";
import { useMemberStatus } from "@/lib/hooks/use-member-status";

export default function GroupPage() {
  const { group, loading: groupLoading, createGroup } = useGroup();
  const { memberStatuses, loading: statusLoading } = useMemberStatus(group?.id);

  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalRequired = DEFAULT_TASK_KEYS.length;
  const finishedToday = useMemo(
    () =>
      memberStatuses.filter((member) =>
        DEFAULT_TASK_KEYS.every((key) => member.completedTasks.includes(key))
      ).length,
    [memberStatuses]
  );

  const loading = groupLoading || (!!group && statusLoading);

  async function handleCreateGroup() {
    const trimmed = groupName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    setError(null);

    const created = await createGroup(trimmed);

    if (!created) {
      setError("Could not create squad. Please try again.");
      setCreating(false);
      return;
    }

    setGroupName("");
    setCreating(false);
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

  if (!group) {
    return (
      <div className="space-y-6 pb-6">
        <motion.h1
          className="text-2xl font-black gradient-text"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Your Squad
        </motion.h1>

        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-center text-4xl">👥</p>
          <h2 className="mt-2 text-center text-lg font-bold text-text-primary">
            Create a squad
          </h2>
          <p className="mt-1 text-center text-sm text-text-secondary">
            Start a shared challenge and invite your friends.
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              name="squad_name"
              aria-label="Squad name"
              autoComplete="off"
              placeholder="Squad name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="w-full rounded-xl border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              maxLength={48}
            />

            <motion.button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || creating}
              className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {creating ? "Creating…" : "Create Squad"}
            </motion.button>

            {error && <p className="text-center text-sm text-accent-red">{error}</p>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black gradient-text">{group.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {memberStatuses.length} members, {finishedToday} finished all required tasks today
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <InviteCard inviteCode={group.invite_code} groupName={group.name} />
      </motion.div>

      <div>
        <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Squad Members
        </p>

        <GroupGrid members={memberStatuses} totalRequired={totalRequired} />
      </div>
    </div>
  );
}
