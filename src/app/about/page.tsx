import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About 75 Squad | 75 Hard Accountability App",
  description:
    "Learn how 75 Squad helps teams complete 75-day challenges through daily tracking, reminders, and shared accountability together.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-black gradient-text">About 75 Squad</h1>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        75 Squad is a team-first accountability app built for the 75-day challenge format. The product
        was designed around one practical question: how do you keep consistency high when motivation dips,
        schedules get messy, and life gets busy? Instead of relying on memory or private notes, 75 Squad
        turns daily execution into a shared system with clear visibility.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        Each member tracks required daily tasks, checks progress in real time, and sees where momentum is
        building or slipping. Squad feeds make effort visible. Streaks and badges give context without adding
        noise. Invite links make onboarding fast for groups, friends, and teams that want to run a structured
        challenge together.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        Notification channels are configurable per user so reminders arrive where they are most useful: in-app,
        push, email, or SMS. This approach makes follow-through easier without creating alert fatigue. The goal
        is straightforward: improve consistency by making the next right action obvious and easy.
      </p>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        75 Squad works best when used as a shared daily rhythm. Teams that check in often, complete tasks
        before day-end, and use reminders intentionally tend to finish stronger and with less friction.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
        <Link
          href="/"
          className="inline-flex rounded-xl border border-border px-4 py-2 font-semibold transition-colors hover:bg-bg-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
        >
          Back to home
        </Link>
        <Link href="/contact" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
          Contact
        </Link>
        <Link href="/privacy" className="hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70">
          Privacy
        </Link>
      </div>
    </div>
  );
}
