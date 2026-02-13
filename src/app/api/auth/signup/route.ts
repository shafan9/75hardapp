import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignupPayload = {
  email?: string;
  password?: string;
  displayName?: string;
  inviteCode?: string;
};

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  // Lightweight validation: sufficient for rejecting obvious bad inputs.
  if (email.length > 254) return false;
  if (!email.includes("@")) return false;
  if (email.startsWith("@") || email.endsWith("@")) return false;
  return true;
}


export async function POST(request: Request) {
  try {
    const allowPublicSignup = process.env.ALLOW_PUBLIC_SIGNUP === "true";
    const body = (await request.json().catch(() => ({}))) as SignupPayload;

    const rawEmail = typeof body.email === "string" ? body.email : "";
    const rawPassword = typeof body.password === "string" ? body.password : "";
    const rawInvite = typeof body.inviteCode === "string" ? body.inviteCode : "";
    const rawName = typeof body.displayName === "string" ? body.displayName : "";

    const email = normalizeEmail(rawEmail);
    const password = rawPassword.trim();
    const inviteCode = rawInvite.trim();
    const displayName = rawName.trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters for your password." },
        { status: 400 }
      );
    }

    if (!allowPublicSignup && !inviteCode) {
      return NextResponse.json(
        { error: "Signups require an invite link. Ask your squad leader for an invite." },
        { status: 403 }
      );
    }

    const db = createAdminClient();

    if (inviteCode) {
      const { data: group, error: groupError } = await db
        .from("groups")
        .select("id")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (groupError || !group) {
        return NextResponse.json({ error: "Invite code is invalid." }, { status: 404 });
      }
    }

    // Create a confirmed user so we don't rely on Supabase's shared email sender.
    const createResult = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });

    if (createResult.error) {
      const message = createResult.error.message || "Could not create account.";

      // Do not reset existing user passwords from an invite link (prevents account takeovers if an invite leaks).
      if (/already|exists|registered/i.test(message)) {
        return NextResponse.json(
          {
            error: "An account with this email already exists. Sign in instead.",
            code: "USER_EXISTS",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const createdUserId = createResult.data.user?.id;
    if (!createdUserId) {
      return NextResponse.json({ error: "Could not create account." }, { status: 400 });
    }

    await db.from("profiles").upsert(
      {
        id: createdUserId,
        display_name: displayName || null,
      },
      { onConflict: "id" }
    );

    return NextResponse.json({ ok: true, userId: createdUserId, wasExisting: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
