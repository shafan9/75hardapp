"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FeedComment } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface CommentSectionProps {
  comments: FeedComment[];
  onSubmit: (content: string) => void;
  loading?: boolean;
}

export function CommentSection({
  comments,
  onSubmit,
  loading,
}: CommentSectionProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setInput("");
  };

  return (
    <div className="space-y-3">
      {/* Comments list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const profile = comment.profiles;
              const avatarFallback = (
                profile?.display_name || "?"
              )[0].toUpperCase();

              return (
                <motion.div
                  key={comment.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex gap-2.5 rounded-xl bg-bg-surface/50 p-3"
                >
                  {/* Avatar */}
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-violet text-[10px] font-bold text-white">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name || "User"}
                        width={28}
                        height={28}
                        loading="lazy"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      avatarFallback
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {profile?.display_name || "Anonymous"}
                      </span>
                      <span className="text-[10px] text-text-muted flex-shrink-0">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 break-words">
                      {comment.content}
                    </p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <span className="text-3xl mb-2">💬</span>
              <p className="text-sm text-text-muted">
                Be the first to comment!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <input
          type="text"
          name="comment"
          aria-label="Write a comment"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Write a comment…"
          disabled={loading}
          className="flex-1 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          aria-label="Send comment"
          disabled={!input.trim() || loading}
          className="flex items-center justify-center rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="31.4 31.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2L7 9" />
              <path d="M14 2l-5 12-2-5-5-2 12-5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
