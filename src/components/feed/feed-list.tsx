"use client";

import { motion } from "framer-motion";
import { TaskCompletion, Profile, FeedReaction } from "@/lib/types";
import { FeedCard } from "./feed-card";

type FeedItem = TaskCompletion & {
  profiles: Profile;
  reactions: FeedReaction[];
  reactionCount: number;
  userReacted: boolean;
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
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function FeedList({ items, onReact, onComment }: FeedListProps) {
  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-emerald opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-emerald" />
        </span>
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Live Feed
        </span>
      </div>

      {/* Feed items */}
      {items.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <span className="text-5xl mb-4 animate-float">🏄</span>
          <p className="text-lg font-semibold text-text-secondary">
            No activity yet!
          </p>
          <p className="text-sm text-text-muted mt-1">
            Complete a task to get the feed going 🚀
          </p>
        </motion.div>
      )}
    </div>
  );
}
