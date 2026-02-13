import { getLocalDate } from "@/lib/time";

type RepairResult = {
  scanned: number;
  attempted: number;
  updated: number;
  deletedDuplicates: number;
};

type RepairOptions = {
  groupId: string;
  timezone: string;
  userId?: string;
  lookbackDays?: number;
  maxRows?: number;
};

function daysAgoIso(days: number): string {
  const ms = Math.max(0, Math.floor(days)) * 86400000;
  return new Date(Date.now() - ms).toISOString();
}

export async function repairTaskCompletionDates(
  db: any,
  { groupId, timezone, userId, lookbackDays = 4, maxRows = 1200 }: RepairOptions
): Promise<RepairResult> {
  if (!groupId || !timezone) {
    return { scanned: 0, attempted: 0, updated: 0, deletedDuplicates: 0 };
  }

  const sinceIso = daysAgoIso(lookbackDays);

  let query = db
    .from("task_completions")
    .select("id,date,completed_at")
    .eq("group_id", groupId)
    .gte("completed_at", sinceIso)
    .order("completed_at", { ascending: false })
    .limit(maxRows);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Could not scan task completions.");
  }

  const rows = (data ?? []) as Array<{ id: string; date: string; completed_at: string | null }>;
  const repairs: Array<{ id: string; date: string }> = [];

  for (const row of rows) {
    if (!row?.id || !row.completed_at) continue;

    const completedAt = new Date(row.completed_at);
    if (!Number.isFinite(completedAt.getTime())) continue;

    const correctDate = getLocalDate(completedAt, timezone);
    if (row.date !== correctDate) {
      repairs.push({ id: row.id, date: correctDate });
    }
  }

  let updated = 0;
  let deletedDuplicates = 0;

  // Keep it simple: update sequentially to avoid tripping rate limits.
  for (const item of repairs) {
    const { error: updateError } = await db
      .from("task_completions")
      .update({ date: item.date })
      .eq("id", item.id);

    if (!updateError) {
      updated += 1;
      continue;
    }

    const code = (updateError as { code?: string }).code;

    // If the corrected date conflicts with an existing completion, delete the duplicate row.
    if (code === "23505") {
      const { error: deleteError } = await db.from("task_completions").delete().eq("id", item.id);
      if (!deleteError) {
        deletedDuplicates += 1;
      }
      continue;
    }

    // Best-effort: ignore unexpected update errors so the API call can continue.
    console.warn("Failed to repair task completion date", item.id, updateError.message);
  }

  return {
    scanned: rows.length,
    attempted: repairs.length,
    updated,
    deletedDuplicates,
  };
}
