import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact 75 Squad",
  description:
    "Get support for 75 Squad setup, notifications, sign-in, and squad management. Response time is typically one business day.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-black gradient-text">Contact</h1>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        Need help with onboarding, squad setup, notifications, or account access? Reach out and include the
        app URL, your device/browser, and a short reproduction path. A concise report speeds up support and
        helps us resolve issues quickly.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        For reminder delivery issues, include your selected notification channels, timezone, and reminder time.
        For join or feed issues, include the invite link used, the page where the error appears, and any error
        text shown in-app.
      </p>
      <div className="rounded-2xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
        <p>
          Support email: <a className="text-text-primary underline" href="mailto:support@75squad.app">support@75squad.app</a>
        </p>
        <p className="mt-2">Typical response window: 1 business day.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
        <Link
          href="/"
          className="inline-flex rounded-xl border border-border px-4 py-2 font-semibold transition-colors hover:bg-bg-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
        >
          Back to home
        </Link>
        <Link href="/about" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
          About
        </Link>
        <Link href="/privacy" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
          Privacy
        </Link>
      </div>
    </div>
  );
}
