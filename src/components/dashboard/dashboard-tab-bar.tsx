"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/animations";

type DashboardTab = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

const tabs: DashboardTab[] = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5.5 10v10h13V10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/group",
    label: "Squad",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="9" r="3.25" />
        <path d="M3 19c0-2.9 2.7-5 6-5s6 2.1 6 5" />
        <circle cx="17.5" cy="8.5" r="2.5" />
        <path d="M14.5 18c.5-1.8 2.1-3.1 4.4-3.1 1.2 0 2.2.2 3.1.8" />
      </svg>
    ),
  },
  {
    href: "/dashboard/feed",
    label: "Feed",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 6.5h14a2 2 0 012 2v8a2 2 0 01-2 2h-8l-4.5 3v-3H5a2 2 0 01-2-2v-8a2 2 0 012-2z" />
        <path d="M8 11h8" />
        <path d="M8 14h5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-3.7 3.4-6 7-6s6.3 2.3 7 6" />
        <circle cx="12" cy="12" r="9" fill="none" />
      </svg>
    ),
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(7,7,12,0.85)] px-2 pt-2 backdrop-blur-3xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      aria-label="Primary dashboard tabs"
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-1.5">
        {tabs.map((tab) => {
          const active = isActivePath(pathname, tab.href);

          return (
            <motion.div
              key={tab.href}
              whileTap={{ scale: 0.92 }}
              transition={springs.snappy}
            >
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 transition-colors",
                  active
                    ? "bg-accent-cyan/12 text-accent-cyan"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-text-secondary"
                )}
              >
                <motion.span
                  animate={active ? { scale: 1.05 } : { scale: 1 }}
                  transition={springs.smooth}
                  aria-hidden="true"
                >
                  {tab.icon(active)}
                </motion.span>
                <span
                  className={cn(
                    "mt-1 text-[11px] font-semibold",
                    active ? "text-accent-cyan" : "text-text-muted"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
}
