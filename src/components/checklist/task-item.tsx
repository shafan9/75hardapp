"use client";

import { useState, useCallback } from "react";
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
    if (noteValue.trim()) {
      onAddNote(noteValue.trim());
    }
  }, [noteValue, onAddNote]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative rounded-2xl border p-4 transition-colors",
        isCompleted
          ? "border-accent-emerald/30 bg-accent-emerald/5"
          : "border-border bg-bg-card hover:bg-bg-card-hover"
      )}
      style={
        isCompleted
          ? {
              boxShadow:
                "0 0 20px rgba(16, 185, 129, 0.15), 0 0 60px rgba(16, 185, 129, 0.05)",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        {/* Custom animated checkbox */}
        <button
          onClick={handleToggle}
          className="relative flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          aria-label={`Mark ${label} as ${isCompleted ? "incomplete" : "complete"}`}
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            animate={
              isCompleted ? { scale: [1, 1.3, 1] } : { scale: 1 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
              isCompleted
                ? "border-accent-emerald bg-gradient-to-br from-accent-emerald to-accent-blue"
                : "border-border-light bg-transparent hover:border-text-muted"
            )}
          >
            <AnimatePresence mode="wait">
              {isCompleted && (
                <motion.svg
                  key="check"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <motion.path
                    d="M3 8.5L6.5 12L13 4"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Emoji burst on completion */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <EmojiBurst
              emoji={emoji}
              trigger={showBurst}
              onComplete={() => setShowBurst(false)}
            />
          </div>
        </button>

        {/* Task info */}
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="text-xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-semibold text-sm truncate",
                  isCompleted
                    ? "text-accent-emerald"
                    : "text-text-primary"
                )}
              >
                {label}
              </span>
              {isOptional && (
                <span className="flex-shrink-0 rounded-full bg-accent-amber/10 px-2 py-0.5 text-[10px] font-medium text-accent-amber">
                  optional
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">{description}</p>
          </div>
        </div>

        {/* Note toggle for completed tasks */}
        {isCompleted && (
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex-shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-bg-surface hover:text-text-secondary transition-colors"
            aria-label="Add note"
          >
            <svg
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
      </div>

      {/* Note input */}
      <AnimatePresence>
        {isCompleted && showNoteInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                name={"note_" + taskKey}
                aria-label={"Note for " + label}
                autoComplete="off"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNoteSubmit()}
                placeholder="Add a note…"
                className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              />
              <button
                onClick={handleNoteSubmit}
                className="rounded-lg bg-accent-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-violet/80 transition-colors"
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
