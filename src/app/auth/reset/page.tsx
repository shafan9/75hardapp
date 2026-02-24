"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";

function getTokensFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash?.replace(/^#/, "") ?? "";
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, type };
}

function getRecoveryParamsFromQuery() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const errorCode = params.get("error_code");
  const errorDescription = params.get("error_description") ?? params.get("error");

  return {
    code,
    tokenHash,
    type,
    errorCode,
    errorDescription,
  };
}

function cleanSensitiveUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

function formatRecoveryError(message: string | null | undefined) {
  if (!message) return "This reset link is missing or expired. Request a new one and try again.";

  const decoded = (() => {
    try {
      return decodeURIComponent(message);
    } catch {
      return message;
    }
  })();

  if (/expired/i.test(decoded) || /invalid/i.test(decoded)) {
    return "This reset link is invalid or expired. Request a new password reset email.";
  }

  return decoded;
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();

  const [hydrated, setHydrated] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);

    let cancelled = false;

    async function init() {
      try {
        const queryParams = getRecoveryParamsFromQuery();

        if (queryParams?.errorCode || queryParams?.errorDescription) {
          if (!cancelled) {
            setError(formatRecoveryError(queryParams.errorDescription));
          }
        } else if (queryParams?.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryParams.code);
          if (!exchangeError) {
            cleanSensitiveUrl();
          } else if (!cancelled) {
            setError(formatRecoveryError(exchangeError.message));
          }
        } else if (queryParams?.tokenHash && queryParams?.type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: queryParams.tokenHash,
            type: queryParams.type as EmailOtpType,
          });

          if (!verifyError) {
            cleanSensitiveUrl();
          } else if (!cancelled) {
            setError(formatRecoveryError(verifyError.message));
          }
        } else {
          const tokens = getTokensFromHash();
          if (tokens) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
            });

            if (!setSessionError) {
              cleanSensitiveUrl();
            } else if (!cancelled) {
              setError(formatRecoveryError(setSessionError.message));
            }
          }
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        setSessionReady(Boolean(data.session));
      } catch (initError) {
        if (!cancelled) {
          const message = initError instanceof Error ? initError.message : undefined;
          setError(formatRecoveryError(message));
          setSessionReady(false);
        }
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSessionReady(Boolean(session));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPassword = password.trim();
    const nextConfirm = confirmPassword.trim();

    if (!nextPassword || !nextConfirm) {
      setError("Enter your new password twice.");
      return;
    }

    if (nextPassword.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (nextPassword !== nextConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("This reset link is missing or expired. Request a new one and try again.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });

    if (updateError) {
      setError(updateError.message || "Could not update password.");
      setLoading(false);
      return;
    }

    toast.success("Password updated.");
    router.replace("/dashboard");
    router.refresh();
  }

  if (!hydrated) {
    return null;
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <motion.div
        className="glass-card w-full max-w-sm space-y-4 p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-xl font-bold text-text-primary">Set a new password</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a password to use for email sign-in.</p>
        </div>

        {!sessionReady && (
          <div className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-secondary">
            <p className="font-semibold text-text-primary">Open the reset link first</p>
            <p className="mt-1 text-xs text-text-muted">
              This page works only when opened from a password reset link.
            </p>
            {error ? <p className="mt-2 text-xs text-accent-red">{error}</p> : null}
            <Link
              href="/"
              className="mt-3 inline-flex rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {sessionReady && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor="reset-password"
                className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reset-confirm"
                className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                Confirm password
              </label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
                placeholder="Re-enter password"
                required
              />
            </div>

            {error && <p className="text-sm text-accent-red">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Updating…" : "Update password"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
