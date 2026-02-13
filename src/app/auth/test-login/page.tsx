"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TestLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true" && process.env.NODE_ENV !== "production";

  // Hooks must be unconditional (even when the page is disabled).
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_E2E_USER_EMAIL ?? "");
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_E2E_USER_PASSWORD ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!e2eEnabled) {
      router.replace("/");
      return;
    }

    // In E2E we want to avoid interacting before React has hydrated.
    setHydrated(true);
  }, [e2eEnabled, router]);

  if (!e2eEnabled) {
    return null;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const disableForm = loading || !hydrated;

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <motion.form
        onSubmit={handleSignIn}
        className="glass-card w-full max-w-sm space-y-4 p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">E2E Test Login</h1>

        {hydrated && (
          <div data-testid="hydrated" className="sr-only">
            hydrated
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="test-login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Email
          </label>
          <input
            id="test-login-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disableForm}
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="test-login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Password
          </label>
          <input
            id="test-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disableForm}
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
        </div>

        <motion.button
          type="submit"
          disabled={disableForm}
          className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          whileTap={{ scale: 0.98 }}
        >
          {!hydrated ? "Loading…" : loading ? "Signing in…" : "Sign In"}
        </motion.button>

        {error && <p className="text-sm text-accent-red">{error}</p>}
      </motion.form>
    </div>
  );
}
