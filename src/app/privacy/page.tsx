import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "75 Squad Privacy Policy",
  description:
    "Read the 75 Squad privacy policy, including what data is stored, how reminders work, and how to request account deletion.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-black gradient-text">Privacy Policy</h1>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        75 Squad stores only the information required to operate challenge features: account profile details,
        squad memberships, task completions, streak progress, and notification preferences. This data supports
        checklist tracking, feed visibility, leaderboard ranking, and reminder delivery.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        Notification channels are opt-in and controlled by each user. If enabled, in-app, push, email, or SMS
        reminders may be delivered based on your configured reminder time and timezone. You can update channel
        settings from the Profile page at any time.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        We do not ask for unnecessary sensitive data to use core app functionality. Challenge data is used for
        accountability features only, including progress tracking, feed updates, and reminder logic. We do not
        sell challenge activity data.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        If you want account data removed, email support@75squad.app from the account email and include a deletion
        request. If you identify a privacy concern, include reproduction details so we can investigate and respond.
      </p>
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
        <Link href="/contact" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
          Contact
        </Link>
      </div>
    </div>
  );
}
