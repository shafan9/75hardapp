"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";

interface InviteGroupInfo {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number | null;
}

async function ensureOwnProfile() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const metadata = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Player",
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error ensuring profile:", error);
    return null;
  }

  return user;
}

async function lookupInviteGroup(code: string): Promise<InviteGroupInfo | null> {
  const supabase = createClient();

  const { data: rpcData, error: rpcError } = await supabase
    .rpc("lookup_group_by_invite_code", { code })
    .maybeSingle();

  const rpcRow = rpcData as
    | { id: string; name: string; invite_code: string; member_count: number | null }
    | null;

  if (!rpcError && rpcRow?.id) {

    return {
      id: rpcRow.id,
      name: rpcRow.name,
      inviteCode: rpcRow.invite_code,
      memberCount: typeof rpcRow.member_count === "number" ? rpcRow.member_count : null,
    };
  }

  const rpcErrorCode = (rpcError as { code?: string } | null)?.code;
  if (rpcError && rpcErrorCode !== "PGRST202" && rpcErrorCode !== "42883") {
    console.warn("Invite lookup RPC error:", rpcError);
  }

  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("invite_code", code)
    .maybeSingle();

  if (groupError || !groupData) return null;

  let memberCount: number | null = null;
  const { count } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupData.id);

  if (typeof count === "number") {
    memberCount = count;
  }

  return {
    id: groupData.id,
    name: groupData.name,
    inviteCode: groupData.invite_code,
    memberCount,
  };
}

export default function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [groupInfo, setGroupInfo] = useState<InviteGroupInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [joining, setJoining] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInviteData() {
      setLoadingPreview(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));

      const invite = await lookupInviteGroup(code);
      setGroupInfo(invite);
      setLoadingPreview(false);
    }

    void loadInviteData();
  }, [code]);

  async function handleSignIn() {
    setSigningIn(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/join/${code}`)}`,
      },
    });

    if (error) {
      setSigningIn(false);
      setError("Could not start sign-in flow.");
      toast.error("Could not start sign-in flow.");
    }
  }

  async function handleJoin() {
    if (!groupInfo || joining) return;

    setJoining(true);
    setError(null);

    const user = await ensureOwnProfile();

    if (!user) {
      setJoining(false);
      setError("Please sign in first.");
      toast.error("Please sign in first.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const supabase = createClient();

    const { error: membershipError } = await supabase.from("group_members").insert({
      group_id: groupInfo.id,
      user_id: user.id,
      role: "member",
    });

    if (membershipError && membershipError.code !== "23505") {
      console.error("Join group membership error:", membershipError);
      setJoining(false);
      setError("Could not join this squad.");
      toast.error("Could not join this squad.");
      return;
    }

    const { error: progressError } = await supabase.from("challenge_progress").insert({
      user_id: user.id,
      group_id: groupInfo.id,
      start_date: today,
      is_active: true,
    });

    if (progressError && progressError.code !== "23505") {
      console.error("Join challenge progress error:", progressError);
      setJoining(false);
      setError("Joined squad, but failed to initialize progress.");
      toast.error("Joined squad, but failed to initialize progress.");
      return;
    }

    setJoined(true);
    toast.success(`Joined ${groupInfo.name}.`);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  if (loadingPreview || isLoggedIn === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Loading invite"
        />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="glass-card w-full max-w-md space-y-3 p-6 text-center">
          <p className="text-4xl">🚫</p>
          <h1 className="text-xl font-bold text-text-primary">Invalid Invite</h1>
          <p className="text-sm text-text-secondary">
            This invite link is missing or expired.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          >
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-1/3 h-80 w-80 rounded-full bg-accent-violet/15 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-80 w-80 rounded-full bg-accent-pink/15 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-2 text-center">
          <p className="text-5xl">👥</p>
          <h1 className="text-3xl font-black gradient-text">You&apos;re Invited!</h1>
        </div>

        <div className="glass-card space-y-4 p-6 text-center">
          <h2 className="text-xl font-bold text-text-primary">{groupInfo.name}</h2>
          <p className="text-sm text-text-secondary">
            {typeof groupInfo.memberCount === "number"
              ? `${groupInfo.memberCount} members`
              : "Join this squad"}
          </p>
          <p className="text-xs text-text-muted">
            Invite code: <span className="font-mono text-text-secondary">{groupInfo.inviteCode}</span>
          </p>
        </div>

        <div className="space-y-3">
          {joined ? (
            <div className="space-y-2 py-4 text-center">
              <p className="text-5xl">🎉</p>
              <p className="text-lg font-bold text-accent-emerald">Welcome to the squad!</p>
              <p className="text-sm text-text-muted">Redirecting…</p>
            </div>
          ) : isLoggedIn ? (
            <motion.button
              onClick={() => {
                void handleJoin();
              }}
              disabled={joining}
              className="w-full rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber py-4 text-lg font-bold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
              whileTap={{ scale: 0.98 }}
            >
              {joining ? "Joining…" : "Join Squad"}
            </motion.button>
          ) : (
            <motion.button
              onClick={() => {
                void handleSignIn();
              }}
              disabled={signingIn}
              className="w-full rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber py-4 text-lg font-bold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
              whileTap={{ scale: 0.98 }}
            >
              {signingIn ? "Signing in…" : "Sign in with Google"}
            </motion.button>
          )}

          {error && <p className="text-center text-sm text-accent-red">{error}</p>}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          >
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
