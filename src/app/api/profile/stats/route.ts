import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const [completionResult, progressResult] = await Promise.all([
      admin
        .from("task_completions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      admin.from("challenge_progress").select("current_day").eq("user_id", user.id),
    ]);

    if (completionResult.error) {
      return NextResponse.json({ error: completionResult.error.message }, { status: 500 });
    }

    if (progressResult.error) {
      return NextResponse.json({ error: progressResult.error.message }, { status: 500 });
    }

    const totalCompletions = completionResult.count ?? 0;
    const bestStreak = Math.max(
      0,
      ...(progressResult.data ?? []).map((row) => Number((row as { current_day?: number }).current_day ?? 0))
    );

    return NextResponse.json({ totalCompletions, bestStreak }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
