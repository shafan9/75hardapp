"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemberDayStatus } from "@/lib/types";

interface MemberStatusResponse {
  memberStatuses?: MemberDayStatus[];
  error?: string;
}

export function useMemberStatus(groupId: string | undefined) {
  const [memberStatuses, setMemberStatuses] = useState<MemberDayStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const fetchStatuses = useCallback(async () => {
    if (!groupId) {
      setMemberStatuses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/group/status?groupId=${encodeURIComponent(groupId)}`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Timezone": timezone },
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => ({}))) as MemberStatusResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Could not load member statuses.");
      }

      setMemberStatuses(payload.memberStatuses ?? []);
    } catch (error) {
      console.error("Error loading member statuses:", error);
      setMemberStatuses([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, timezone]);

  useEffect(() => {
    void fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    if (!groupId) return;

    const id = window.setInterval(() => {
      void fetchStatuses();
    }, 30000);

    return () => {
      window.clearInterval(id);
    };
  }, [fetchStatuses, groupId]);

  return {
    memberStatuses,
    loading,
    refresh: fetchStatuses,
  };
}
