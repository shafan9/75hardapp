"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  createClient,
  getAuthStorageMode,
  setAuthStorageMode,
} from "@/lib/supabase/client";
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
  signupMode = "admin",
  inviteCode,
}: EmailAuthFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberBrowser, setRememberBrowser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRememberBrowser(getAuthStorageMode() !== "session");
  }, []);

  function redirectAfterAuth() {
    if (typeof window !== "undefined" && nextPath.startsWith("/join/")) {
      window.location.assign(nextPath);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  function applyAuthStoragePreference() {
    setAuthStorageMode(rememberBrowser ? "local" : "session");
  }

  async function waitForActiveSession(timeoutMs = 3000, client = createClient()) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const { data } = await client.auth.getSession();
      if (data.session?.user) return true;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return false;
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }

    setResetting(true);
    setError(null);
    setMessage(null);

    const client = createClient();
    const { error: resetError } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setResetting(false);

    if (resetError) {
      setError(formatAuthError(resetError.message));
      return;
    }

    setMessage("Password reset email sent. Open the link to set a new password.");
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    setError(null);
    setMessage(null);

    applyAuthStoragePreference();
    const client = createClient();

    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });

    if (oauthError) {
      setError(formatAuthError(oauthError.message));
      setLoading(false);
    }
  }

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

    applyAuthStoragePreference();
    const client = createClient();

    if (mode === "signin") {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setError(formatAuthError(signInError.message));
        setLoading(false);
        return;
      }

      await waitForActiveSession(3000, client);
      toast.success("Signed in.");
      redirectAfterAuth();
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

      const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!response.ok) {
        const serverMessage = formatAuthError(payload.error || "Could not create account.");

        if (response.status === 409 && payload.code === "USER_EXISTS") {
          setMode("signin");
        }

        setError(serverMessage);
        setLoading(false);
        return;
      }

      const { error: signInError } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setError(formatAuthError(signInError.message));
        setLoading(false);
        return;
      }

      await waitForActiveSession(3000, client);
      toast.success("Account ready.");
      redirectAfterAuth();
      return;
    }

    const { data, error: signUpError } = await client.auth.signUp({
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
      await waitForActiveSession(3000, client);
      toast.success("Account created.");
      redirectAfterAuth();
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
            placeholder="e.g., Shafan…"
            className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
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
          className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
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
          placeholder={mode === "signin" ? "Enter password…" : "At least 8 characters…"}
          className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          required
        />
      </div>

      {mode === "signin" && (
        <div className="space-y-2 rounded-xl border border-border bg-bg-surface/60 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-text-secondary">
            <span className="font-semibold">Remember this browser</span>
            <input
              type="checkbox"
              checked={rememberBrowser}
              onChange={(event) => setRememberBrowser(event.target.checked)}
              className="h-5 w-5 rounded border-border bg-bg-primary accent-accent-violet"
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-text-muted">
              {rememberBrowser
                ? "Stay signed in until you sign out."
                : "Session ends when this browser window is closed."}
            </p>
            <button
              type="button"
              onClick={() => {
                void handleForgotPassword();
              }}
              disabled={loading || resetting}
              className="shrink-0 text-xs font-semibold text-text-muted transition-colors hover:text-text-secondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
            >
              {resetting ? "Sending reset…" : "Forgot password?"}
            </button>
          </div>
        </div>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        whileTap={{ scale: 0.98 }}
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </motion.button>

      {mode === "signin" && (
        <>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                void handleOAuth("google");
              }}
              disabled={loading}
              className="rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:opacity-60"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                void handleOAuth("github");
              }}
              disabled={loading}
              className="rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:opacity-60"
            >
              GitHub
            </button>
          </div>
        </>
      )}

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
