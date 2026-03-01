"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { DEFAULT_TASKS } from "@/lib/constants";
import { springs } from "@/lib/animations";

export default function LandingPage() {
  return (
    <div
      className="relative min-h-dvh overflow-hidden px-4 py-6 sm:px-6 sm:py-10"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-[-120px] top-[-110px] h-80 w-80 rounded-full bg-accent-cyan/20 blur-[130px]" />
        <div className="absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-accent-orange/18 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          className="glass-card space-y-6 p-6 sm:p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.smooth}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">75 Hard Tracker</p>
            <h1 className="mt-2 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              <span className="gradient-text">75 Squad</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-text-secondary sm:text-base">
              A bold, focused way to finish 75 Hard with accountability.
              Track each day, celebrate streaks, and stay connected with your squad.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Daily checklist preview</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEFAULT_TASKS.map((task) => (
                <div
                  key={task.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3"
                >
                  <p className="text-sm font-semibold text-text-primary">
                    <span className="mr-2" aria-hidden="true">{task.emoji}</span>
                    {task.label}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{task.description}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Already invited by a teammate? Open your invite link and sign in there to join instantly.
          </p>
        </motion.section>

        <section className="space-y-4">
          <EmailAuthForm
            nextPath="/dashboard"
            title="Welcome back"
            description="Sign in to continue. New accounts are created from invite links."
            allowSignup={false}
          />

          <div className="glass-card px-4 py-3 text-xs text-text-secondary">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/about" className="hover:text-text-primary">
                About
              </Link>
              <Link href="/contact" className="hover:text-text-primary">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-text-primary">
                Privacy
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
