"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { InAppNotification } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/components/ui/toast-provider";

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("in_app_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading notifications:", error);
      toast.error("Could not load notifications.");
      setLoading(false);
      return;
    }

    setNotifications((data ?? []) as InAppNotification[]);
    setLoading(false);
  }, [supabase, toast, user?.id]);

  useEffect(() => {
    setLoading(true);
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`in_app_notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, supabase, user?.id]);

  async function markRead(notificationId: string) {
    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) {
      toast.error("Could not mark notification as read.");
      return;
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item
      )
    );
  }

  async function markAllAsRead() {
    if (!user?.id) return;
    setMarkingAll(true);
    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setMarkingAll(false);

    if (error) {
      toast.error("Could not mark all notifications as read.");
      return;
    }

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))
    );
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  if (authLoading || loading) {
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

  if (!user) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">Notifications</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">🔐</p>
          <p className="mt-2 text-sm text-text-secondary">Please sign in to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">Notifications</h1>
          <p className="text-xs text-text-muted">{unreadCount} unread</p>
        </div>
        <button
          onClick={() => {
            void markAllAsRead();
          }}
          disabled={markingAll || unreadCount === 0}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => {
              if (!item.read_at) {
                void markRead(item.id);
              }
            }}
            className={`glass-card w-full p-4 text-left ${
              item.read_at ? "opacity-75" : "ring-1 ring-accent-violet/30"
            }`}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                <p className="text-xs text-text-secondary">{item.body}</p>
              </div>
              {!item.read_at && (
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-accent-violet" />
              )}
            </div>
            <p className="mt-2 text-[10px] text-text-muted">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </p>
          </motion.button>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">🔔</p>
          <p className="mt-2 text-sm text-text-secondary">No notifications yet.</p>
        </div>
      )}
    </div>
  );
}
