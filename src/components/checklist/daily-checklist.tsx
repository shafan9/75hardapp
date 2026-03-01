"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CelebrationOverlay } from "@/components/celebration-overlay";
import { ConfettiTrigger } from "@/components/ui/confetti-trigger";
import { DEFAULT_TASKS } from "@/lib/constants";
import type { CustomTask } from "@/lib/types";
import { springs } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";

const EMOJI_OPTIONS = ["✨", "🎯", "🧘", "🏋️", "🧠", "💊", "🚿", "🌅", "📝", "🎵"];

interface DailyChecklistProps {
  completions: string[];
  customTasks: CustomTask[];
  onToggleTask: (key: string) => void;
  onAddNote: (key: string, note: string) => void;
  onAddCustomTask: (name: string, emoji: string) => void;
  onRemoveCustomTask: (id: string) => void;
  isAllDone: boolean;
  currentDay?: number;
}

export function DailyChecklist({
  completions,
  customTasks,
  onToggleTask,
  onAddNote,
  onAddCustomTask,
  onRemoveCustomTask,
  isAllDone,
  currentDay = 1,
}: DailyChecklistProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
    const storageKey = "75squad_swipe_hint_seen";
    if (typeof window === "undefined") return;

    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      setShowSwipeHint(true);
      window.localStorage.setItem(storageKey, "1");
      const timer = window.setTimeout(() => setShowSwipeHint(false), 4500);
      return () => window.clearTimeout(timer);
    }

    return;
  }, []);

  useEffect(() => {
    if (isAllDone) setShowCelebration(true);
  }, [isAllDone]);

  const completedRequiredCount = useMemo(
    () =>
      DEFAULT_TASKS.filter(
        (task) => !("optional" in task && task.optional) && completions.includes(task.key)
      ).length,
    [completions]
  );

  const handleAddTask = useCallback(() => {
    if (!newTaskName.trim()) return;
    onAddCustomTask(newTaskName.trim(), selectedEmoji);
    setNewTaskName("");
    setSelectedEmoji(EMOJI_OPTIONS[0]);
    setShowAddForm(false);
  }, [newTaskName, onAddCustomTask, selectedEmoji]);

  return (
    <div className="space-y-4">
      <ConfettiTrigger trigger={isAllDone} />
      <CelebrationOverlay
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        day={Math.max(1, currentDay)}
        tasksDone={DEFAULT_TASKS.filter((t) => !("optional" in t && t.optional)).length}
        streak={Math.max(1, currentDay)}
      />

      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-accent-cyan/25 bg-accent-cyan/10 px-3 py-2 text-xs text-accent-cyan"
          >
            Tip: Tap the right circle to complete tasks quickly.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary">Today&apos;s Tasks</h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-text-secondary">
          {completedRequiredCount}/
          {DEFAULT_TASKS.filter((t) => !("optional" in t && t.optional)).length} done
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {DEFAULT_TASKS.map((task) => (
            <motion.div key={task.key} layout transition={springs.smooth}>
              <TaskItem
                taskKey={task.key}
                emoji={task.emoji}
                label={task.label}
                description={task.description}
                isCompleted={completions.includes(task.key)}
                isOptional={"optional" in task && task.optional === true}
                onToggle={() => onToggleTask(task.key)}
                onAddNote={(note) => onAddNote(task.key, note)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-secondary">Custom Tasks</h4>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              showAddForm
                ? "bg-accent-danger/15 text-accent-danger"
                : "bg-accent-cyan/14 text-accent-cyan"
            )}
          >
            {showAddForm ? "Cancel" : "+ Add Task"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={springs.smooth}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-2xl border border-white/10 bg-bg-card p-3.5">
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      aria-label={`Choose emoji ${emoji}`}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl text-lg transition-colors",
                        selectedEmoji === emoji
                          ? "bg-accent-cyan/20 ring-2 ring-accent-cyan"
                          : "bg-bg-surface hover:bg-bg-card-hover"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    name="custom_task_name"
                    aria-label="Custom task name"
                    autoComplete="off"
                    spellCheck={false}
                    value={newTaskName}
                    onChange={(event) => setNewTaskName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddTask();
                    }}
                    placeholder="Task name..."
                    className="flex-1 rounded-xl border border-white/10 bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                    maxLength={40}
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={!newTaskName.trim()}
                    className="rounded-xl bg-gradient-to-r from-accent-cyan to-accent-info px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {customTasks.map((task) => {
            const customKey = `custom_${task.id}`;
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TaskItem
                      taskKey={customKey}
                      emoji={task.emoji}
                      label={task.name}
                      description="Custom task"
                      isCompleted={completions.includes(customKey)}
                      onToggle={() => onToggleTask(customKey)}
                      onAddNote={(note) => onAddNote(customKey, note)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveCustomTask(task.id)}
                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-danger/12 hover:text-accent-danger"
                    aria-label={`Remove ${task.name}`}
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {customTasks.length === 0 && !showAddForm && (
          <p className="py-2 text-center text-xs text-text-muted">No custom tasks yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
