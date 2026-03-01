"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EmojiBurst } from "@/components/ui/emoji-burst";
import { springs } from "@/lib/animations";
import { cn } from "@/lib/utils";

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
      iconBg: "bg-gradient-to-br from-accent-info/80 to-accent-cyan/65",
      glow: "shadow-[0_12px_32px_rgba(124,77,255,0.24)]",
      completedTint: "bg-accent-info/12",
    };
  }

  switch (taskKey) {
    case "workout_outdoor":
      return {
        iconBg: "bg-gradient-to-br from-accent-orange/90 to-accent-gold/70",
        glow: "shadow-[0_12px_32px_rgba(255,107,53,0.22)]",
        completedTint: "bg-accent-orange/12",
      };
    case "workout_indoor":
      return {
        iconBg: "bg-gradient-to-br from-accent-cyan/80 to-accent-info/65",
        glow: "shadow-[0_12px_32px_rgba(0,212,255,0.2)]",
        completedTint: "bg-accent-cyan/12",
      };
    case "diet":
      return {
        iconBg: "bg-gradient-to-br from-accent-success/85 to-accent-gold/60",
        glow: "shadow-[0_12px_32px_rgba(0,230,118,0.2)]",
        completedTint: "bg-accent-success/12",
      };
    case "water":
      return {
        iconBg: "bg-gradient-to-br from-accent-cyan/90 to-accent-blue/70",
        glow: "shadow-[0_12px_32px_rgba(0,212,255,0.22)]",
        completedTint: "bg-accent-cyan/12",
      };
    case "reading":
      return {
        iconBg: "bg-gradient-to-br from-accent-gold/90 to-accent-orange/70",
        glow: "shadow-[0_12px_32px_rgba(255,184,0,0.22)]",
        completedTint: "bg-accent-gold/12",
      };
    case "progress_photo":
      return {
        iconBg: "bg-gradient-to-br from-accent-info/80 to-accent-orange/65",
        glow: "shadow-[0_12px_32px_rgba(124,77,255,0.22)]",
        completedTint: "bg-accent-info/12",
      };
    default:
      return {
        iconBg: "bg-gradient-to-br from-accent-cyan/75 to-accent-info/65",
        glow: "shadow-[0_12px_32px_rgba(0,212,255,0.22)]",
        completedTint: "bg-accent-cyan/12",
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
  const [flash, setFlash] = useState(false);
  const [noteValue, setNoteValue] = useState(note || "");
  const [showNoteInput, setShowNoteInput] = useState(!!note);

  useEffect(() => {
    setNoteValue(note || "");
    if (note) setShowNoteInput(true);
  }, [note]);

  const handleToggle = useCallback(() => {
    const isCompleting = !isCompleted;
    if (isCompleting) {
      setShowBurst(true);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 280);

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(20);
      }
    }

    onToggle();
  }, [isCompleted, onToggle]);

  const handleNoteSubmit = useCallback(() => {
    onAddNote(noteValue.trim());
  }, [noteValue, onAddNote]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={springs.smooth}
      className={cn(
        "relative overflow-hidden rounded-3xl border px-4 py-4",
        "min-h-[72px] bg-white/[0.04] backdrop-blur-[16px]",
        "transition-colors",
        isCompleted ? accent.completedTint : "hover:bg-white/[0.07]",
        flash && "bg-accent-cyan/10 ring-2 ring-accent-cyan/30",
        "border-border-light"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
            accent.iconBg,
            accent.glow
          )}
          aria-hidden="true"
        >
          <span className="text-2xl leading-none">{emoji}</span>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-[15px] font-semibold",
                isCompleted && "text-text-secondary line-through decoration-white/30"
              )}
            >
              {label}
            </span>
            {isOptional && (
              <span className="flex-shrink-0 rounded-full border border-accent-gold/30 bg-accent-gold/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-gold">
                optional
              </span>
            )}
          </div>
          <p className={cn("text-xs", isCompleted ? "text-text-muted" : "text-text-secondary")}>
            {description}
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          {isCompleted && (
            <button
              type="button"
              onClick={() => setShowNoteInput((value) => !value)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-2xl border",
                "border-white/12 bg-white/[0.05] text-text-secondary transition-colors",
                "hover:bg-white/[0.1]"
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
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.5 2.5l-9.5 9.5L2 14l2-2 9.5-9.5a1.414 1.414 0 00-2-2z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "relative grid h-11 w-11 place-items-center rounded-full border transition-colors",
              isCompleted
                ? "border-accent-cyan/40 bg-accent-cyan text-white"
                : "border-white/16 bg-white/[0.03] text-text-secondary hover:bg-white/[0.1]"
            )}
            aria-label={`Mark ${label} as ${isCompleted ? "incomplete" : "complete"}`}
          >
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <EmojiBurst emoji={emoji} trigger={showBurst} onComplete={() => setShowBurst(false)} />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {isCompleted ? (
                <motion.svg
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={springs.bouncy}
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8.4L6.5 11.8L13 4.4"
                    stroke="white"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              ) : (
                <motion.span
                  key="dot"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="h-3 w-3 rounded-full border border-white/30"
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCompleted && showNoteInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.smooth}
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
                  "flex-1 rounded-2xl border border-white/10 bg-bg-card px-3 py-2 text-xs text-text-primary",
                  "placeholder:text-text-muted"
                )}
              />
              <button
                type="button"
                onClick={handleNoteSubmit}
                disabled={!noteValue.trim()}
                className={cn(
                  "rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2 text-xs font-semibold text-white",
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
