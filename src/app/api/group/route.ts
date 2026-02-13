import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInviteCode } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

async function getAuthenticatedUser() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  return { user, sessionClient };
}

function getDbClient() {
  return createAdminClient();
}

async function ensureProfile(
  db: ReturnType<typeof getDbClient>,
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>["user"]>
) {
  const metadata = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };

  const { error } = await db.from("profiles").upsert(
    {
      id: user.id,
      display_name: metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Player",
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Could not ensure profile: ${error.message}`);
  }
}

async function resolveMembershipGroupId(db: ReturnType<typeof getDbClient>, userId: string) {
  const { data: membershipRows, error: membershipError } = await db
    .from("group_members")
    .select("group_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1);

  if (membershipError) {
    throw new Error(`Could not load group membership: ${membershipError.message}`);
  }

  const directMembershipGroupId =
    (membershipRows?.[0] as { group_id?: string } | undefined)?.group_id ?? null;

  if (directMembershipGroupId) {
    return directMembershipGroupId;
  }

  const { data: createdGroup, error: createdGroupError } = await db
    .from("groups")
    .select("id")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (createdGroupError) {
    throw new Error(`Could not load created groups: ${createdGroupError.message}`);
  }

  const fallbackGroupId = (createdGroup as { id?: string } | null)?.id;
  if (!fallbackGroupId) {
    return null;
  }

  await db.from("group_members").insert({
    group_id: fallbackGroupId,
    user_id: userId,
    role: "admin",
  });

  return fallbackGroupId;
}

async function buildGroupState(db: ReturnType<typeof getDbClient>, userId: string) {
  const groupId = await resolveMembershipGroupId(db, userId);

  if (!groupId) {
    return { group: null, members: [] };
  }

  const { data: groupData, error: groupError } = await db
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !groupData) {
    throw new Error(groupError?.message ?? "Could not load group details.");
  }

  const group = groupData as GroupRow;

  const { data: membersData, error: membersError } = await db
    .from("group_members")
    .select("id, group_id, user_id, role, joined_at")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });

  if (membersError) {
    throw new Error(`Could not load group members: ${membersError.message}`);
  }

  const members = (membersData ?? []) as GroupMemberRow[];
  const userIds = members.map((row) => row.user_id);

  const { data: profilesData, error: profilesError } = userIds.length
    ? await db.from("profiles").select("id, display_name, avatar_url, created_at").in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(`Could not load member profiles: ${profilesError.message}`);
  }

  const profilesById = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  const normalizedMembers = members.map((member) => ({
    ...member,
    profiles: profilesById.get(member.user_id) ?? null,
  }));

  return {
    group,
    members: normalizedMembers,
  };
}

async function createGroup(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  name: string
): Promise<GroupRow> {
  let createdGroup: GroupRow | null = null;
  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await db
      .from("groups")
      .insert({
        name,
        created_by: userId,
        invite_code: generateInviteCode(),
      })
      .select("*")
      .single();

    if (!error && data) {
      createdGroup = data as GroupRow;
      break;
    }

    lastError = error as { code?: string; message?: string };
    if (lastError?.code !== "23505") {
      break;
    }
  }

  if (!createdGroup) {
    throw new Error(lastError?.message ?? "Could not create squad.");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: membershipError } = await db.from("group_members").insert({
    group_id: createdGroup.id,
    user_id: userId,
    role: "admin",
  });

  if (membershipError && membershipError.code !== "23505") {
    throw new Error(`Could not add creator to squad: ${membershipError.message}`);
  }

  const { error: progressError } = await db.from("challenge_progress").upsert(
    {
      user_id: userId,
      group_id: createdGroup.id,
      start_date: today,
      current_day: 0,
      is_active: true,
    },
    { onConflict: "user_id,group_id" }
  );

  if (progressError) {
    throw new Error(`Could not initialize challenge progress: ${progressError.message}`);
  }

  return createdGroup;
}

async function joinGroup(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  inviteCode: string
): Promise<GroupRow> {
  const { data: groupData, error: groupError } = await db
    .from("groups")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (groupError || !groupData) {
    throw new Error("Invite code is invalid.");
  }

  const group = groupData as GroupRow;
  const today = new Date().toISOString().slice(0, 10);

  const { error: membershipError } = await db.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "member",
  });

  if (membershipError && membershipError.code !== "23505") {
    throw new Error(`Could not join squad: ${membershipError.message}`);
  }

  const { error: progressError } = await db.from("challenge_progress").upsert(
    {
      user_id: userId,
      group_id: group.id,
      start_date: today,
      is_active: true,
    },
    { onConflict: "user_id,group_id" }
  );

  if (progressError) {
    throw new Error(`Could not initialize challenge progress: ${progressError.message}`);
  }

  return group;
}

export async function GET() {
  try {
    const { user, sessionClient } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();
    const state = await buildGroupState(db, user.id);
    return NextResponse.json(state, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, sessionClient } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDbClient();
    await ensureProfile(db, user);

    const body = (await request.json()) as {
      action?: string;
      name?: string;
      inviteCode?: string;
    };

    if (body.action === "create") {
      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json({ error: "Squad name is required." }, { status: 400 });
      }

      await createGroup(db, user.id, name);
      const state = await buildGroupState(db, user.id);
      return NextResponse.json(state, { status: 200 });
    }

    if (body.action === "join") {
      const inviteCode = body.inviteCode?.trim();
      if (!inviteCode) {
        return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
      }

      await joinGroup(db, user.id, inviteCode);
      const state = await buildGroupState(db, user.id);
      return NextResponse.json(state, { status: 200 });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
