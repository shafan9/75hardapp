"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardTabBar, getActiveDashboardTab } from "@/components/dashboard/dashboard-tab-bar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/dashboard") {
    return <>{children}</>;
  }

  return (
    <div
      className="relative min-h-dvh overflow-hidden pb-28 pt-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(80rem_42rem_at_15%_-10%,rgba(66,153,225,0.12),transparent_65%),radial-gradient(56rem_34rem_at_86%_0%,rgba(236,72,153,0.14),transparent_62%),radial-gradient(48rem_28rem_at_50%_100%,rgba(251,191,36,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-3 sm:px-4">{children}</div>

      <DashboardTabBar activeHref={getActiveDashboardTab(pathname)} />
    </div>
  );
}
