"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CommentSection } from "@/components/feed/comment-section";
import { FeedList } from "@/components/feed/feed-list";
import { useFeed } from "@/lib/hooks/use-feed";
import { useGroup } from "@/lib/hooks/use-group";
import type { FeedReaction, Profile, TaskCompletion } from "@/lib/types";

interface FeedListItem
  extends TaskCompletion {
  profiles: Profile;
  reactions: FeedReaction[];
  reactionCount: number;
  userReacted: boolean;
  commentCount: number;
}

export default function FeedPage() {
  const { group, loading: groupLoading } = useGroup();
  const {
    feedItems,
    loading,
    hasMore,
    loadMore,
    addReaction,
    removeReaction,
    addComment,
    comments,
    loadComments,
  } = useFeed(group?.id);

  const [activeCommentsId, setActiveCommentsId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const mappedItems: FeedListItem[] = useMemo(
    () =>
      feedItems.map((item) => ({
        ...item,
        profiles: item.profiles ?? {
          id: item.user_id,
          display_name: "Member",
          avatar_url: null,
          created_at: item.completed_at,
        },
        reactionCount: Object.values(item.reactionCounts).reduce(
          (total, count) => total + count,
          0
        ),
        userReacted: Boolean(item.userReaction),
      })),
    [feedItems]
  );

  const activeComments = activeCommentsId ? comments[activeCommentsId] ?? [] : [];

  async function handleReact(completionId: string, emoji: string) {
    const currentUserReaction = feedItems.find((item) => item.id === completionId)?.userReaction;

    if (currentUserReaction?.emoji === emoji) {
      await removeReaction(completionId);
      return;
    }

    await addReaction(completionId, emoji);
  }

  async function openComments(completionId: string) {
    setActiveCommentsId(completionId);
    await loadComments(completionId);
  }

  async function submitComment(content: string) {
    if (!activeCommentsId) return;

    setSubmittingComment(true);
    await addComment(activeCommentsId, content);
    await loadComments(activeCommentsId);
    setSubmittingComment(false);
  }

  if (groupLoading || loading) {
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
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">Squad Feed</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">📢</p>
          <p className="mt-2 text-sm text-text-secondary">
            Join or create a squad to start seeing activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black gradient-text">Squad Feed</h1>
        <p className="mt-1 text-sm text-text-secondary">Live activity from your group</p>
      </motion.div>

      <FeedList items={mappedItems} onReact={handleReact} onComment={openComments} />

      {hasMore && mappedItems.length > 0 && (
        <motion.button
          onClick={() => {
            void loadMore();
          }}
          className="w-full rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-bg-card-hover"
          whileTap={{ scale: 0.98 }}
        >
          Load More
        </motion.button>
      )}

      <AnimatePresence>
        {activeCommentsId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCommentsId(null)}
          >
            <motion.div
              className="glass-card w-full max-w-lg p-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary">Comments</h2>
                <button
                  onClick={() => setActiveCommentsId(null)}
                  className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-surface hover:text-text-secondary"
                >
                  Close
                </button>
              </div>

              <CommentSection
                comments={activeComments}
                loading={submittingComment}
                onSubmit={submitComment}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
