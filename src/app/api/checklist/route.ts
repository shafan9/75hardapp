import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import {
  addDays,
  diffDays,
  getLocalDate,
  getTimezoneFromRequest,
  isValidTimezone,
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STREAK_ACHIEVEMENTS = [
  { key: "streak_7", threshold: 7 },
  { key: "streak_14", threshold: 14 },
  { key: "streak_30", threshold: 30 },
  { key: "streak_50", threshold: 50 },
  { key: "streak_75", threshold: 75 },
] as const;

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

async function awardStreakAchievements(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  streak: number
) {
  const rows = STREAK_ACHIEVEMENTS.filter((item) => streak >= item.threshold).map((item) => ({
    user_id: userId,
    achievement_key: item.key,
  }));

  if (rows.length === 0) return;

  const { error } = await db
    .from("user_achievements")
    .upsert(rows, { onConflict: "user_id,achievement_key" });

  if (error) {
    console.error("Failed to award streak achievements:", error.message);
  }
}

async function ensureGroupAccess(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string
) {
  const { data: membership, error: membershipError } = await db
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Could not validate group membership: ${membershipError.message}`);
  }

  if (membership) return;

  const { data: ownedGroup, error: ownedGroupError } = await db
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("created_by", userId)
    .maybeSingle();

  if (ownedGroupError) {
    throw new Error(`Could not validate group ownership: ${ownedGroupError.message}`);
  }

  if (!ownedGroup) {
    throw new Error("You are not in this squad.");
  }

  await db.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    role: "admin",
  });
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

  const local = getLocalDate(new Date(createdAt), squadTimezone);
  return local || fallbackDate;
}

async function ensureProgressRow(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string,
  squadStartDate: string
) {
  const { data: existingProgress, error: progressError } = await db
    .from("challenge_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (progressError) {
    throw new Error(`Could not load challenge progress: ${progressError.message}`);
  }

  if (existingProgress) {
    const existingStart = (existingProgress as { start_date?: string | null }).start_date ?? null;
    const existingId = (existingProgress as { id?: string }).id;

    if (existingId && existingStart && existingStart !== squadStartDate) {
      const { data: updated, error: updateError } = await db
        .from("challenge_progress")
        .update({ start_date: squadStartDate })
        .eq("id", existingId)
        .select("*")
        .single();

      if (!updateError && updated) {
        return updated;
      }
    }

    return existingProgress;
  }

  const { data: createdProgress, error: insertError } = await db
    .from("challenge_progress")
    .insert({
      user_id: userId,
      group_id: groupId,
      start_date: squadStartDate,
      current_day: 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (insertError || !createdProgress) {
    throw new Error(`Could not initialize challenge progress: ${insertError?.message}`);
  }

  return createdProgress;
}

async function recomputeStreak(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string,
  startDate: string,
  today: string
) {
  const { data, error } = await db
    .from("task_completions")
    .select("task_key,date")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .in("task_key", [...DEFAULT_TASK_KEYS] as string[])
    .gte("date", startDate)
    .lte("date", today);

  if (error) {
    throw new Error(`Could not recompute streak: ${error.message}`);
  }

  const byDate = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const date = row.date as unknown as string;
    const taskKey = row.task_key as unknown as string;
    if (!date || !taskKey) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)?.add(taskKey);
  }

  const completedDates = new Set<string>();
  for (const [date, set] of byDate.entries()) {
    if (set.size >= DEFAULT_TASK_KEYS.length) {
      completedDates.add(date);
    }
  }

  const sorted = [...completedDates].sort();
  const lastCompletedDate = sorted.length ? sorted[sorted.length - 1] : null;

  if (!lastCompletedDate) {
    return { streak: 0, lastCompletedDate: null };
  }

  let streak = 1;
  let cursor = addDays(lastCompletedDate, -1);
  while (streak < TOTAL_DAYS && completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { streak, lastCompletedDate };
}

async function getChecklistState(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string | null,
  today: string,
  squadStartDate: string | null
) {
  const { data: customTasks, error: customTaskError } = await db
    .from("custom_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (customTaskError) {
    throw new Error(`Could not load custom tasks: ${customTaskError.message}`);
  }

  if (!groupId || !squadStartDate) {
    return {
      groupId: groupId ?? null,
      customTasks: customTasks ?? [],
      todayCompleted: [],
      progress: null,
      currentDay: 0,
      streak: 0,
      isAllDone: false,
      squadDate: today,
      squadStartDate,
    };
  }

  await ensureGroupAccess(db, userId, groupId);

  const [completionsResult, progress] = await Promise.all([
    db
      .from("task_completions")
      .select("task_key")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .eq("date", today),
    ensureProgressRow(db, userId, groupId, squadStartDate),
  ]);

  if (completionsResult.error) {
    throw new Error(`Could not load task completions: ${completionsResult.error.message}`);
  }

  const todayCompleted = (completionsResult.data ?? []).map((row) => row.task_key as string);

  return {
    groupId,
    customTasks: customTasks ?? [],
    todayCompleted,
    progress,
    currentDay: getDayNumber(squadStartDate, today),
    streak: getActiveStreak(progress, today),
    isAllDone: DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key)),
    squadDate: today,
    squadStartDate,
  };
}

export async function GET(request: Request) {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();
    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId");

    const fallbackTimezone = getTimezoneFromRequest(request);

    if (!groupId) {
      const today = getLocalDate(new Date(), fallbackTimezone);
      const state = await getChecklistState(db, user.id, null, today, null);
      return NextResponse.json(state, { status: 200 });
    }

    const squadTimezone = await getSquadTimezone(db, groupId, fallbackTimezone, user.id);
    const today = getLocalDate(new Date(), squadTimezone);
    const squadStartDate = await getSquadStartDate(db, groupId, squadTimezone, today);

    const state = await getChecklistState(db, user.id, groupId, today, squadStartDate);
    return NextResponse.json(state, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();
    const body = (await request.json().catch(() => ({}))) as {
      action?: "toggleTask" | "addNote" | "addCustomTask" | "removeCustomTask";
      groupId?: string;
      taskKey?: string;
      note?: string;
      name?: string;
      emoji?: string;
      id?: string;
    };

    const fallbackTimezone = getTimezoneFromRequest(request);

    const groupId = body.groupId ?? null;

    const squadTimezone = groupId
      ? await getSquadTimezone(db, groupId, fallbackTimezone, user.id)
      : fallbackTimezone;

    const today = getLocalDate(new Date(), squadTimezone);
    const squadStartDate = groupId
      ? await getSquadStartDate(db, groupId, squadTimezone, today)
      : null;

    if (body.action === "addCustomTask") {
      const name = body.name?.trim();
      const emoji = body.emoji?.trim() || "⭐";

      if (!name) {
        return NextResponse.json({ error: "Task name is required." }, { status: 400 });
      }

      const { error } = await db.from("custom_tasks").insert({
        user_id: user.id,
        name,
        emoji,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const state = await getChecklistState(db, user.id, groupId, today, squadStartDate);
      return NextResponse.json(state, { status: 200 });
    }

    if (body.action === "removeCustomTask") {
      if (!body.id) {
        return NextResponse.json({ error: "Task id is required." }, { status: 400 });
      }

      const { error } = await db
        .from("custom_tasks")
        .delete()
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const state = await getChecklistState(db, user.id, groupId, today, squadStartDate);
      return NextResponse.json(state, { status: 200 });
    }

    if (body.action === "addNote") {
      if (!body.groupId || !body.taskKey) {
        return NextResponse.json({ error: "groupId and taskKey are required." }, { status: 400 });
      }

      await ensureGroupAccess(db, user.id, body.groupId);

      const { error } = await db
        .from("task_completions")
        .update({ note: body.note?.trim() || null })
        .eq("user_id", user.id)
        .eq("group_id", body.groupId)
        .eq("task_key", body.taskKey)
        .eq("date", today);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const state = await getChecklistState(db, user.id, body.groupId, today, squadStartDate);
      return NextResponse.json(state, { status: 200 });
    }

    if (body.action === "toggleTask") {
      if (!body.groupId || !body.taskKey) {
        return NextResponse.json({ error: "groupId and taskKey are required." }, { status: 400 });
      }

      if (!squadStartDate) {
        return NextResponse.json({ error: "Could not determine squad start date." }, { status: 500 });
      }

      await ensureGroupAccess(db, user.id, body.groupId);

      const { data: existingCompletion, error: existingError } = await db
        .from("task_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("group_id", body.groupId)
        .eq("task_key", body.taskKey)
        .eq("date", today)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 });
      }

      if (existingCompletion?.id) {
        const { error: deleteError } = await db
          .from("task_completions")
          .delete()
          .eq("id", existingCompletion.id);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      } else {
        const { error: insertError } = await db.from("task_completions").insert({
          user_id: user.id,
          group_id: body.groupId,
          task_key: body.taskKey,
          date: today,
        });

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }

      const progress = await ensureProgressRow(db, user.id, body.groupId, squadStartDate);

      const { data: latestCompletions, error: completionError } = await db
        .from("task_completions")
        .select("task_key")
        .eq("user_id", user.id)
        .eq("group_id", body.groupId)
        .eq("date", today);

      if (completionError) {
        return NextResponse.json({ error: completionError.message }, { status: 500 });
      }

      const todayCompleted = (latestCompletions ?? []).map((row) => row.task_key as string);

      const { streak, lastCompletedDate } = await recomputeStreak(
        db,
        user.id,
        body.groupId,
        squadStartDate,
        today
      );

      let updatedProgress = progress;
      const progressId = (progress as { id?: string }).id;

      if (
        progressId &&
        (Number((progress as { current_day?: number | null }).current_day ?? 0) !== streak ||
          ((progress as { last_completed_date?: string | null }).last_completed_date ?? null) !==
            lastCompletedDate)
      ) {
        const { data: progressData, error: progressUpdateError } = await db
          .from("challenge_progress")
          .update({
            current_day: streak,
            last_completed_date: lastCompletedDate,
          })
          .eq("id", progressId)
          .select("*")
          .single();

        if (progressUpdateError) {
          return NextResponse.json({ error: progressUpdateError.message }, { status: 500 });
        }

        updatedProgress = progressData;

        if (lastCompletedDate === today && streak > 0) {
          await awardStreakAchievements(db, user.id, streak);
        }
      }

      const { data: customTasks, error: customTaskError } = await db
        .from("custom_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (customTaskError) {
        return NextResponse.json({ error: customTaskError.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          groupId: body.groupId,
          customTasks: customTasks ?? [],
          todayCompleted,
          progress: updatedProgress,
          currentDay: getDayNumber(squadStartDate, today),
          streak: getActiveStreak(updatedProgress, today),
          isAllDone: DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key)),
          squadDate: today,
          squadStartDate,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
