import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import { repairTaskCompletionDates } from "@/lib/repairs";
import {
  addDays,
  diffDays,
  getLocalDate,
  getTimezoneFromRequest,
  isValidTimezone,
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

function getDbClient() {
  return createAdminClient();
}

function clampDayNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.min(Math.floor(value), TOTAL_DAYS);
}

function getDayNumber(startDate: string | null | undefined, today: string) {
  if (!startDate) return 0;
  const delta = diffDays(startDate, today);
  return clampDayNumber(Math.max(delta + 1, 1));
}

function getActiveStreak(progress: unknown, today: string) {
  if (!progress) return 0;

  const row = progress as { current_day?: number | null; last_completed_date?: string | null };
  const streak = Number(row.current_day ?? 0);
  const lastCompleted = row.last_completed_date ?? null;

  if (!lastCompleted || streak <= 0) return 0;

  const yesterday = addDays(today, -1);
  if (lastCompleted === today || lastCompleted === yesterday) return streak;

  return 0;
}

async function getSquadTimezone(
  db: ReturnType<typeof getDbClient>,
  groupId: string,
  fallbackTimezone: string,
  requesterId: string
) {
  const { data: group, error: groupError } = await db
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return fallbackTimezone;
  }

  const ownerId = (group as { created_by?: string | null }).created_by;
  if (!ownerId) return "UTC";

  const { data: settings, error: settingsError } = await db
    .from("user_settings")
    .select("timezone")
    .eq("user_id", ownerId)
    .maybeSingle();

  const rawTz = !settingsError ? (settings as { timezone?: string | null })?.timezone ?? null : null;

  // If the owner has explicitly set a timezone (not the default placeholder), trust it.
  if (isValidTimezone(rawTz) && rawTz !== "UTC") {
    return rawTz;
  }

  // Heal older squads where the owner's timezone defaulted to UTC because the app didn't capture it.
  if (ownerId === requesterId && isValidTimezone(fallbackTimezone) && fallbackTimezone !== "UTC") {
    await db
      .from("user_settings")
      .upsert({ user_id: ownerId, timezone: fallbackTimezone }, { onConflict: "user_id" });

    return fallbackTimezone;
  }

  // Fall back to the stored owner timezone when present (even if it's UTC) so all members share a boundary.
  if (isValidTimezone(rawTz)) return rawTz;

  return "UTC";
}


async function getSquadStartDate(
  db: ReturnType<typeof getDbClient>,
  groupId: string,
  squadTimezone: string,
  fallbackDate: string
) {
  const { data: group, error: groupError } = await db
    .from("groups")
    .select("created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return fallbackDate;
  }

  const createdAt = (group as { created_at?: string | null }).created_at;
  if (!createdAt) return fallbackDate;

  return getLocalDate(new Date(createdAt), squadTimezone) || fallbackDate;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId." }, { status: 400 });
    }

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();

    const { data: membership, error: membershipError } = await db
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this squad." }, { status: 403 });
    }

    const { data: membersData, error: membersError } = await db
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const userIds = (membersData ?? []).map((row) => row.user_id as string);

    if (userIds.length === 0) {
      return NextResponse.json({ memberStatuses: [] }, { status: 200 });
    }

    const fallbackTimezone = getTimezoneFromRequest(request);
    const squadTimezone = await getSquadTimezone(db, groupId, fallbackTimezone, user.id);
    const today = getLocalDate(new Date(), squadTimezone);
    const squadStartDate = await getSquadStartDate(db, groupId, squadTimezone, today);
    const squadDayNumber = getDayNumber(squadStartDate, today);

    try {
      const { data: groupRow } = await db
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .maybeSingle();

      const ownerId = (groupRow as { created_by?: string | null } | null)?.created_by ?? null;

      if (ownerId && ownerId === user.id) {
        await repairTaskCompletionDates(db, { groupId, timezone: squadTimezone });
      }
    } catch (error) {
      console.warn("Squad status repair skipped:", error);
    }


    const [profilesResult, progressResult, completionsResult] = await Promise.all([
      db.from("profiles").select("id, display_name, avatar_url, created_at").in("id", userIds),
      db
        .from("challenge_progress")
        .select("*")
        .eq("group_id", groupId)
        .in("user_id", userIds),
      db
        .from("task_completions")
        .select("user_id, task_key")
        .eq("group_id", groupId)
        .in("user_id", userIds)
        .eq("date", today),
    ]);

    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
    }

    if (progressResult.error) {
      return NextResponse.json({ error: progressResult.error.message }, { status: 500 });
    }

    if (completionsResult.error) {
      return NextResponse.json({ error: completionsResult.error.message }, { status: 500 });
    }

    const profilesById = new Map(
      ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    const completionsByUser: Record<string, string[]> = {};
    for (const completion of completionsResult.data ?? []) {
      const uid = completion.user_id as string;
      if (!completionsByUser[uid]) completionsByUser[uid] = [];
      completionsByUser[uid].push(completion.task_key as string);
    }

    const progressByUser = new Map(
      (progressResult.data ?? []).map((row) => [row.user_id as string, row])
    );

    const memberStatuses = userIds.map((uid) => {
      const completedTasks = completionsByUser[uid] ?? [];
      const progress = progressByUser.get(uid) ?? null;

      return {
        profile:
          profilesById.get(uid) ?? {
            id: uid,
            display_name: "Member",
            avatar_url: null,
            created_at: "",
          },
        completedTasks,
        currentDay: squadDayNumber,
        streak: getActiveStreak(progress, today),
        progress,
      };
    });

    memberStatuses.sort((a, b) => {
      const aCompleted = DEFAULT_TASK_KEYS.filter((key) => a.completedTasks.includes(key)).length;
      const bCompleted = DEFAULT_TASK_KEYS.filter((key) => b.completedTasks.includes(key)).length;
      const aAllDone = aCompleted >= DEFAULT_TASK_KEYS.length;
      const bAllDone = bCompleted >= DEFAULT_TASK_KEYS.length;

      if (aAllDone && !bAllDone) return -1;
      if (!aAllDone && bAllDone) return 1;
      return bCompleted - aCompleted;
    });

    return NextResponse.json(
      { memberStatuses, squadDate: today, squadTimezone, squadStartDate },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
