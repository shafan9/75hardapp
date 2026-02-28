import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="glass-card w-full max-w-md space-y-4 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          📶
        </p>
        <h1 className="text-2xl font-black text-text-primary">You are offline</h1>
        <p className="text-sm leading-relaxed text-text-secondary">
          We could not reach 75 Squad right now. Reconnect and reopen to sync progress.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link
            href="/"
            className="rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60"
          >
            Retry
          </Link>
        </div>
      </div>
    </div>
  );
}
