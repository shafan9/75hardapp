"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BadgeProps {
  achievement: {
    key: string;
    label: string;
    emoji: string;
    description: string;
    category: string;
  };
  earned: boolean;
  earnedAt?: string;
}

export function Badge({ achievement, earned, earnedAt }: BadgeProps) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {/* Badge circle */}
      <motion.button
        onClick={() => setShowPopover(!showPopover)}
        onBlur={() => setShowPopover(false)}
        whileTap={{ scale: 0.9 }}
        animate={
          earned
            ? {
                scale: [1, 1.05, 1],
              }
            : {}
        }
        transition={
          earned
            ? {
                repeat: Infinity,
                repeatDelay: 4,
                duration: 0.6,
                ease: "easeInOut",
              }
            : undefined
        }
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all focus:outline-none",
          earned ? "h-16 w-16" : "h-14 w-14"
        )}
        style={
          earned
            ? {
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2), rgba(245,158,11,0.2))",
                boxShadow:
                  "0 0 20px rgba(124,58,237,0.2), 0 0 40px rgba(236,72,153,0.1)",
              }
            : {
                background: "rgba(42, 49, 80, 0.5)",
              }
        }
      >
        {/* Border ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2",
            earned
              ? "border-accent-violet/50"
              : "border-border"
          )}
        />

        {/* Emoji */}
        <span
          className={cn(
            "text-2xl",
            earned ? "" : "grayscale opacity-40"
          )}
        >
          {achievement.emoji}
        </span>

        {/* Lock overlay for unearned */}
        {!earned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-bg-primary/40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
            >
              <rect x="3" y="6" width="8" height="7" rx="1.5" />
              <path d="M5 6V4a2 2 0 114 0v2" />
            </svg>
          </div>
        )}
      </motion.button>

      {/* Label below badge */}
      <p
        className={cn(
          "mt-1.5 text-[10px] font-medium text-center leading-tight max-w-[72px]",
          earned ? "text-text-secondary" : "text-text-muted"
        )}
      >
        {achievement.label}
      </p>

      {/* Popover */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-full mb-2 z-10 w-48 rounded-xl border border-border bg-bg-card p-3 shadow-xl"
          >
            <div className="text-center space-y-1">
              <span className="text-2xl">{achievement.emoji}</span>
              <p className="text-sm font-semibold text-text-primary">
                {achievement.label}
              </p>
              <p className="text-xs text-text-muted">
                {achievement.description}
              </p>
              {earned && earnedAt ? (
                <p className="text-[10px] text-accent-emerald font-medium">
                  Earned {format(new Date(earnedAt), "MMM d, yyyy")}
                </p>
              ) : (
                <p className="text-[10px] text-text-muted font-medium">
                  🔒 Locked
                </p>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-[1px]">
              <div className="h-2 w-2 rotate-45 border-b border-r border-border bg-bg-card" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
