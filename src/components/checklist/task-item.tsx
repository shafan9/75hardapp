"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { EmojiBurst } from "@/components/ui/emoji-burst";

interface TaskItemProps {
  taskKey: string;
  emoji: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isOptional?: boolean;
  onToggle: () => void;
  onAddNote: (note: string) => void;
  note?: string;
}

type AccentStyle = {
  iconBg: string;
  glow: string;
  completedTint: string;
};

function getAccentForTask(taskKey: string): AccentStyle {
  if (taskKey.startsWith("custom_")) {
    return {
      iconBg: "bg-gradient-to-br from-accent-violet/70 to-accent-pink/60",
      glow: "shadow-[0_10px_30px_rgba(124,58,237,0.18)]",
      completedTint: "bg-accent-violet/10",
    };
  }

  switch (taskKey) {
    case "workout_outdoor":
      return {
        iconBg: "bg-gradient-to-br from-accent-amber/80 to-accent-pink/60",
        glow: "shadow-[0_10px_30px_rgba(245,158,11,0.16)]",
        completedTint: "bg-accent-amber/10",
      };
    case "workout_indoor":
      return {
        iconBg: "bg-gradient-to-br from-accent-pink/70 to-accent-violet/70",
        glow: "shadow-[0_10px_30px_rgba(236,72,153,0.16)]",
        completedTint: "bg-accent-pink/10",
      };
    case "water":
      return {
        iconBg: "bg-gradient-to-br from-accent-blue/70 to-accent-violet/55",
        glow: "shadow-[0_10px_30px_rgba(59,130,246,0.16)]",
        completedTint: "bg-accent-blue/10",
      };
    case "diet":
      return {
        iconBg: "bg-gradient-to-br from-accent-emerald/70 to-accent-amber/50",
        glow: "shadow-[0_10px_30px_rgba(16,185,129,0.14)]",
        completedTint: "bg-accent-emerald/10",
      };
    case "reading":
      return {
        iconBg: "bg-gradient-to-br from-accent-amber/70 to-accent-emerald/45",
        glow: "shadow-[0_10px_30px_rgba(245,158,11,0.14)]",
        completedTint: "bg-accent-amber/10",
      };
    case "progress_photo":
      return {
        iconBg: "bg-gradient-to-br from-accent-violet/70 to-accent-blue/55",
        glow: "shadow-[0_10px_30px_rgba(124,58,237,0.14)]",
        completedTint: "bg-accent-violet/10",
      };
    default:
      return {
        iconBg: "bg-gradient-to-br from-accent-violet/60 to-accent-pink/55",
        glow: "shadow-[0_10px_30px_rgba(124,58,237,0.12)]",
        completedTint: "bg-accent-violet/10",
      };
  }
}

export function TaskItem({
  taskKey,
  emoji,
  label,
  description,
  isCompleted,
  isOptional,
  onToggle,
  onAddNote,
  note,
}: TaskItemProps) {
  const accent = useMemo(() => getAccentForTask(taskKey), [taskKey]);

  const [showBurst, setShowBurst] = useState(false);
  const [noteValue, setNoteValue] = useState(note || "");
  const [showNoteInput, setShowNoteInput] = useState(!!note);

  const handleToggle = useCallback(() => {
    if (!isCompleted) {
      setShowBurst(true);
    }
    onToggle();
  }, [isCompleted, onToggle]);

  const handleNoteSubmit = useCallback(() => {
    onAddNote(noteValue.trim());
  }, [noteValue, onAddNote]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/80 px-4 py-3.5",
        "bg-white/5 backdrop-blur-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.28)]",
        "transition-colors",
        isCompleted ? accent.completedTint : "hover:bg-white/10",
        isCompleted && "border-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset]",
            accent.iconBg,
            accent.glow
          )}
          aria-hidden="true"
        >
          <span className="text-xl leading-none">{emoji}</span>

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <EmojiBurst
              emoji={emoji}
              trigger={showBurst}
              onComplete={() => setShowBurst(false)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-sm font-semibold",
                isCompleted ? "text-text-primary" : "text-text-primary"
              )}
            >
              {label}
            </span>
            {isOptional && (
              <span className="flex-shrink-0 rounded-full bg-accent-amber/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-amber">
                optional
              </span>
            )}
          </div>
          <p className="truncate text-xs text-text-muted">{description}</p>
        </div>

        {isCompleted && (
          <button
            onClick={() => setShowNoteInput((value) => !value)}
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl",
              "border border-white/10 bg-white/5 text-text-secondary",
              "transition-colors hover:bg-white/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
            )}
            aria-label={showNoteInput ? "Hide note" : "Add note"}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13.5 2.5l-9.5 9.5L2 14l2-2 9.5-9.5a1.414 1.414 0 00-2-2z" />
            </svg>
          </button>
        )}

        <button
          onClick={handleToggle}
          className={cn(
            "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl",
            "border transition-colors",
            isCompleted
              ? "border-white/10 bg-gradient-to-br from-accent-emerald/80 to-accent-blue/60 text-white"
              : "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
          )}
          aria-label={`Mark ${label} as ${isCompleted ? "incomplete" : "complete"}`}
        >
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.svg
                key="check"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M3 8.5L6.5 12L13 4"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            ) : (
              <motion.span
                key="dot"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
                className="h-2 w-2 rounded-full bg-white/25"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {isCompleted && showNoteInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                name={`note_${taskKey}`}
                aria-label={`Note for ${label}`}
                autoComplete="off"
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleNoteSubmit();
                }}
                placeholder="Quick note (optional)"
                className={cn(
                  "flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary",
                  "placeholder:text-text-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
                )}
              />
              <button
                onClick={handleNoteSubmit}
                disabled={!noteValue.trim()}
                className={cn(
                  "rounded-2xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-xs font-semibold text-white",
                  "disabled:opacity-50"
                )}
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
