"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { DEFAULT_TASKS, REACTION_EMOJIS } from "@/lib/constants";
import type { FeedReaction, Profile, TaskCompletion } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface FeedCardProps {
  completion: TaskCompletion & {
    profiles?: Profile;
    reactions: FeedReaction[];
    userReaction?: FeedReaction | null;
    reactionCounts?: Record<string, number>;
    commentCount?: number;
  };
  onReact: (emoji: string) => void;
  onComment: () => void;
  commentCount: number;
}

export function FeedCard({ completion, onReact, onComment, commentCount }: FeedCardProps) {
  const [tappedEmoji, setTappedEmoji] = useState<string | null>(null);

  const rawTaskKey = typeof completion.task_key === "string" ? completion.task_key : "";
  const defaultTask = DEFAULT_TASKS.find((task) => task.key === rawTaskKey);
  const taskEmoji = defaultTask?.emoji ?? "✨";
  const taskLabel =
    defaultTask?.label ??
    (rawTaskKey ? rawTaskKey.replace(/^custom_/, "").replaceAll("_", " ") : "Task");

  const profile = completion.profiles;
  const avatarUrl = profile?.avatar_url ?? null;
  const avatarFallback = (profile?.display_name || "?")[0]?.toUpperCase() || "?";

  const reactionCounts = completion.reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  const handleReact = (emoji: string) => {
    setTappedEmoji(emoji);
    onReact(emoji);
    window.setTimeout(() => setTappedEmoji(null), 280);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="glass-card space-y-4 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-accent-cyan/75 to-accent-info/65 text-sm font-bold text-white">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile?.display_name || "User"}
              width={44}
              height={44}
              loading="lazy"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            avatarFallback
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {profile?.display_name || "Anonymous"}
          </p>
          <p className="text-xs text-text-muted">{formatRelativeTime(completion.completed_at)}</p>
        </div>

        <div className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-xs text-text-secondary">
          {taskEmoji} {taskLabel}
        </div>
      </div>

      {completion.note ? (
        <div className="rounded-2xl border border-accent-cyan/25 bg-accent-cyan/8 px-4 py-3">
          <p className="text-sm italic text-text-secondary">&ldquo;{completion.note}&rdquo;</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactionCounts[emoji] || 0;
          const active = count > 0;

          return (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => handleReact(emoji)}
              aria-label={`React with ${emoji}`}
              whileTap={{ scale: 1.15 }}
              animate={
                tappedEmoji === emoji
                  ? { scale: [1, 1.25, 1] }
                  : { scale: 1 }
              }
              transition={{ type: "spring", stiffness: 350, damping: 14 }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
                active
                  ? "border-accent-cyan/35 bg-accent-cyan/15"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              )}
            >
              <span>{emoji}</span>
              {active ? <span className="text-xs text-text-secondary">{count}</span> : null}
            </motion.button>
          );
        })}

        <button
          type="button"
          onClick={onComment}
          aria-label="Open comments"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-white/[0.1] hover:text-text-primary"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 10.5V2.5a1 1 0 011-1h10a1 1 0 011 1v6a1 1 0 01-1 1H4l-3 3z" />
          </svg>
          <span>{commentCount > 0 ? commentCount : "Comment"}</span>
        </button>
      </div>
    </motion.article>
  );
}
