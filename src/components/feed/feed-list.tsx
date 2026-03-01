"use client";

import { motion } from "framer-motion";
import type { FeedReaction, Profile, TaskCompletion } from "@/lib/types";
import { springs } from "@/lib/animations";
import { FeedCard } from "./feed-card";

type FeedItem = TaskCompletion & {
  profiles?: Profile;
  reactions: FeedReaction[];
  userReaction?: FeedReaction | null;
  reactionCounts?: Record<string, number>;
  commentCount: number;
};

interface FeedListProps {
  items: FeedItem[];
  onReact: (completionId: string, emoji: string) => void;
  onComment: (completionId: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springs.smooth },
};

export function FeedList({ items, onReact, onComment }: FeedListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-cyan" />
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">Live</span>
      </div>

      {items.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {items.map((feedItem) => (
            <motion.div key={feedItem.id} variants={item}>
              <FeedCard
                completion={feedItem}
                onReact={(emoji) => onReact(feedItem.id, emoji)}
                onComment={() => onComment(feedItem.id)}
                commentCount={feedItem.commentCount}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <span className="mb-4 text-5xl animate-float">🏄</span>
          <p className="text-lg font-semibold text-text-secondary">No activity yet</p>
          <p className="mt-1 text-sm text-text-muted">Complete a task to get the feed going.</p>
        </motion.div>
      )}
    </div>
  );
}
