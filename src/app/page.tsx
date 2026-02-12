"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TASKS } from "@/lib/constants";

const FLOATING_EMOJIS = ["💪", "🔥", "🏃", "💧", "📖", "🥗", "⭐", "🚀", "🏆", "⚡"];

function FloatingEmoji({ emoji, index }: { emoji: string; index: number }) {
  const randomX = 10 + (index * 17) % 80;
  const randomDelay = index * 0.4;
  const randomDuration = 5 + (index % 4) * 2;

  return (
    <motion.div
      className="pointer-events-none absolute text-3xl opacity-20"
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
      aria-hidden="true"
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
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6 pb-12 pt-8 sm:pt-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {FLOATING_EMOJIS.map((emoji, i) => (
          <FloatingEmoji key={i} emoji={emoji} index={i} />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent-violet/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-pink/20 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-amber/10 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <motion.header
          className="space-y-4 text-center"
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 24 } },
          }}
        >
          <h1 className="gradient-text text-balance text-6xl font-black leading-tight tracking-tight sm:text-7xl">
            75 Squad
          </h1>
          <p className="text-balance text-xl font-medium text-text-secondary sm:text-2xl">
            Crush 75 Hard with a squad that keeps you accountable every single day.
          </p>
          <p className="mx-auto max-w-xl text-sm text-text-secondary sm:text-base">
            Track daily tasks, build streaks, celebrate wins, and send real reminders across in-app,
            push, email, and SMS so nobody drifts off plan.
          </p>
        </motion.header>

        <motion.section
          className="glass-card space-y-3 p-6"
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } },
          }}
          aria-label="Daily tasks"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            The 5 Daily Tasks
          </p>
          {DEFAULT_TASKS.map((task, index) => (
            <motion.div
              key={task.key}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-bg-surface/50 p-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + index * 0.06, type: "spring", stiffness: 200, damping: 25 }}
            >
              <span className="text-2xl" aria-hidden="true">{task.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{task.label}</p>
                <p className="truncate text-xs text-text-muted">{task.description}</p>
              </div>
              {"optional" in task && task.optional && (
                <span className="rounded-full border border-border bg-bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
                  Optional
                </span>
              )}
            </motion.div>
          ))}
        </motion.section>

        <motion.section
          className="glass-card space-y-3 p-5"
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } },
          }}
        >
          <h2 className="text-lg font-bold text-text-primary">Why Teams Finish Stronger</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Solo habit trackers lose momentum when the week gets messy. 75 Squad keeps momentum visible.
            Everyone in your group sees progress, daily completions, and streak movement in one place, which
            removes guesswork and increases follow-through.
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Invite links make onboarding quick. Shared feeds make effort visible. Real notification channels
            make reminders dependable. The result is a challenge flow that is fast to learn, easy to use on
            mobile, and practical for teams that want consistency for the full 75 days.
          </p>
        </motion.section>

        <motion.div
          className="w-full"
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } },
          }}
        >
          <motion.button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber px-6 py-4 text-lg font-bold text-white shadow-lg transition-opacity hover:opacity-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
            whileHover={{ scale: 1.01, boxShadow: "0 0 30px rgba(124, 58, 237, 0.4)" }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

        <motion.footer
          className="space-y-3 pb-2 text-center"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 0.8 } },
          }}
        >
          <p className="text-sm text-text-muted">Join your squad. Stay accountable. Finish strong.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-text-secondary">
            <Link href="/about" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
              About
            </Link>
            <span aria-hidden="true">•</span>
            <Link href="/contact" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
              Contact
            </Link>
            <span aria-hidden="true">•</span>
            <Link href="/privacy" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
              Privacy
            </Link>
          </div>
        </motion.footer>
      </motion.div>
    </div>
  );
}
