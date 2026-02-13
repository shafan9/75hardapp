"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";

interface EmailAuthFormProps {
  nextPath?: string;
  title?: string;
  description?: string;
  allowSignup?: boolean;
  signupMode?: "supabase" | "admin";
  inviteCode?: string;
}

function formatAuthError(message: string) {
  if (!message) return "Something went wrong.";
  if (/rate\s*limit/i.test(message)) {
    return "Too many attempts right now. Wait a few minutes and try again.";
  }
  return message;
}

export function EmailAuthForm({
  nextPath = "/dashboard",
  title = "Sign in",
  description = "Use your email and password to continue.",
  allowSignup = true,
  signupMode = "supabase",
  inviteCode,
}: EmailAuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError("Enter both email and password.");
      return;
    }

    if (mode === "signup" && normalizedPassword.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setError(formatAuthError(signInError.message));
        setLoading(false);
        return;
      }

      toast.success("Signed in.");
      router.push(nextPath);
      router.refresh();
      return;
    }

    if (!allowSignup) {
      setError("Account creation is disabled. Ask your squad leader for an invite link.");
      setLoading(false);
      return;
    }

    const normalizedDisplayName = displayName.trim() || undefined;

    if (signupMode === "admin") {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
          displayName: normalizedDisplayName,
          inviteCode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(formatAuthError(payload.error || "Could not create account."));
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setError(formatAuthError(signInError.message));
        setLoading(false);
        return;
      }

      toast.success("Account ready.");
      router.push(nextPath);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: normalizedDisplayName,
        },
      },
    });

    if (signUpError) {
      setError(formatAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      toast.success("Account created.");
      router.push(nextPath);
      router.refresh();
      return;
    }

    setMessage("Account created. Check your email for confirmation, then sign in.");
    setMode("signin");
    setPassword("");
    setLoading(false);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="glass-card w-full space-y-4 p-5 sm:p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>

      {mode === "signup" && (
        <div className="space-y-2">
          <label
            htmlFor="auth-display-name"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Name (optional)
          </label>
          <input
            id="auth-display-name"
            name="display_name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How should your squad see you?"
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          />
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="auth-email"
          className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Email
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="auth-password"
          className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Password
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
          className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          required
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        whileTap={{ scale: 0.98 }}
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </motion.button>

      <div aria-live="polite">
        {error && <p className="text-sm text-accent-red">{error}</p>}
        {message && <p className="text-sm text-accent-emerald">{message}</p>}
      </div>

      {allowSignup && (
        <button
          type="button"
          onClick={() => {
            setMode((value) => (value === "signin" ? "signup" : "signin"));
            setError(null);
            setMessage(null);
          }}
          className="text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      )}
    </motion.form>
  );
}
