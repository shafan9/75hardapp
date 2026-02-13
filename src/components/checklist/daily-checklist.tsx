"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_TASKS } from "@/lib/constants";
import { CustomTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";
import { ConfettiTrigger } from "@/components/ui/confetti-trigger";

const EMOJI_OPTIONS = ["✨", "🎯", "🧘", "🏋️", "🧠", "💊", "🚿", "🌅", "📝", "🎵"];

interface DailyChecklistProps {
  completions: string[];
  customTasks: CustomTask[];
  onToggleTask: (key: string) => void;
  onAddNote: (key: string, note: string) => void;
  onAddCustomTask: (name: string, emoji: string) => void;
  onRemoveCustomTask: (id: string) => void;
  isAllDone: boolean;
}

export function DailyChecklist({
  completions,
  customTasks,
  onToggleTask,
  onAddNote,
  onAddCustomTask,
  onRemoveCustomTask,
  isAllDone,
}: DailyChecklistProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);

  const handleAddTask = useCallback(() => {
    if (newTaskName.trim()) {
      onAddCustomTask(newTaskName.trim(), selectedEmoji);
      setNewTaskName("");
      setSelectedEmoji(EMOJI_OPTIONS[0]);
      setShowAddForm(false);
    }
  }, [newTaskName, selectedEmoji, onAddCustomTask]);

  return (
    <div className="space-y-4">
      {/* Confetti when all done */}
      <ConfettiTrigger trigger={isAllDone} />

      {/* All done celebration banner */}
      <AnimatePresence>
        {isAllDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: "auto" }}
            exit={{ opacity: 0, scale: 0.9, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-accent-emerald/30 bg-gradient-to-r from-accent-violet/20 via-accent-pink/20 to-accent-amber/20 p-4 text-center">
              <p className="text-2xl font-bold gradient-text">ALL TASKS DONE!</p>
              <p className="mt-1 text-sm text-text-secondary">
                You crushed it today! Keep the momentum going.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default tasks */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {DEFAULT_TASKS.map((task, index) => (
            <motion.div
              key={task.key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
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

      {/* Custom tasks section */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary">Custom Tasks</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              showAddForm
                ? "bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
                : "bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20"
            )}
          >
            {showAddForm ? "Cancel" : "+ Add Task"}
          </button>
        </div>

        {/* Add custom task form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-2xl border border-border bg-bg-card p-4">
                {/* Emoji picker */}
                <div>
                  <p className="mb-2 text-xs text-text-muted">Pick an emoji:</p>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setSelectedEmoji(e)}
                        aria-label={"Choose emoji " + e}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-colors",
                          selectedEmoji === e
                            ? "bg-accent-violet/20 ring-2 ring-accent-violet scale-110"
                            : "bg-bg-surface hover:bg-bg-card-hover"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task name input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="custom_task_name"
                    aria-label="Custom task name"
                    autoComplete="off"
                    spellCheck={false}
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    placeholder="Task name..."
                    className="flex-1 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                    maxLength={40}
                  />
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskName.trim()}
                    className="rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom tasks list */}
        <AnimatePresence mode="popLayout">
          {customTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TaskItem
                    taskKey={`custom_${task.id}`}
                    emoji={task.emoji}
                    label={task.name}
                    description="Custom task"
                    isCompleted={completions.includes(`custom_${task.id}`)}
                    onToggle={() => onToggleTask(`custom_${task.id}`)}
                    onAddNote={(note) => onAddNote(`custom_${task.id}`, note)}
                  />
                </div>
                <button
                  onClick={() => onRemoveCustomTask(task.id)}
                  className="flex-shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
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
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {customTasks.length === 0 && !showAddForm && (
          <p className="py-2 text-center text-xs text-text-muted">
            No custom tasks yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
