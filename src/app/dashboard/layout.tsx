import type { ReactNode } from "react";
import { DashboardTabBar } from "@/components/dashboard/dashboard-tab-bar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={
        "min-h-dvh bg-bg-primary " +
        "px-3 sm:px-6 " +
        "pt-[calc(0.9rem+env(safe-area-inset-top))] sm:pt-[calc(1.2rem+env(safe-area-inset-top))] " +
        "pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(6rem+env(safe-area-inset-bottom))]"
      }
    >
      {children}
      <DashboardTabBar />
    </div>
  );
}
