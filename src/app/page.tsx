"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASKS } from "@/lib/constants";

const FLOATING_EMOJIS = ["💪", "🔥", "🏃", "💧", "📖", "🥗", "⭐", "🚀", "🏆", "⚡"];

function FloatingEmoji({ emoji, index }: { emoji: string; index: number }) {
  const randomX = 10 + (index * 17) % 80;
  const randomDelay = index * 0.4;
  const randomDuration = 5 + (index % 4) * 2;

  return (
    <motion.div
      className="absolute text-3xl pointer-events-none select-none opacity-20"
      style={{ left: `${randomX}%` }}
      initial={{ y: "100vh", rotate: 0 }}
      animate={{
        y: "-20vh",
        rotate: [0, 15, -15, 0],
      }}
      transition={{
        y: { duration: randomDuration, repeat: Infinity, delay: randomDelay, ease: "linear" },
        rotate: { duration: 3, repeat: Infinity, delay: randomDelay },
      }}
    >
      {emoji}
    </motion.div>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Floating background emojis */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {FLOATING_EMOJIS.map((emoji, i) => (
          <FloatingEmoji key={i} emoji={emoji} index={i} />
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-violet/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-pink/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-amber/10 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {/* Logo / Title */}
        <motion.div
          className="text-center"
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.9 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
          }}
        >
          <h1 className="text-6xl sm:text-7xl font-black gradient-text leading-tight tracking-tight">
            75 Squad
          </h1>
          <motion.p
            className="text-xl sm:text-2xl text-text-secondary mt-3 font-medium"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { delay: 0.2 } },
            }}
          >
            Crush 75 Hard Together 🔥
          </motion.p>
        </motion.div>

        {/* Challenge items */}
        <motion.div
          className="w-full glass-card p-6 space-y-3"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } },
          }}
        >
          <p className="text-sm text-text-muted uppercase tracking-wider font-semibold mb-4">
            The 5 Daily Tasks
          </p>
          {DEFAULT_TASKS.map((task, index) => (
            <motion.div
              key={task.key}
              className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface/50 border border-border/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 200, damping: 25 }}
            >
              <span className="text-2xl">{task.emoji}</span>
              <div className="flex-1">
                <p className="text-text-primary font-semibold text-sm">{task.label}</p>
                <p className="text-text-muted text-xs">{task.description}</p>
              </div>
              {"optional" in task && task.optional && (
                <span className="text-[10px] uppercase tracking-wider text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-border">
                  Optional
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Sign in button */}
        <motion.div
          className="w-full"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } },
          }}
        >
          <motion.button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber text-white shadow-lg disabled:opacity-60 cursor-pointer"
            whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(124, 58, 237, 0.4)" }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
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
        </motion.div>

        {/* Footer tagline */}
        <motion.p
          className="text-text-muted text-sm text-center"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 1 } },
          }}
        >
          Join your squad. Stay accountable. Finish strong. 💪
        </motion.p>
      </motion.div>
    </div>
  );
}
