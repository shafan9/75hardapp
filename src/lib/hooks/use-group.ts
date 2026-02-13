"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group, GroupMember } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";

interface GroupStateResponse {
  group: Group | null;
  members: GroupMember[];
  error?: string;
}

export function useGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const supabase = useMemo(() => createClient(), []);
  const authRetryRef = useRef(false);

  const applyState = useCallback((payload: GroupStateResponse) => {
    setGroup(payload.group ?? null);
    setMembers((payload.members ?? []) as GroupMember[]);
  }, []);

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch("/api/group", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        // On fast redirects after sign-in, cookies can land a moment later.
        if (!authRetryRef.current) {
          authRetryRef.current = true;
          setTimeout(() => {
            void fetchGroup();
          }, 700);
        }

        setGroup(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as GroupStateResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Could not load group membership.");
      }

      authRetryRef.current = false;
      applyState(payload);
    } catch (error) {
      console.error("Error loading group:", error);
      const message = error instanceof Error ? error.message : "Could not load group membership.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [applyState, toast]);

  useEffect(() => {
    void fetchGroup();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchGroup();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchGroup]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchGroup();
      } else {
        setGroup(null);
        setMembers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchGroup, supabase]);

  const createGroup = async (name: string) => {
    try {
      const response = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });

      const payload = (await response.json().catch(() => ({}))) as GroupStateResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Could not create squad.");
      }

      authRetryRef.current = false;
      applyState(payload);
      toast.success("Squad created.");
      return payload.group ?? null;
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error instanceof Error ? error.message : "Could not create squad.");
      return null;
    }
  };

  const joinGroup = async (inviteCode: string) => {
    try {
      const response = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", inviteCode }),
      });

      const payload = (await response.json().catch(() => ({}))) as GroupStateResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Could not join this squad.");
      }

      authRetryRef.current = false;
      applyState(payload);
      if (payload.group?.name) {
        toast.success(`Joined ${payload.group.name}.`);
      } else {
        toast.success("Joined squad.");
      }

      return payload.group ?? null;
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error(error instanceof Error ? error.message : "Could not join this squad.");
      return null;
    }
  };

  const getInviteLink = () => {
    if (!group) return "";

    // Prefer runtime origin so copied links always match the active deploy.
    if (typeof window !== "undefined") {
      return `${window.location.origin}/join/${group.invite_code}`;
    }

    const canonicalBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    return canonicalBase ? `${canonicalBase}/join/${group.invite_code}` : `/join/${group.invite_code}`;
  };

  return {
    group,
    members,
    loading,
    createGroup,
    joinGroup,
    getInviteLink,
    refreshGroup: fetchGroup,
  };
}
