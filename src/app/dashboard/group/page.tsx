"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_TASKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemberDayStatus } from "@/lib/types";

// TODO: replace with real data from hook
const MOCK_GROUP_NAME = "Iron Squad 💪";
const MOCK_INVITE_CODE = "AbC12xYz";

const MOCK_MEMBERS: (MemberDayStatus & { allDone: boolean })[] = [
  {
    profile: { id: "u1", display_name: "Sarah K.", avatar_url: null, created_at: "" },
    completedTasks: ["workout_outdoor", "workout_indoor", "diet", "water", "reading"],
    currentDay: 14,
    progress: null,
    allDone: true,
  },
  {
    profile: { id: "u2", display_name: "Mike D.", avatar_url: null, created_at: "" },
    completedTasks: ["workout_outdoor", "diet", "reading"],
    currentDay: 14,
    progress: null,
    allDone: false,
  },
  {
    profile: { id: "u3", display_name: "Jordan P.", avatar_url: null, created_at: "" },
    completedTasks: ["workout_outdoor", "workout_indoor", "diet", "water", "reading"],
    currentDay: 12,
    progress: null,
    allDone: true,
  },
  {
    profile: { id: "u4", display_name: "Alex R.", avatar_url: null, created_at: "" },
    completedTasks: ["workout_indoor", "water"],
    currentDay: 10,
    progress: null,
    allDone: false,
  },
  {
    profile: { id: "u5", display_name: "Taylor M.", avatar_url: null, created_at: "" },
    completedTasks: [],
    currentDay: 8,
    progress: null,
    allDone: false,
  },
];

const AVATAR_COLORS = [
  "from-accent-violet to-accent-pink",
  "from-accent-pink to-accent-amber",
  "from-accent-amber to-accent-emerald",
  "from-accent-emerald to-accent-blue",
  "from-accent-blue to-accent-violet",
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Required tasks only (no optional)
const REQUIRED_TASKS = DEFAULT_TASKS.filter((t) => !("optional" in t && t.optional));

function MemberCard({ member, index }: { member: (typeof MOCK_MEMBERS)[number]; index: number }) {
  const colorIndex = parseInt(member.profile.id.replace(/\D/g, "")) % AVATAR_COLORS.length;

  return (
    <motion.div
      className={cn(
        "glass-card p-4 space-y-3",
        member.allDone && "border-accent-emerald/50 glow-emerald"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 25 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Avatar and name */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
            AVATAR_COLORS[colorIndex]
          )}
        >
          {getInitials(member.profile.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-text-primary truncate">
            {member.profile.display_name}
          </p>
          <p className="text-xs text-text-muted">Day {member.currentDay}</p>
        </div>
        {member.allDone && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, delay: 0.2 + index * 0.06 }}
            className="text-lg"
          >
            ✅
          </motion.span>
        )}
      </div>

      {/* Task checkmarks */}
      <div className="flex gap-2">
        {REQUIRED_TASKS.map((task) => {
          const done = member.completedTasks.includes(task.key);
          return (
            <div
              key={task.key}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-center transition-all",
                done ? "bg-accent-emerald/15" : "bg-bg-surface/50"
              )}
            >
              <span className={cn("text-base", !done && "opacity-30")}>{task.emoji}</span>
              <span
                className={cn(
                  "text-[9px] font-medium",
                  done ? "text-accent-emerald" : "text-text-muted"
                )}
              >
                {done ? "Done" : "---"}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function CreateGroupView({ onCreated }: { onCreated: () => void }) {
  const [groupName, setGroupName] = useState("");

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-6 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center space-y-2">
        <span className="text-5xl">👥</span>
        <h2 className="text-xl font-black text-text-primary">Create Your Squad</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          Start a group to track 75 Hard together with friends!
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input
          type="text"
          placeholder="Squad name (e.g., Iron Squad 💪)"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50 text-sm"
        />
        <motion.button
          onClick={onCreated}
          disabled={!groupName.trim()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-accent-violet to-accent-pink text-white font-bold text-sm disabled:opacity-40 cursor-pointer"
          whileTap={{ scale: 0.98 }}
        >
          Create Squad 🚀
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function GroupPage() {
  // TODO: replace with real data from hook
  const [hasGroup] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    const link = `${window.location.origin}/join/${MOCK_INVITE_CODE}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  if (!hasGroup) {
    return (
      <div className="pb-6">
        <motion.h1
          className="text-2xl font-black gradient-text mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Your Squad
        </motion.h1>
        <CreateGroupView onCreated={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black gradient-text">{MOCK_GROUP_NAME}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {MOCK_MEMBERS.length} members &bull; {MOCK_MEMBERS.filter((m) => m.allDone).length} finished today
        </p>
      </motion.div>

      {/* Invite button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          onClick={copyInviteLink}
          className="w-full glass-card p-4 flex items-center justify-between cursor-pointer hover:border-accent-violet/50 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔗</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">Invite Link</p>
              <p className="text-xs text-text-muted">Tap to copy share link</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-accent-emerald text-sm font-semibold"
              >
                Copied! ✅
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-accent-violet text-sm font-semibold"
              >
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Members grid */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1 mb-3">
          Squad Members
        </p>
        <div className="space-y-3">
          {MOCK_MEMBERS.map((member, i) => (
            <MemberCard key={member.profile.id} member={member} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
