"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const TEST_MODE_ENABLED = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true";

export default function TestLoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password || loading) return;

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
  }

  if (!TEST_MODE_ENABLED) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="glass-card w-full max-w-sm space-y-3 p-6 text-center">
          <p className="text-xl font-bold text-text-primary">Not available</p>
          <p className="text-sm text-text-secondary">
            Test auth page is only enabled in E2E mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <motion.form
        onSubmit={handleSignIn}
        className="glass-card w-full max-w-sm space-y-4 p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">E2E Test Login</h1>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-violet/50 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-violet/50 focus:outline-none"
            required
          />
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          whileTap={{ scale: 0.98 }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </motion.button>

        {error && <p className="text-sm text-accent-red">{error}</p>}
      </motion.form>
    </div>
  );
}
