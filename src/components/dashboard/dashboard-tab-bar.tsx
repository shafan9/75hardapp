"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export const DASHBOARD_TABS = [
  { href: "/dashboard", label: "Today", icon: "◉" },
  { href: "/dashboard/group", label: "Squad", icon: "◎" },
  { href: "/dashboard/feed", label: "Feed", icon: "◌" },
  { href: "/dashboard/history", label: "History", icon: "◍" },
  { href: "/dashboard/profile", label: "Profile", icon: "◐" },
] as const;

export function getActiveDashboardTab(pathname: string) {
  if (pathname.startsWith("/dashboard/group")) return "/dashboard/group";
  if (pathname.startsWith("/dashboard/feed")) return "/dashboard/feed";
  if (pathname.startsWith("/dashboard/history")) return "/dashboard/history";
  if (pathname.startsWith("/dashboard/profile")) return "/dashboard/profile";
  return "/dashboard";
}

interface DashboardTabBarProps {
  activeHref: string;
}

export function DashboardTabBar({ activeHref }: DashboardTabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(6,8,14,0.72)] px-3 pt-2 backdrop-blur-3xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      aria-label="Primary dashboard tabs"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-1">
        {DASHBOARD_TABS.map((tab) => {
          const isActive = activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "min-h-[48px] rounded-xl px-1 py-2.5 text-center transition-colors",
                isActive ? "bg-white/[0.08] ring-1 ring-white/10" : "hover:bg-white/[0.04]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={cn(
                  "text-base leading-none",
                  isActive ? "text-white" : "text-white/45"
                )}
                aria-hidden="true"
              >
                {tab.icon}
              </div>
              <div
                className={cn(
                  "mt-1 text-[11px]",
                  isActive ? "font-semibold text-white" : "text-white/45"
                )}
              >
                {tab.label}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
