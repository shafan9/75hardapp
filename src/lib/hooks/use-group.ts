"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import type { Group, GroupMember } from "@/lib/types";

export function useGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGroup = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get the user's group membership, joined with the group
      const { data: membership, error: memberError } = await supabase
        .from("group_members")
        .select("*, groups(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching group membership:", memberError);
        setLoading(false);
        return;
      }

      if (!membership || !membership.groups) {
        setGroup(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const groupData = membership.groups as unknown as Group;
      setGroup(groupData);

      // Fetch all members of this group with their profiles
      await fetchMembers(groupData.id);
    } catch (error) {
      console.error("Error in fetchGroup:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchMembers = useCallback(
    async (groupId: string) => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*, profiles(*)")
        .eq("group_id", groupId);

      if (error) {
        console.error("Error fetching members:", error);
        return;
      }

      setMembers((data as unknown as GroupMember[]) ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Subscribe to realtime changes on group_members for this group
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
          fetchMembers(group.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group, supabase, fetchMembers]);

  const createGroup = async (name: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Must be logged in to create a group");
      return null;
    }

    const inviteCode = generateInviteCode();
    const today = format(new Date(), "yyyy-MM-dd");

    // Create the group
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      return null;
    }

    // Add the creator as admin
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberError) {
      console.error("Error adding creator as member:", memberError);
      return null;
    }

    // Create challenge_progress entry
    const { error: progressError } = await supabase
      .from("challenge_progress")
      .insert({
        user_id: user.id,
        group_id: newGroup.id,
        start_date: today,
        current_day: 0,
        is_active: true,
      });

    if (progressError) {
      console.error("Error creating challenge progress:", progressError);
      return null;
    }

    setGroup(newGroup as Group);
    await fetchMembers(newGroup.id);

    return newGroup as Group;
  };

  const joinGroup = async (inviteCode: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Must be logged in to join a group");
      return null;
    }

    const today = format(new Date(), "yyyy-MM-dd");

    // Find the group by invite code
    const { data: foundGroup, error: findError } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (findError || !foundGroup) {
      console.error("Group not found:", findError);
      return null;
    }

    // Add user to group_members
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: foundGroup.id,
        user_id: user.id,
        role: "member",
      });

    if (memberError) {
      console.error("Error joining group:", memberError);
      return null;
    }

    // Create challenge_progress entry
    const { error: progressError } = await supabase
      .from("challenge_progress")
      .insert({
        user_id: user.id,
        group_id: foundGroup.id,
        start_date: today,
        current_day: 0,
        is_active: true,
      });

    if (progressError) {
      console.error("Error creating challenge progress:", progressError);
      return null;
    }

    setGroup(foundGroup as Group);
    await fetchMembers(foundGroup.id);

    return foundGroup as Group;
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
