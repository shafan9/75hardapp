"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import type { Group, GroupMember } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

const REQUEST_TIMEOUT_MS = 12000;

interface InviteLookupRow {
  id: string;
  name: string;
  invite_code: string;
  member_count?: number;
}

export function useGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const withTimeout = useCallback(
    async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`));
        }, REQUEST_TIMEOUT_MS);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
    []
  );

  const ensureOwnProfile = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const metadata = (user.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Player",
        avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Error ensuring profile:", error);
      return null;
    }

    return user;
  }, [supabase]);

  const lookupGroupByInviteCode = useCallback(
    async (inviteCode: string): Promise<InviteLookupRow | null> => {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("lookup_group_by_invite_code", { code: inviteCode })
        .maybeSingle();

      const rpcRow = rpcData as InviteLookupRow | null;

      if (!rpcError && rpcRow?.id) {
        return rpcRow;
      }

      const rpcErrorCode = (rpcError as { code?: string } | null)?.code;
      if (rpcError && rpcErrorCode !== "PGRST202" && rpcErrorCode !== "42883") {
        console.warn("Invite lookup RPC error:", rpcError);
      }

      const { data: legacyData, error: legacyError } = await supabase
        .from("groups")
        .select("id, name, invite_code")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (legacyError || !legacyData) {
        return null;
      }

      return legacyData as InviteLookupRow;
    },
    [supabase]
  );

  const fetchMembers = useCallback(
    async (groupId: string) => {
      try {
        const { data, error } = await withTimeout(
          supabase.from("group_members").select("*, profiles(*)").eq("group_id", groupId),
          "Loading group members"
        );

        if (error) {
          console.error("Error fetching members:", error);
          toast.error("Could not load group members.");
          return;
        }

        setMembers((data as unknown as GroupMember[]) ?? []);
      } catch (error) {
        console.error("Error loading members:", error);
        toast.error("Could not load group members.");
      }
    },
    [supabase, toast, withTimeout]
  );

  const fetchGroup = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), "Loading user for group");

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: membershipRows, error: membershipError } = await withTimeout(
        supabase
          .from("group_members")
          .select("group_id, joined_at")
          .eq("user_id", user.id)
          .order("joined_at", { ascending: false })
          .limit(1),
        "Loading group membership"
      );

      if (membershipError) {
        console.error("Error fetching group membership:", membershipError);
        toast.error("Could not load group membership.");
        setLoading(false);
        return;
      }

      const membership = membershipRows?.[0] as { group_id: string } | undefined;

      if (!membership?.group_id) {
        setGroup(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: groupData, error: groupError } = await withTimeout(
        supabase.from("groups").select("*").eq("id", membership.group_id).maybeSingle(),
        "Loading group details"
      );

      if (groupError || !groupData) {
        console.error("Error fetching group details:", groupError);
        toast.error("Could not load group details.");
        setGroup(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      setGroup(groupData as Group);
      await fetchMembers(groupData.id as string);
    } catch (error) {
      console.error("Error in fetchGroup:", error);
      toast.error("Could not load group.");
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchMembers, withTimeout]);

  useEffect(() => {
    let isMounted = true;

    const failSafeId = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      console.warn("Group loading timeout reached; continuing with fallback state.");
    }, REQUEST_TIMEOUT_MS + 2000);

    void fetchGroup();

    return () => {
      isMounted = false;
      clearTimeout(failSafeId);
    };
  }, [fetchGroup]);

  useEffect(() => {
    if (!group) return;

    const channel = supabase
      .channel(`group_members:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          void fetchMembers(group.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group, supabase, fetchMembers]);

  const createGroup = async (name: string) => {
    const user = await ensureOwnProfile();

    if (!user) {
      toast.error("Sign in to create a squad.");
      return null;
    }

    const today = format(new Date(), "yyyy-MM-dd");

    let newGroup: Group | null = null;
    let groupError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (!error && data) {
        newGroup = data as Group;
        break;
      }

      groupError = error as { code?: string; message?: string };
      if (groupError?.code !== "23505") break;
    }

    if (groupError) {
      console.error("Error creating group:", groupError);
      toast.error("Could not create squad.");
      return null;
    }

    if (!newGroup) return null;

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: "admin",
    });

    if (memberError && memberError.code !== "23505") {
      console.error("Error adding creator as member:", memberError);
      toast.error("Created squad, but failed to add you as a member.");
      return null;
    }

    const { error: progressError } = await supabase.from("challenge_progress").insert({
      user_id: user.id,
      group_id: newGroup.id,
      start_date: today,
      current_day: 0,
      is_active: true,
    });

    if (progressError && progressError.code !== "23505") {
      console.error("Error creating challenge progress:", progressError);
      toast.error("Created squad, but failed to initialize progress.");
      return null;
    }

    setGroup(newGroup);
    await fetchMembers(newGroup.id);

    toast.success("Squad created.");
    return newGroup;
  };

  const joinGroup = async (inviteCode: string) => {
    const user = await ensureOwnProfile();

    if (!user) {
      toast.error("Sign in to join a squad.");
      return null;
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const foundGroup = await lookupGroupByInviteCode(inviteCode);

    if (!foundGroup) {
      toast.error("Invite code is invalid.");
      return null;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: foundGroup.id,
      user_id: user.id,
      role: "member",
    });

    if (memberError && memberError.code !== "23505") {
      console.error("Error joining group:", memberError);
      toast.error("Could not join this squad.");
      return null;
    }

    const { error: progressError } = await supabase.from("challenge_progress").insert({
      user_id: user.id,
      group_id: foundGroup.id,
      start_date: today,
      is_active: true,
    });

    if (progressError && progressError.code !== "23505") {
      console.error("Error creating challenge progress:", progressError);
      toast.error("Joined squad, but failed to initialize progress.");
      return null;
    }

    const normalizedGroup: Group = {
      id: foundGroup.id,
      name: foundGroup.name,
      invite_code: foundGroup.invite_code,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    setGroup(normalizedGroup);
    await fetchMembers(foundGroup.id);

    toast.success(`Joined ${foundGroup.name}.`);
    return normalizedGroup;
  };

  const getInviteLink = () => {
    if (!group) return "";
    return `${window.location.origin}/join/${group.invite_code}`;
  };

  return {
    group,
    members,
    loading,
    createGroup,
    joinGroup,
    getInviteLink,
  };
}
