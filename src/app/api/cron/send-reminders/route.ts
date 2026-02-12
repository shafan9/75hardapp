import { NextResponse } from "next/server";
import { dispatchScheduledReminders } from "@/lib/server/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(authHeader: string | null) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice("Bearer ".length) === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchScheduledReminders();
    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
