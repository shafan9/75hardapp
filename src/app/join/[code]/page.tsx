"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

interface InviteGroupInfo {
  name: string;
  inviteCode: string;
  memberCount: number | null;
}

async function lookupInviteGroup(code: string): Promise<InviteGroupInfo | null> {
  const response = await fetch(`/api/invite?code=${encodeURIComponent(code)}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    group?: { name?: string; inviteCode?: string };
    memberCount?: number | null;
    error?: string;
  };

  if (response.status == 404) return null;

  if (!response.ok) {
    throw new Error(payload.error || "Could not load invite details.");
  }

  const name = payload.group?.name;
  const inviteCode = payload.group?.inviteCode;

  if (!name || !inviteCode) return null;

  return {
    name,
    inviteCode,
    memberCount: typeof payload.memberCount === "number" ? payload.memberCount : null,
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
  const supabase = useMemo(() => createClient(), []);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const [groupInfo, setGroupInfo] = useState<InviteGroupInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInviteData() {
      setLoadingPreview(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));

      try {
        const invite = await lookupInviteGroup(code);
        setGroupInfo(invite);
      } catch (lookupError) {
        console.error("Invite lookup error:", lookupError);
        const message =
          lookupError instanceof Error ? lookupError.message : "Could not load invite details.";
        setError(message);
        setGroupInfo(null);
      } finally {
        setLoadingPreview(false);
      }
    }

    void loadInviteData();
  }, [code, supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleJoin() {
    if (!groupInfo || joining) return;

    setJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Timezone": timezone },
        credentials: "same-origin",
        body: JSON.stringify({ action: "join", inviteCode: groupInfo.inviteCode }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        group?: { name?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not join this squad.");
      }

      setJoined(true);
      toast.success(`Joined ${payload.group?.name ?? groupInfo.name}.`);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (joinError) {
      console.error("Join group error:", joinError);
      const message = joinError instanceof Error ? joinError.message : "Could not join this squad.";
      setError(message);
      toast.error(message);
      setJoining(false);
    }
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
    const title = error ? "Invite Unavailable" : "Invalid Invite";
    const body = error ? error : "This invite link is missing or expired.";

    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="glass-card w-full max-w-md space-y-3 p-6 text-center">
          <p className="text-4xl">🚫</p>
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">{body}</p>
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-6 sm:px-6">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-accent-violet/15 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full bg-accent-pink/15 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-2 text-center">
          <p className="text-5xl">👥</p>
          <h1 className="text-3xl font-black gradient-text">You&apos;re Invited!</h1>
        </div>

        <div className="glass-card space-y-3 p-5 text-center">
          <h2 className="text-xl font-bold text-text-primary">{groupInfo.name}</h2>
          <p className="text-sm text-text-secondary">
            {typeof groupInfo.memberCount === "number" ? `${groupInfo.memberCount} members` : "Join this squad"}
          </p>
          <p className="text-xs text-text-muted">
            Invite code: <span className="font-mono text-text-secondary">{groupInfo.inviteCode}</span>
          </p>
        </div>

        {!isLoggedIn && (
          <EmailAuthForm
            nextPath={`/join/${code}`}
            title="Sign in to join"
            description="Create an account or sign in, then tap Join Squad."
            signupMode="admin"
            inviteCode={code}
          />
        )}

        {isLoggedIn && (
          <div className="space-y-3">
            {joined ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-5xl">🎉</p>
                <p className="text-lg font-bold text-accent-emerald">Welcome to the squad!</p>
                <p className="text-sm text-text-muted">Redirecting…</p>
              </div>
            ) : (
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
            )}

            {error && <p className="text-center text-sm text-accent-red">{error}</p>}
          </div>
        )}

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
