import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";

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

    const timezone = getTimezone(request);
    const today = getLocalDate(new Date(), timezone);

    const [profilesResult, completionsResult, progressResult] = await Promise.all([
      db.from("profiles").select("id, display_name, avatar_url, created_at").in("id", userIds),
      db
        .from("task_completions")
        .select("user_id, task_key")
        .eq("group_id", groupId)
        .eq("date", today)
        .in("user_id", userIds),
      db.from("challenge_progress").select("*").eq("group_id", groupId).in("user_id", userIds),
    ]);

    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
    }

    if (completionsResult.error) {
      return NextResponse.json({ error: completionsResult.error.message }, { status: 500 });
    }

    if (progressResult.error) {
      return NextResponse.json({ error: progressResult.error.message }, { status: 500 });
    }

    const profilesById = new Map(
      ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    const completionsByUser: Record<string, string[]> = {};
    for (const completion of completionsResult.data ?? []) {
      const uid = completion.user_id as string;
      if (!completionsByUser[uid]) {
        completionsByUser[uid] = [];
      }
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
        currentDay: getDisplayDay(progress, today),
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

    return NextResponse.json({ memberStatuses }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
