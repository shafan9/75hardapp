"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FeedCard } from "@/components/feed/feed-card";
import { CommentSection } from "@/components/feed/comment-section";
import { useAuth } from "@/lib/hooks/use-auth";
import { useGroup } from "@/lib/hooks/use-group";
import { useFeed } from "@/lib/hooks/use-feed";
import type { FeedComment, Profile } from "@/lib/types";

const FALLBACK_PROFILE: Profile = {
  id: "unknown",
  display_name: "Squad member",
  avatar_url: null,
  created_at: new Date(0).toISOString(),
};

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading;
  const authEnabled = authReady && Boolean(user);
  const { group, loading: groupLoading } = useGroup({ enabled: authEnabled });
  const {
    feedItems,
    loading: feedLoading,
    hasMore,
    loadMore,
    addReaction,
    removeReaction,
    addComment,
    comments,
    loadComments,
  } = useFeed(group?.id);

  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const totalReactions = useMemo(
    () =>
      feedItems.reduce(
        (sum, item) => sum + Object.values(item.reactionCounts).reduce((acc, count) => acc + count, 0),
        0
      ),
    [feedItems]
  );

  const totalComments = useMemo(
    () => feedItems.reduce((sum, item) => sum + item.commentCount, 0),
    [feedItems]
  );

  const loading = authLoading || (authEnabled && (groupLoading || feedLoading));

  async function handleToggleComments(completionId: string) {
    if (openCommentsFor === completionId) {
      setOpenCommentsFor(null);
      return;
    }

    setOpenCommentsFor(completionId);

    if (!comments[completionId]) {
      setLoadingCommentsFor(completionId);
      await loadComments(completionId);
      setLoadingCommentsFor(null);
    }
  }

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadMore();
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-9 w-9 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Loading feed"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5 pb-6">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">SQUAD FEED</p>
          <h1 className="mt-2 text-3xl font-black text-white">Feed</h1>
          <p className="mt-2 text-sm text-white/70">Sign in to see your squad activity and interact with progress.</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-5 pb-6">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">SQUAD FEED</p>
          <h1 className="mt-2 text-3xl font-black text-white">Feed</h1>
          <p className="mt-2 text-sm text-white/70">Join a squad first to unlock reactions and comments on daily progress.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85">Open Today</Link>
            <Link href="/dashboard/group" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85">Go to Squad tab</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <motion.section
        className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 backdrop-blur-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">SQUAD FEED</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Activity</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Strava-style squad updates with fast reactions and comments. Tap any activity card to join the momentum.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white">
              Back to Today
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">SQUAD</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{group.name}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">ACTIVITY</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{feedItems.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">REACTIONS</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{totalReactions}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">COMMENTS</p>
            <p className="mt-1 text-lg font-black text-white tabular-nums">{totalComments}</p>
          </div>
        </div>
      </motion.section>

      {feedItems.length === 0 && !feedLoading ? (
        <motion.section
          className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-5xl">🏄</p>
            <h2 className="mt-3 text-xl font-black text-white">No activity yet</h2>
            <p className="mt-2 max-w-md text-sm text-white/65">
              As soon as someone completes a task or adds a note, it will show up here for the squad to react and comment.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white"
            >
              Go complete your first task
            </Link>
          </div>
        </motion.section>
      ) : null}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {feedItems.map((item, index) => {
            const profile = item.profiles ?? FALLBACK_PROFILE;
            const reactionCount = Object.values(item.reactionCounts).reduce((sum, count) => sum + count, 0);
            const isCommentsOpen = openCommentsFor === item.id;
            const commentItems = (comments[item.id] ?? []) as FeedComment[];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.15) }}
                className="space-y-2"
              >
                <FeedCard
                  completion={{
                    ...item,
                    profiles: profile,
                    reactions: item.reactions,
                    reactionCount,
                    userReacted: Boolean(item.userReaction),
                  }}
                  onReact={(emoji) => {
                    if (item.userReaction?.emoji === emoji) {
                      void removeReaction(item.id);
                      return;
                    }
                    void addReaction(item.id, emoji);
                  }}
                  onComment={() => {
                    void handleToggleComments(item.id);
                  }}
                  commentCount={item.commentCount}
                />

                <AnimatePresence initial={false}>
                  {isCommentsOpen ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
                        <CommentSection
                          comments={commentItems}
                          onSubmit={(content) => {
                            void addComment(item.id, content);
                          }}
                          loading={loadingCommentsFor === item.id}
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {hasMore && feedItems.length > 0 ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => {
              void handleLoadMore();
            }}
            disabled={loadingMore}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
          >
            {loadingMore ? "Loading more…" : "Load more activity"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
