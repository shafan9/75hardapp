import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ error: "Missing invite code." }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: group, error: groupError } = await db
      .from("groups")
      .select("id, name, invite_code")
      .eq("invite_code", code)
      .maybeSingle();

    if (groupError || !group) {
      return NextResponse.json({ error: "Invite code is invalid." }, { status: 404 });
    }

    const { count, error: countError } = await db
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id);

    if (countError) {
      return NextResponse.json(
        {
          group: {
            name: group.name,
            inviteCode: group.invite_code,
          },
          memberCount: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        group: {
          name: group.name,
          inviteCode: group.invite_code,
        },
        memberCount: typeof count === "number" ? count : null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
