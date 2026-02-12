import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { MOTIVATIONAL_QUOTES } from "@/lib/constants";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "yesterday";
  return format(date, "MMM d");
}

export function getDayLabel(day: number, total: number = 75): string {
  if (day === 0) return "Not started";
  if (day >= total) return "COMPLETED! 🏆";
  return `Day ${day} of ${total}`;
}

export function getProgressPercent(day: number, total: number = 75): number {
  return Math.min(Math.round((day / total) * 100), 100);
}

export function getStreakMessage(day: number): string {
  if (day >= 75) return "YOU DID IT! 75 HARD COMPLETE!";
  if (day >= 50) return "Home stretch! 💪";
  if (day >= 30) return "Unstoppable! 🔥";
  if (day >= 14) return "Two weeks strong! ⚡";
  if (day >= 7) return "One week down! ⭐";
  if (day >= 3) return "Building momentum! 🚀";
  if (day >= 1) return "Let's go! 💥";
  return "Start your journey!";
}

export function getDailyMotivationalQuote(date: Date = new Date()) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = Math.floor(dayStart.getTime() / 86400000);
  const index = ((dayNumber % MOTIVATIONAL_QUOTES.length) + MOTIVATIONAL_QUOTES.length) %
    MOTIVATIONAL_QUOTES.length;

  return MOTIVATIONAL_QUOTES[index];
}
