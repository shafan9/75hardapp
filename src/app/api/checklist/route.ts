import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";

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

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getTimezone(request: Request) {
  const header = request.headers.get("x-timezone") ?? request.headers.get("X-Timezone");
  const url = new URL(request.url);
  const query = url.searchParams.get("tz");
  const tz = (header ?? query ?? "").trim();
  return isValidTimezone(tz) ? tz : "UTC";
}

function getLocalDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = map.year ?? "1970";
  const month = map.month ?? "01";
  const day = map.day ?? "01";

  return `${year}-${month}-${day}`;
}

function getDisplayDay(progress: unknown, today: string) {
  if (!progress) return 0;

  const row = progress as { current_day?: number | null; last_completed_date?: string | null };
  const completedDays = Number(row.current_day ?? 0);

  if (completedDays >= TOTAL_DAYS) return TOTAL_DAYS;

  const base = row.last_completed_date === today ? completedDays : completedDays + 1;
  return Math.min(Math.max(base, 1), TOTAL_DAYS);
}

async function awardStreakAchievements(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  currentDay: number
) {
  const rows = STREAK_ACHIEVEMENTS.filter((item) => currentDay >= item.threshold).map((item) => ({
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

  if (membership) {
    return;
  }

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

async function ensureProgressRow(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string,
  today: string
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
    return existingProgress;
  }

  const { data: createdProgress, error: insertError } = await db
    .from("challenge_progress")
    .insert({
      user_id: userId,
      group_id: groupId,
      start_date: today,
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

async function getChecklistState(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  groupId: string | null,
  today: string
) {
  const { data: customTasks, error: customTaskError } = await db
    .from("custom_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (customTaskError) {
    throw new Error(`Could not load custom tasks: ${customTaskError.message}`);
  }

  if (!groupId) {
    return {
      groupId: null,
      customTasks: customTasks ?? [],
      todayCompleted: [],
      progress: null,
      currentDay: 0,
      isAllDone: false,
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
    ensureProgressRow(db, userId, groupId, today),
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
    currentDay: getDisplayDay(progress, today),
    isAllDone: DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key)),
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

    const timezone = getTimezone(request);
    const today = getLocalDate(new Date(), timezone);

    const state = await getChecklistState(db, user.id, groupId, today);
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
    const body = (await request.json()) as {
      action?: "toggleTask" | "addNote" | "addCustomTask" | "removeCustomTask";
      groupId?: string;
      taskKey?: string;
      note?: string;
      name?: string;
      emoji?: string;
      id?: string;
    };

    const timezone = getTimezone(request);
    const today = getLocalDate(new Date(), timezone);

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

      const state = await getChecklistState(db, user.id, body.groupId ?? null, today);
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

      const state = await getChecklistState(db, user.id, body.groupId ?? null, today);
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

      const state = await getChecklistState(db, user.id, body.groupId, today);
      return NextResponse.json(state, { status: 200 });
    }

    if (body.action === "toggleTask") {
      if (!body.groupId || !body.taskKey) {
        return NextResponse.json({ error: "groupId and taskKey are required." }, { status: 400 });
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

      const progress = await ensureProgressRow(db, user.id, body.groupId, today);

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
      const allDone = DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key));

      let updatedProgress = progress;
      if (allDone && (progress as { last_completed_date?: string | null })?.last_completed_date !== today) {
        const nextDay = Math.min(Number((progress as { current_day?: number | null })?.current_day ?? 0) + 1, TOTAL_DAYS);

        const { data: progressData, error: progressUpdateError } = await db
          .from("challenge_progress")
          .update({
            current_day: nextDay,
            last_completed_date: today,
          })
          .eq("id", (progress as { id: string }).id)
          .select("*")
          .single();

        if (progressUpdateError) {
          return NextResponse.json({ error: progressUpdateError.message }, { status: 500 });
        }

        updatedProgress = progressData;

        await awardStreakAchievements(db, user.id, nextDay);
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
          currentDay: getDisplayDay(updatedProgress, today),
          isAllDone: DEFAULT_TASK_KEYS.every((key) => todayCompleted.includes(key)),
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
