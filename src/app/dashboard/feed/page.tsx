"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CommentSection } from "@/components/feed/comment-section";
import { FeedList } from "@/components/feed/feed-list";
import { useAuth } from "@/lib/hooks/use-auth";
import { useFeed } from "@/lib/hooks/use-feed";
import { useGroup } from "@/lib/hooks/use-group";
import { springs } from "@/lib/animations";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const authEnabled = !authLoading && Boolean(user);

  const { group, loading: groupLoading } = useGroup({ enabled: authEnabled });
  const { feedItems, loading: feedLoading, hasMore, loadMore, addReaction, removeReaction, addComment, comments, loadComments } = useFeed(group?.id);

  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loading = authLoading || (authEnabled && groupLoading);

  const selectedItem = useMemo(
    () => feedItems.find((item) => item.id === openCommentsFor) ?? null,
    [feedItems, openCommentsFor]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan"
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
      <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-2xl">
        <p className="text-3xl" aria-hidden="true">🔐</p>
        <h1 className="mt-3 text-xl font-black text-text-primary">Sign in required</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in to view your squad feed.</p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2.5 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-2xl">
        <p className="text-3xl" aria-hidden="true">👥</p>
        <h1 className="mt-3 text-xl font-black text-text-primary">Join a squad first</h1>
        <p className="mt-2 text-sm text-text-secondary">Feed activity appears once you are in a squad.</p>
        <Link
          href="/dashboard/group"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open Squad tab
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
      <motion.section
        className="glass-card rounded-[30px] p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Feed</p>
        <h1 className="mt-1 text-3xl font-black text-text-primary">Squad Activity</h1>
        <p className="mt-2 text-sm text-text-secondary">Realtime updates from your team&apos;s daily task completions.</p>
      </motion.section>

      {feedLoading ? (
        <motion.div
          className="glass-card rounded-[28px] p-6 text-center text-sm text-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading feed…
        </motion.div>
      ) : (
        <FeedList
          items={feedItems}
          onReact={(completionId, emoji) => {
            const item = feedItems.find((feedItem) => feedItem.id === completionId);
            if (!item) return;

            if (item.userReaction?.emoji === emoji) {
              void removeReaction(completionId);
              return;
            }

            void addReaction(completionId, emoji);
          }}
          onComment={(completionId) => {
            setOpenCommentsFor(completionId);
            void loadComments(completionId);
          }}
        />
      )}

      {hasMore && !feedLoading ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Load more
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {openCommentsFor && selectedItem ? (
          <motion.div
            className="fixed inset-0 z-[110] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenCommentsFor(null)}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-bg-card p-5"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={springs.smooth}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
              <h2 className="text-lg font-black text-text-primary">Comments</h2>
              <p className="mb-4 text-xs text-text-secondary">
                {selectedItem.profiles?.display_name || "Someone"} completed {selectedItem.task_key.replace("_", " ")}
              </p>

              <CommentSection
                comments={comments[openCommentsFor] ?? []}
                loading={submittingComment}
                onSubmit={async (content) => {
                  setSubmittingComment(true);
                  await addComment(openCommentsFor, content);
                  await loadComments(openCommentsFor);
                  setSubmittingComment(false);
                }}
              />

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpenCommentsFor(null)}
                  className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
