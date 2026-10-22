import Link from "next/link";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { DEFAULT_TASKS } from "@/lib/constants";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-6 sm:px-10 sm:pt-10">
      <header className="flex items-center justify-between gap-4 border-b border-border-light pb-6">
        <Link href="/" aria-label="75 Squad home" className="flex min-h-11 items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-xl font-bold tracking-tight text-bg-deepest">75</span>
          <span className="text-sm font-semibold tracking-[0.18em]">SQUAD</span>
        </Link>
        <Link href="#sign-in" className="inline-flex min-h-11 items-center text-sm text-text-secondary hover:text-text-primary">Sign in <span aria-hidden="true" className="ml-2">↓</span></Link>
      </header>
      <div className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <section aria-labelledby="welcome-title">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand">75 days. One daily routine.</p>
          <h1 id="welcome-title" className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-7xl">Show up.<br /><span className="text-brand">Together.</span></h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-secondary sm:text-lg">Your daily checklist, your progress, your people. A focused place to keep going, one day at a time.</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
            <span><span className="mr-2 text-brand" aria-hidden="true">✓</span>Track your day</span>
            <span><span className="mr-2 text-brand" aria-hidden="true">✓</span>Stay accountable</span>
          </div>
        </section>
        <section id="sign-in" aria-label="Sign in to your squad" className="w-full lg:max-w-sm lg:justify-self-end">
          <EmailAuthForm nextPath="/dashboard" title="Pick up where you left off" description="Sign in to open your daily checklist." allowSignup={false} />
          <p className="mt-5 px-1 text-sm leading-relaxed text-text-muted">New here? Ask your squad leader for an invite link to create your account.</p>
        </section>
      </div>
      <section aria-labelledby="routine-title" className="border-t border-border-light py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="routine-title" className="text-lg font-semibold tracking-tight">A clear plan for every day.</h2>
          <p className="text-sm text-text-muted">Your checklist at a glance</p>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_TASKS.map((task) => (
            <li key={task.key} className="flex gap-3 border-b border-border py-4">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-surface text-lg">{task.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{task.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{task.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border-light pt-5 text-sm text-text-muted">
        <p>One task. One day. Keep going.</p>
        <nav aria-label="Information" className="flex gap-5">
          <Link href="/about" className="inline-flex min-h-11 items-center hover:text-text-primary">About</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center hover:text-text-primary">Contact</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-text-primary">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
