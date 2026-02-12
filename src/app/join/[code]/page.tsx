"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// TODO: replace with real data from Supabase
const MOCK_GROUP = {
  name: "Iron Squad 💪",
  memberCount: 4,
  members: ["Sarah K.", "Mike D.", "Jordan P.", "Alex R."],
};

export default function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    }
    checkAuth();
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/join/${code}`,
      },
    });
  }

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      // TODO: call Supabase to join the group using invite code
      // const supabase = createClient();
      // const { data: group } = await supabase.from('groups').select().eq('invite_code', code).single();
      // await supabase.from('group_members').insert({ group_id: group.id, user_id: session.user.id, role: 'member' });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setError("Failed to join squad. The invite link might be invalid.");
      setJoining(false);
    }
  }

  // Loading state
  if (isLoggedIn === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-3 border-accent-violet/30 border-t-accent-violet rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-accent-violet/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-pink/15 rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm space-y-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-2"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
          }}
        >
          <motion.span
            className="text-5xl inline-block"
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          >
            👥
          </motion.span>
          <h1 className="text-3xl font-black gradient-text">
            You&apos;re Invited!
          </h1>
        </motion.div>

        {/* Group card */}
        <motion.div
          className="glass-card p-6 space-y-4"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
          }}
        >
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">{MOCK_GROUP.name}</h2>
            <p className="text-sm text-text-secondary mt-1">
              {MOCK_GROUP.memberCount} members crushing 75 Hard
            </p>
          </div>

          {/* Members preview */}
          <div className="flex justify-center -space-x-2">
            {MOCK_GROUP.members.slice(0, 4).map((name, i) => (
              <motion.div
                key={name}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-violet to-accent-pink flex items-center justify-center text-xs font-bold text-white border-2 border-bg-card"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                {name[0]}
              </motion.div>
            ))}
            {MOCK_GROUP.memberCount > 4 && (
              <motion.div
                className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center text-xs font-bold text-text-muted border-2 border-bg-card"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                +{MOCK_GROUP.memberCount - 4}
              </motion.div>
            )}
          </div>

          <p className="text-xs text-text-muted text-center">
            Invite code: <span className="font-mono text-text-secondary">{code}</span>
          </p>
        </motion.div>

        {/* Action */}
        <motion.div
          className="space-y-3"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
          }}
        >
          {joined ? (
            <motion.div
              className="text-center space-y-3 py-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <motion.span
                className="text-5xl inline-block"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                🎉
              </motion.span>
              <p className="text-lg font-bold text-accent-emerald">
                Welcome to the squad!
              </p>
              <p className="text-sm text-text-muted">Redirecting to dashboard...</p>
            </motion.div>
          ) : isLoggedIn ? (
            <>
              <motion.button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber text-white font-bold text-lg disabled:opacity-60 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Joining...
                  </span>
                ) : (
                  "Join Squad 🚀"
                )}
              </motion.button>
              {error && (
                <motion.p
                  className="text-accent-red text-sm text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary text-center">
                Sign in to join this squad
              </p>
              <motion.button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber text-white font-bold text-lg disabled:opacity-60 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {signingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </span>
                )}
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Back link */}
        <motion.div
          className="text-center"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 0.6 } },
          }}
        >
          <button
            onClick={() => router.push("/")}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors cursor-pointer"
          >
            ← Back to home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
