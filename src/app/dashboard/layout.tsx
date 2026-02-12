"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: "✅", activeIcon: "✅" },
  { href: "/dashboard/feed", label: "Feed", icon: "📢", activeIcon: "📢" },
  { href: "/dashboard/notifications", label: "Alerts", icon: "🔔", activeIcon: "🔔" },
  { href: "/dashboard/group", label: "Squad", icon: "👥", activeIcon: "👥" },
  { href: "/dashboard/leaderboard", label: "Ranks", icon: "🏆", activeIcon: "🏆" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤", activeIcon: "👤" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh pb-24 bg-bg-primary">
      {/* Page content */}
      <main className="max-w-lg mx-auto px-4 pt-6">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-20 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 py-2 px-3 min-w-[60px]"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-accent-violet to-accent-pink"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.span
                  className="text-xl"
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {active ? item.activeIcon : item.icon}
                </motion.span>
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    active ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
