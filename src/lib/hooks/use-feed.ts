"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskCompletion, FeedReaction, FeedComment, Profile } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

interface FeedItem extends TaskCompletion {
  reactions: FeedReaction[];
  userReaction: FeedReaction | null;
  reactionCounts: Record<string, number>;
  commentCount: number;
}

const PAGE_SIZE = 50;

export function useFeed(groupId: string | undefined) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const fetchProfiles = useCallback(
    async (userIds: string[]) => {
      const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
      if (!uniqueUserIds.length) {
        return new Map<string, Profile>();
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .in("id", uniqueUserIds);

      if (error) {
        console.warn("Could not load feed profiles:", error);
        return new Map<string, Profile>();
      }

      return new Map(((data ?? []) as Profile[]).map((profile) => [profile.id, profile]));
    },
    [supabase]
  );

  const fetchFeed = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !groupId) {
          setLoading(false);
          return;
        }

        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // Fetch recent completions for the group without relation expansion to avoid schema cache issues.
        const { data: completionsData, error: completionsError } = await supabase
          .from("task_completions")
          .select("id, user_id, group_id, task_key, date, note, completed_at")
          .eq("group_id", groupId)
          .order("completed_at", { ascending: false })
          .range(from, to);

        if (completionsError) {
          console.error("Error fetching feed:", completionsError);
          toast.error("Could not load feed.");
          setLoading(false);
          return;
        }

        const completions = (completionsData ?? []) as TaskCompletion[];

        if (completions.length < PAGE_SIZE) {
          setHasMore(false);
        }

        if (completions.length === 0) {
          if (!append) setFeedItems([]);
          setLoading(false);
          return;
        }

        const completionIds = completions.map((c) => c.id);
        const profileMap = await fetchProfiles(completions.map((c) => c.user_id));

        // Fetch reactions for these completions
        const { data: reactionsData, error: reactionsError } = await supabase
          .from("feed_reactions")
          .select("id, completion_id, user_id, emoji, created_at")
          .in("completion_id", completionIds);

        if (reactionsError) {
          console.error("Error fetching reactions:", reactionsError);
        }

        const reactions = (reactionsData ?? []) as FeedReaction[];

        // Fetch comment counts for these completions
        const { data: commentCountsData, error: commentCountsError } =
          await supabase
            .from("feed_comments")
            .select("completion_id")
            .in("completion_id", completionIds);

        if (commentCountsError) {
          console.error("Error fetching comment counts:", commentCountsError);
        }

        const commentsList = commentCountsData ?? [];
        const commentCountMap: Record<string, number> = {};
        for (const c of commentsList) {
          const cid = (c as { completion_id: string }).completion_id;
          commentCountMap[cid] = (commentCountMap[cid] ?? 0) + 1;
        }

        // Build feed items with reactions and counts
        const items: FeedItem[] = completions.map((completion) => {
          const completionReactions = reactions.filter(
            (r) => r.completion_id === completion.id
          );

          const userReaction =
            completionReactions.find((r) => r.user_id === user.id) ?? null;

          const reactionCounts: Record<string, number> = {};
          for (const r of completionReactions) {
            reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
          }

          return {
            ...completion,
            profiles: profileMap.get(completion.user_id),
            reactions: completionReactions,
            userReaction,
            reactionCounts,
            commentCount: commentCountMap[completion.id] ?? 0,
          };
        });

        if (append) {
          setFeedItems((prev) => [...prev, ...items]);
        } else {
          setFeedItems(items);
        }

        setLoading(false);
      } catch (error) {
        console.error("Unexpected feed load error:", error);
        toast.error("Could not load feed.");
        setLoading(false);
      }
    },
    [supabase, groupId, toast, fetchProfiles]
  );

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPage(0);
    setHasMore(true);
    fetchFeed(0, false);
  }, [groupId, fetchFeed]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`feed:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_completions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchFeed(0, false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_reactions",
        },
        () => {
          fetchFeed(0, false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_comments",
        },
        () => {
          fetchFeed(0, false);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Feed realtime unavailable; continuing without live updates.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, fetchFeed]);

  const loadMore = async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchFeed(nextPage, true);
  };

  const addReaction = async (completionId: string, emoji: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("feed_reactions").upsert(
      {
        completion_id: completionId,
        user_id: user.id,
        emoji,
      },
      { onConflict: "completion_id,user_id" }
    );

    if (error) {
      console.error("Error adding reaction:", error);
      toast.error("Could not add reaction.");
      return;
    }

    // Optimistic update
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id !== completionId) return item;

        const newReaction: FeedReaction = {
          id: crypto.randomUUID(),
          completion_id: completionId,
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        };

        // Remove any existing user reaction from counts
        const updatedCounts = { ...item.reactionCounts };
        if (item.userReaction) {
          const oldEmoji = item.userReaction.emoji;
          updatedCounts[oldEmoji] = (updatedCounts[oldEmoji] ?? 1) - 1;
          if (updatedCounts[oldEmoji] <= 0) delete updatedCounts[oldEmoji];
        }
        updatedCounts[emoji] = (updatedCounts[emoji] ?? 0) + 1;

        return {
          ...item,
          userReaction: newReaction,
          reactionCounts: updatedCounts,
        };
      })
    );
  };

  const removeReaction = async (completionId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("feed_reactions")
      .delete()
      .eq("completion_id", completionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error removing reaction:", error);
      toast.error("Could not remove reaction.");
      return;
    }

    // Optimistic update
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id !== completionId || !item.userReaction) return item;

        const updatedCounts = { ...item.reactionCounts };
        const oldEmoji = item.userReaction.emoji;
        updatedCounts[oldEmoji] = (updatedCounts[oldEmoji] ?? 1) - 1;
        if (updatedCounts[oldEmoji] <= 0) delete updatedCounts[oldEmoji];

        return {
          ...item,
          userReaction: null,
          reactionCounts: updatedCounts,
        };
      })
    );
  };

  const addComment = async (completionId: string, content: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("feed_comments")
      .insert({
        completion_id: completionId,
        user_id: user.id,
        content,
      })
      .select("id, completion_id, user_id, content, created_at")
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      toast.error("Could not add comment.");
      return;
    }

    const profileMap = await fetchProfiles([user.id]);
    const newComment = {
      ...(data as FeedComment),
      profiles: profileMap.get(user.id),
    } as FeedComment;

    // Update the comments cache
    setComments((prev) => ({
      ...prev,
      [completionId]: [...(prev[completionId] ?? []), newComment],
    }));

    // Update comment count on the feed item
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === completionId
          ? { ...item, commentCount: item.commentCount + 1 }
          : item
      )
    );
  };

  const loadComments = async (completionId: string) => {
    const { data, error } = await supabase
      .from("feed_comments")
      .select("id, completion_id, user_id, content, created_at")
      .eq("completion_id", completionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
      toast.error("Could not load comments.");
      return;
    }

    const rawComments = (data ?? []) as FeedComment[];
    const profileMap = await fetchProfiles(rawComments.map((comment) => comment.user_id));
    const enrichedComments = rawComments.map((comment) => ({
      ...comment,
      profiles: profileMap.get(comment.user_id),
    }));

    setComments((prev) => ({
      ...prev,
      [completionId]: enrichedComments,
    }));
  };

  return {
    feedItems,
    loading,
    hasMore,
    loadMore,
    addReaction,
    removeReaction,
    addComment,
    comments,
    loadComments,
  };
}
