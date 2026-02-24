import Link from "next/link";

type TaskPreview = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  done: boolean;
  optional?: boolean;
  color: string;
};

type MemberPreview = {
  name: string;
  done: number;
  total: number;
  trend: string;
  accent: string;
};

type FeedPreview = {
  id: number;
  user: string;
  action: string;
  note: string;
  when: string;
  reactions: number;
  comments: number;
};

const tasks: TaskPreview[] = [
  {
    id: "outdoor",
    icon: "🏃",
    title: "Outdoor Workout",
    subtitle: "45 minutes outdoors",
    done: true,
    color: "from-[#2de0ff] to-[#2576ff]",
  },
  {
    id: "second",
    icon: "💪",
    title: "Second Workout",
    subtitle: "45 minute session",
    done: false,
    color: "from-[#ff4fd8] to-[#7b4dff]",
  },
  {
    id: "diet",
    icon: "🥗",
    title: "Follow Diet",
    subtitle: "No cheat meals",
    done: false,
    color: "from-[#3ee089] to-[#8fd233]",
  },
  {
    id: "water",
    icon: "💧",
    title: "Gallon of Water",
    subtitle: "128 oz target",
    done: true,
    color: "from-[#30d5ff] to-[#21b6ff]",
  },
  {
    id: "reading",
    icon: "📚",
    title: "Read 10 Pages",
    subtitle: "Nonfiction only",
    done: false,
    color: "from-[#ffca52] to-[#ff7d4f]",
  },
  {
    id: "photo",
    icon: "📸",
    title: "Progress Photo",
    subtitle: "Optional capability",
    done: false,
    optional: true,
    color: "from-[#7b8dff] to-[#4eb4ff]",
  },
];

const squad: MemberPreview[] = [
  { name: "Shafan", done: 2, total: 5, trend: "On pace", accent: "#f472b6" },
  { name: "Shaheda", done: 1, total: 5, trend: "Checked in", accent: "#a78bfa" },
  { name: "Ushna", done: 0, total: 5, trend: "Starting later", accent: "#60a5fa" },
  { name: "Hassan", done: 0, total: 5, trend: "No check-ins yet", accent: "#f97316" },
  { name: "Themasap", done: 0, total: 5, trend: "No check-ins yet", accent: "#34d399" },
  { name: "Boomer", done: 0, total: 5, trend: "No check-ins yet", accent: "#e879f9" },
];

const feed: FeedPreview[] = [
  {
    id: 1,
    user: "Shaheda",
    action: "finished Outdoor Workout",
    note: "Sunrise walk complete. Starting strong.",
    when: "18m ago",
    reactions: 5,
    comments: 2,
  },
  {
    id: 2,
    user: "Shafan",
    action: "checked off Gallon of Water",
    note: "Hydration already done for the day.",
    when: "43m ago",
    reactions: 3,
    comments: 1,
  },
  {
    id: 3,
    user: "Ushna",
    action: "left a reading plan note",
    note: "Reading after work tonight. 10 pages minimum.",
    when: "1h ago",
    reactions: 2,
    comments: 0,
  },
];

function PunchTitle({
  children,
  className = "",
  as = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  const Tag = as;

  return (
    <Tag
      className={`text-balance leading-[1.02] tracking-tight text-black [text-wrap:balance] ${className}`}
      style={{ fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' }}
    >
      {children}
    </Tag>
  );
}

function EditorialCard({
  title,
  body,
  tone = "light",
  badge,
}: {
  title: string;
  body: string;
  tone?: "light" | "dark" | "blue";
  badge?: string;
}) {
  const toneClass =
    tone === "dark"
      ? "border-white/10 bg-[#0b1020] text-white"
      : tone === "blue"
        ? "border-[#1c2f62] bg-[linear-gradient(180deg,#12234d,#0a1226)] text-white"
        : "border-black/10 bg-white text-black";

  return (
    <div className={`relative overflow-hidden rounded-[26px] border px-5 pb-5 pt-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${toneClass}`}>
      {tone !== "light" ? (
        <>
          <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-cyan-300/10 blur-2xl" />
        </>
      ) : null}
      {badge ? (
        <div className="mb-3 inline-flex rounded-full border border-current/10 bg-current/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
          {badge}
        </div>
      ) : null}
      <PunchTitle as="h2" className={`text-4xl sm:text-5xl ${tone === "light" ? "text-black" : "text-white"}`}>{title}</PunchTitle>
      <p className={`mt-3 text-sm leading-relaxed ${tone === "light" ? "text-black/70" : "text-white/70"}`}>{body}</p>
    </div>
  );
}

function TaskRow({ task }: { task: TaskPreview }) {
  return (
    <div
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition ${
        task.done
          ? "border-emerald-300/25 bg-[rgba(36,255,186,0.06)]"
          : "border-white/10 bg-[rgba(255,255,255,0.035)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)] opacity-80" />
      <div className={`relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${task.color} shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}>
        <span className="text-lg" aria-hidden="true">{task.icon}</span>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-white">{task.title}</p>
          {task.optional ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
              Optional
            </span>
          ) : null}
        </div>
        <p className="text-xs text-white/55">{task.subtitle}</p>
      </div>

      <button
        type="button"
        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
          task.done
            ? "border-emerald-300/30 bg-[linear-gradient(180deg,rgba(46,255,196,0.18),rgba(46,255,196,0.08))] hover:border-emerald-200/40"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
        }`}
        aria-label={task.done ? `${task.title} completed` : `Mark ${task.title} complete`}
      >
        {task.done ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5L6.4 11.8L13 4.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        )}
      </button>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100);
  return (
    <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="url(#mockRing)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={150.8}
          strokeDashoffset={150.8 - (150.8 * pct) / 100}
        />
        <defs>
          <linearGradient id="mockRing" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#2de0ff" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative text-center tabular-nums">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-white/55">DONE</p>
        <p className="text-lg font-black text-white">{done}/{total}</p>
      </div>
    </div>
  );
}

function TodayPhone() {
  const requiredDone = tasks.filter((t) => t.done && !t.optional).length;
  const requiredTotal = tasks.filter((t) => !t.optional).length;

  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div className="pointer-events-none absolute -left-8 top-6 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-24 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-8 bottom-24 h-36 rounded-full bg-amber-300/15 blur-3xl" />

      <div className="relative rounded-[36px] border border-white/15 bg-[rgba(8,10,19,0.9)] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,115,255,0.5),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.18),transparent_42%),#060a14]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%,transparent_70%,rgba(255,255,255,0.03))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08)_0_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.08]" />
          </div>

          <div className="relative px-4 pb-24 pt-3">
            <div className="mb-3 flex justify-center">
              <div className="h-7 w-28 rounded-full bg-black/65 ring-1 ring-white/10" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-white/45">TODAY</p>
                <h2 className="mt-1 text-balance text-[34px] font-black leading-none tracking-tight text-white">Crush Day 2</h2>
                <p className="mt-1 text-xs text-white/70">Welcome back, Shafan. Keep the streak alive.</p>
              </div>
              <ProgressRing done={requiredDone} total={requiredTotal} />
            </div>

            <section className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120px_circle_at_10%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-white/50">QUOTE OF THE DAY</p>
                  <p className="mt-1 text-sm leading-snug text-white/95">
                    “Small steps every day lead to massive results over time.”
                  </p>
                  <p className="mt-1 text-[10px] text-white/50">Same quote for the whole squad today</p>
                </div>
                <button type="button" className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white">
                  Daily quote
                </button>
              </div>
            </section>

            <section className="mt-4 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Checklist</h3>
                  <p className="text-[10px] text-white/50">Tap to complete • backfill past days available</p>
                </div>
                <button type="button" className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white">
                  Day Picker
                </button>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Squad Snapshot</h3>
                  <p className="text-[10px] text-white/50">Tap a member to view their day</p>
                </div>
                <button type="button" className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white">
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {squad.slice(0, 4).map((member) => {
                  const pct = Math.round((member.done / member.total) * 100);
                  return (
                    <button type="button" key={member.name} className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]">
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold text-white ring-1 ring-white/10"
                          style={{ backgroundColor: `${member.accent}cc` }}
                        >
                          {member.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{member.name}</p>
                          <p className="text-[10px] tabular-nums text-white/50">{member.done}/{member.total}</p>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: member.accent }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[rgba(6,8,14,0.65)] px-3 pt-2 backdrop-blur-3xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
            <div className="grid grid-cols-5 gap-1">
              {[
                ["Today", "◉", true],
                ["Squad", "◎", false],
                ["Feed", "◌", false],
                ["History", "◍", false],
                ["Profile", "◐", false],
              ].map(([label, icon, active]) => (
                <div key={String(label)} className={`rounded-xl px-1 py-1 text-center ${active ? "bg-white/[0.07] ring-1 ring-white/10" : ""}`} aria-hidden="true">
                  <div className={`text-base leading-none ${active ? "text-white" : "text-white/45"}`}>{icon}</div>
                  <div className={`mt-1 text-[10px] ${active ? "font-semibold text-white" : "text-white/45"}`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] rotate-[-4deg]">
      <div className="pointer-events-none absolute -left-4 -top-4 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
      <div className="relative rounded-[28px] border border-white/12 bg-[rgba(5,8,16,0.9)] p-2 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,#070c17,#05070e)] px-3 pb-3 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-white/50">FEED</p>
              <h3 className="text-sm font-bold text-white">Squad activity</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/70">
              reactions + comments
            </span>
          </div>
          <div className="space-y-2">
            {feed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] text-white/45">
                  <span>{item.when}</span>
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5">activity</span>
                </div>
                <p className="text-xs leading-snug text-white/80">
                  <span className="font-semibold text-white">{item.user}</span> {item.action}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">{item.note}</p>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white">❤️ {item.reactions}</button>
                  <button type="button" className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white">💬 {item.comments}</button>
                  <button type="button" className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white">Open</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopBlueprint() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EditorialCard
          tone="light"
          badge="V2 Direction"
          title="Crush the day, not the UI"
          body="One scrollable Today screen with clear hierarchy: day status, quote, checklist, squad pulse, and feed previews. Everything important is visible without hunting through settings."
        />
        <EditorialCard
          tone="blue"
          badge="What changes"
          title="App-like web, not dashboard"
          body="Bigger tap targets, stronger spacing, stronger typography, and a true mobile shell with five tabs. It should feel closer to a polished fitness app and less like an internal admin panel."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 backdrop-blur-2xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">TODAY SCREEN BLUEPRINT</p>
              <h2 className="mt-1 text-balance text-2xl font-black tracking-tight text-white">Single-screen flow for phone + laptop</h2>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              mobile-first web app
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Hero", "Day number, progress ring, motivation quote"],
              ["02", "Checklist", "Fast tap rows, optional photo capability, backfill entry"],
              ["03", "Squad", "Member progress cards; tap into each person"],
              ["04", "Feed", "Strava-like activity with reactions + comments"],
              ["05", "History", "Past day edits + audit-style transparency"],
              ["06", "Profile", "Persistent login, password, preferences"],
            ].map(([num, title, body]) => (
              <div key={String(num)} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[11px] font-black text-white">{num}</div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                </div>
                <p className="text-xs leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/10 bg-[#f4f1ea] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <PunchTitle as="h3" className="max-w-[10ch] text-[40px] sm:text-[42px]">Team up with your squad</PunchTitle>
              <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-black/70">
                Invite-only
              </div>
            </div>
            <div className="space-y-2">
              {squad.slice(0, 4).map((member) => (
                <div key={member.name} className="rounded-2xl border border-black/10 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: member.accent }}>
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-black">{member.name}</p>
                        <p className="text-[10px] text-black/50">{member.trend}</p>
                      </div>
                    </div>
                    <span className="text-xs tabular-nums font-semibold text-black/70">{member.done}/{member.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((member.done / member.total) * 100)}%`, backgroundColor: member.accent }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,26,0.9),rgba(7,9,16,0.95))] p-5 backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">PHASE 1 (BUILT)</p>
                <h3 className="mt-1 text-lg font-bold text-white">Reliability groundwork already done in this branch</h3>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
                functional
              </span>
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Forgot password + reset page flow</li>
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Profile set/change password flow</li>
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Membership self-healing fallback</li>
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Backfill editing support in checklist API</li>
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">New history page for past-day edits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockV2Page() {
  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-[#05070d] px-4 py-4 sm:px-6 sm:py-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(80rem_42rem_at_15%_-10%,rgba(66,153,225,0.14),transparent_65%),radial-gradient(56rem_34rem_at_86%_0%,rgba(236,72,153,0.18),transparent_62%),radial-gradient(48rem_28rem_at_50%_100%,rgba(251,191,36,0.12),transparent_70%),#05070d]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="mb-5 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 backdrop-blur-2xl sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-white/45">75 SQUAD • V2 MOCK PREVIEW</p>
              <h1 className="mt-1 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Obvious Visual Reset <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent">(mock only)</span>
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
                This preview is intentionally styled very differently from the current app so we can approve the new direction before rebuilding the real Today, Squad, Feed, History, and Profile screens.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/history" className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.07]">
                Test History (real)
              </Link>
              <Link href="/dashboard" className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.07]">
                Back to App
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]" role="region" aria-label="V2 mock layout preview">
          <section className="order-2 xl:order-1">
            <DesktopBlueprint />
          </section>

          <section className="order-1 xl:order-2">
            <div className="xl:sticky xl:top-6 space-y-5">
              <TodayPhone />
              <div className="px-1 sm:px-6 xl:px-0">
                <FeedPhone />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
