import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchTestNotification } from "@/lib/server/notifications";
import type { NotificationChannel } from "@/lib/types";

const VALID_CHANNELS: NotificationChannel[] = ["in_app", "push", "email", "sms"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === "string" && VALID_CHANNELS.includes(value as NotificationChannel);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { channel?: unknown };
    if (!isNotificationChannel(body.channel)) {
      return NextResponse.json(
        { error: "Invalid channel. Use one of: in_app, push, email, sms." },
        { status: 400 }
      );
    }

    const result = await dispatchTestNotification(user.id, body.channel);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
