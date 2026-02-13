"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { DEFAULT_TASKS, REACTION_EMOJIS } from "@/lib/constants";
import { TaskCompletion, Profile, FeedReaction } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface FeedCardProps {
  completion: TaskCompletion & {
    profiles: Profile;
    reactions: FeedReaction[];
    reactionCount: number;
    userReacted: boolean;
  };
  onReact: (emoji: string) => void;
  onComment: () => void;
  commentCount: number;
}

export function FeedCard({
  completion,
  onReact,
  onComment,
  commentCount,
}: FeedCardProps) {
  const [tappedEmoji, setTappedEmoji] = useState<string | null>(null);

  // Look up the task info from defaults, or treat as custom
  const defaultTask = DEFAULT_TASKS.find((t) => t.key === completion.task_key);
  const taskEmoji = defaultTask?.emoji ?? "✨";
  const taskLabel = defaultTask?.label ?? completion.task_key.replace("custom_", "");

  const profile = completion.profiles;
  const avatarFallback = (profile.display_name || "?")[0].toUpperCase();

  const handleReact = (emoji: string) => {
    setTappedEmoji(emoji);
    onReact(emoji);
    setTimeout(() => setTappedEmoji(null), 300);
  };

  // Count reactions per emoji
  const reactionCounts = completion.reactions.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="glass-card p-4 space-y-3"
    >
      {/* Header: avatar + name + timestamp */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet to-accent-pink text-sm font-bold text-white">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || "User"}
              width={40}
              height={40}
              loading="lazy"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            avatarFallback
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {profile.display_name || "Anonymous"}
          </p>
          <p className="text-xs text-text-muted">
            {formatRelativeTime(completion.completed_at)}
          </p>
        </div>
        <div className="flex-shrink-0 text-2xl">{taskEmoji}</div>
      </div>

      {/* Task completed */}
      <div className="rounded-xl bg-bg-surface/50 px-3 py-2">
        <p className="text-sm text-text-secondary">
          Completed{" "}
          <span className="font-semibold text-text-primary">{taskLabel}</span>{" "}
          {taskEmoji}
        </p>
      </div>

      {/* Note if exists */}
      {completion.note && (
        <div className="rounded-xl border-l-2 border-accent-violet bg-accent-violet/5 px-3 py-2">
          <p className="text-sm text-text-secondary italic">
            &ldquo;{completion.note}&rdquo;
          </p>
        </div>
      )}

      {/* Reactions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactionCounts[emoji] || 0;
          const hasCount = count > 0;
          return (
            <motion.button
              key={emoji}
              onClick={() => handleReact(emoji)}
              aria-label={`React with ${emoji}`}
              whileTap={{ scale: 1.4 }}
              animate={
                tappedEmoji === emoji
                  ? { scale: [1, 1.4, 1] }
                  : { scale: 1 }
              }
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors",
                hasCount
                  ? "bg-accent-violet/10 border border-accent-violet/20"
                  : "bg-bg-surface hover:bg-bg-card-hover"
              )}
            >
              <span>{emoji}</span>
              {hasCount && (
                <span className="text-xs text-text-secondary">{count}</span>
              )}
            </motion.button>
          );
        })}

        {/* Comment button */}
        <button
          onClick={onComment}
          aria-label="Open comments"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 text-sm text-text-muted hover:bg-bg-card-hover hover:text-text-secondary transition-colors"
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
          {commentCount > 0 && (
            <span className="text-xs">{commentCount}</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
