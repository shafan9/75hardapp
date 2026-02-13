import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TASKS, TOTAL_DAYS } from "@/lib/constants";
import {
  addDays,
  diffDays,
  getLocalDate,
  getTimezoneFromRequest,
  isValidTimezone,
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDbClient() {
  return createAdminClient();
}

function clampDayNumber(value: number) {
  if (!Number.isFinite(value)) return 1;
  if (value <= 1) return 1;
  return Math.min(Math.floor(value), TOTAL_DAYS);
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
  if (!ownerId) return fallbackTimezone;

  const { data: settings, error: settingsError } = await db
    .from("user_settings")
    .select("timezone")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!settingsError) {
    const rawTz = (settings as { timezone?: string | null })?.timezone ?? null;
    if (isValidTimezone(rawTz)) return rawTz;
  }

  if (ownerId === requesterId && isValidTimezone(fallbackTimezone)) {
    await db
      .from("user_settings")
      .upsert({ user_id: ownerId, timezone: fallbackTimezone }, { onConflict: "user_id" });
    return fallbackTimezone;
  }

  return fallbackTimezone;
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

function getCurrentSquadDayNumber(squadStartDate: string, squadToday: string) {
  const delta = diffDays(squadStartDate, squadToday);
  return clampDayNumber(Math.max(delta + 1, 1));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId")?.trim() ?? "";
    const memberId = url.searchParams.get("userId")?.trim() ?? "";
    const dayParam = url.searchParams.get("day");

    if (!groupId || !memberId) {
      return NextResponse.json({ error: "groupId and userId are required." }, { status: 400 });
    }

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();

    const { data: requesterMember, error: requesterError } = await db
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requesterError) {
      return NextResponse.json({ error: requesterError.message }, { status: 500 });
    }

    if (!requesterMember) {
      return NextResponse.json({ error: "Not a member of this squad." }, { status: 403 });
    }

    const { data: targetMember, error: targetError } = await db
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found in this squad." }, { status: 404 });
    }

    const fallbackTimezone = getTimezoneFromRequest(request);
    const squadTimezone = await getSquadTimezone(db, groupId, fallbackTimezone, user.id);
    const squadToday = getLocalDate(new Date(), squadTimezone);
    const squadStartDate = await getSquadStartDate(db, groupId, squadTimezone, squadToday);

    const parsedDay = dayParam ? Number(dayParam) : Number.NaN;
    const currentSquadDay = getCurrentSquadDayNumber(squadStartDate, squadToday);
    const day = Number.isFinite(parsedDay) ? clampDayNumber(parsedDay) : currentSquadDay;

    const date = addDays(squadStartDate, day - 1);

    const [profileResult, customTasksResult, completionsResult] = await Promise.all([
      db
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .eq("id", memberId)
        .maybeSingle(),
      db
        .from("custom_tasks")
        .select("id, name, emoji, created_at")
        .eq("user_id", memberId)
        .order("created_at", { ascending: true }),
      db
        .from("task_completions")
        .select("task_key, note")
        .eq("group_id", groupId)
        .eq("user_id", memberId)
        .eq("date", date),
    ]);

    if (profileResult.error) {
      return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
    }

    if (customTasksResult.error) {
      return NextResponse.json({ error: customTasksResult.error.message }, { status: 500 });
    }

    if (completionsResult.error) {
      return NextResponse.json({ error: completionsResult.error.message }, { status: 500 });
    }

    const completionMap = new Map<string, { note: string | null }>();
    for (const row of completionsResult.data ?? []) {
      completionMap.set(row.task_key as string, { note: (row.note as string | null) ?? null });
    }

    const defaultTasks = DEFAULT_TASKS.map((task) => ({
      key: task.key,
      label: task.label,
      description: task.description,
      emoji: task.emoji,
      optional: Boolean((task as { optional?: boolean }).optional),
      completed: completionMap.has(task.key),
      note: completionMap.get(task.key)?.note ?? null,
    }));

    const customTasks = (customTasksResult.data ?? []).map((task) => {
      const key = `custom_${task.id}`;
      return {
        key,
        label: task.name as string,
        description: "Custom task",
        emoji: (task.emoji as string) || "⭐",
        optional: false,
        completed: completionMap.has(key),
        note: completionMap.get(key)?.note ?? null,
      };
    });

    return NextResponse.json(
      {
        profile: profileResult.data,
        day,
        date,
        isToday: date === squadToday,
        currentSquadDay,
        squadStartDate,
        squadToday,
        squadTimezone,
        tasks: [...defaultTasks, ...customTasks],
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
