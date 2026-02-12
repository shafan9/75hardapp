"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REACTION_EMOJIS } from "@/lib/constants";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

// TODO: replace with real data from hook
const MOCK_FEED = [
  {
    id: "1",
    user: { id: "u1", display_name: "Sarah K.", avatar_url: null, created_at: "" } as Profile,
    task_key: "workout_outdoor",
    task_emoji: "🏃",
    task_label: "Outdoor Workout",
    note: "6AM sunrise run in the park! Cold but worth it 🌅",
    completed_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    reactions: [
      { emoji: "🔥", count: 3 },
      { emoji: "💪", count: 2 },
    ],
    comments: [
      { id: "c1", user_name: "Mike D.", content: "Beast mode! 🦁", created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
    ],
  },
  {
    id: "2",
    user: { id: "u2", display_name: "Mike D.", avatar_url: null, created_at: "" } as Profile,
    task_key: "reading",
    task_emoji: "📖",
    task_label: "Read 10 Pages",
    note: "Atomic Habits chapter 4 - habit stacking is a game changer",
    completed_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    reactions: [
      { emoji: "👏", count: 1 },
    ],
    comments: [],
  },
  {
    id: "3",
    user: { id: "u3", display_name: "Jordan P.", avatar_url: null, created_at: "" } as Profile,
    task_key: "water",
    task_emoji: "💧",
    task_label: "Gallon of Water",
    note: null,
    completed_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    reactions: [
      { emoji: "🙌", count: 2 },
      { emoji: "💪", count: 1 },
    ],
    comments: [],
  },
  {
    id: "4",
    user: { id: "u1", display_name: "Sarah K.", avatar_url: null, created_at: "" } as Profile,
    task_key: "diet",
    task_emoji: "🥗",
    task_label: "Follow Diet",
    note: "Meal prep Sunday paying off! All healthy meals today 💚",
    completed_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    reactions: [
      { emoji: "🔥", count: 4 },
      { emoji: "❤️", count: 2 },
    ],
    comments: [
      { id: "c2", user_name: "Jordan P.", content: "Share the recipes!! 🙏", created_at: new Date(Date.now() - 1000 * 60 * 100).toISOString() },
      { id: "c3", user_name: "Sarah K.", content: "Will post in the group chat!", created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString() },
    ],
  },
  {
    id: "5",
    user: { id: "u4", display_name: "Alex R.", avatar_url: null, created_at: "" } as Profile,
    task_key: "workout_indoor",
    task_emoji: "💪",
    task_label: "Second Workout",
    note: "Leg day done! Can barely walk 😂",
    completed_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    reactions: [
      { emoji: "💪", count: 5 },
      { emoji: "⚡", count: 2 },
    ],
    comments: [],
  },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "from-accent-violet to-accent-pink",
  "from-accent-pink to-accent-amber",
  "from-accent-amber to-accent-emerald",
  "from-accent-emerald to-accent-blue",
  "from-accent-blue to-accent-violet",
];

function FeedCard({ item, index }: { item: (typeof MOCK_FEED)[number]; index: number }) {
  const [showComments, setShowComments] = useState(false);
  const [localReactions, setLocalReactions] = useState(item.reactions);
  const [newComment, setNewComment] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const colorIndex = parseInt(item.user.id.replace(/\D/g, "")) % AVATAR_COLORS.length;

  function handleReaction(emoji: string) {
    setLocalReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        return prev.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1 } : r
        );
      }
      return [...prev, { emoji, count: 1 }];
    });
    setShowReactionPicker(false);
  }

  return (
    <motion.div
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 25 }}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
              AVATAR_COLORS[colorIndex]
            )}
          >
            {getInitials(item.user.display_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-text-primary truncate">
              {item.user.display_name}
            </p>
            <p className="text-xs text-text-muted">
              {formatRelativeTime(item.completed_at)}
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-bg-surface text-xs font-medium text-text-secondary flex items-center gap-1.5">
            <span>{item.task_emoji}</span>
            <span>{item.task_label}</span>
          </div>
        </div>
      </div>

      {/* Note */}
      {item.note && (
        <div className="px-4 pt-3">
          <p className="text-sm text-text-primary leading-relaxed">{item.note}</p>
        </div>
      )}

      {/* Reactions */}
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {localReactions.map((r) => (
          <motion.button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg-surface border border-border text-sm hover:border-accent-violet/50 transition-colors cursor-pointer"
            whileTap={{ scale: 0.9 }}
          >
            <span>{r.emoji}</span>
            <span className="text-xs text-text-secondary font-medium">{r.count}</span>
          </motion.button>
        ))}
        <div className="relative">
          <motion.button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="w-8 h-8 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors cursor-pointer text-sm"
            whileTap={{ scale: 0.9 }}
          >
            +
          </motion.button>
          <AnimatePresence>
            {showReactionPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 5 }}
                className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 rounded-xl bg-bg-card border border-border shadow-xl z-10"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-bg-surface flex items-center justify-center cursor-pointer text-lg"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-4">
        <motion.button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer text-sm"
          whileTap={{ scale: 0.95 }}
        >
          <span>💬</span>
          <span>{item.comments.length > 0 ? item.comments.length : ""} {item.comments.length === 1 ? "comment" : item.comments.length > 1 ? "comments" : "Comment"}</span>
        </motion.button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">
              {item.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted shrink-0 mt-0.5">
                    {comment.user_name[0]}
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-semibold text-text-primary">{comment.user_name}</span>{" "}
                      <span className="text-text-secondary">{comment.content}</span>
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatRelativeTime(comment.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {/* Comment input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
                />
                <motion.button
                  onClick={() => {
                    if (newComment.trim()) setNewComment("");
                    // TODO: send comment to backend
                  }}
                  className="px-3 py-2 rounded-xl bg-accent-violet text-white text-xs font-semibold cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  Send
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FeedPage() {
  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black gradient-text">Squad Feed</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-border">
          <motion.div
            className="w-2 h-2 rounded-full bg-accent-emerald"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-text-secondary">Live</span>
        </div>
      </motion.div>

      {/* Feed */}
      <div className="space-y-4">
        {MOCK_FEED.map((item, i) => (
          <FeedCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
