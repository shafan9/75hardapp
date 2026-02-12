"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { DEFAULT_TASKS, DEFAULT_TASK_KEYS, TOTAL_DAYS } from "@/lib/constants";
import { cn, getDayLabel, getProgressPercent, getStreakMessage } from "@/lib/utils";

// TODO: replace with real data from hook
const MOCK_CURRENT_DAY = 12;

interface TaskState {
  completed: boolean;
  note: string;
}

function ProgressRing({ percent, size = 120, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent-violet)" />
            <stop offset="50%" stopColor="var(--color-accent-pink)" />
            <stop offset="100%" stopColor="var(--color-accent-amber)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-text-primary">{percent}%</span>
      </div>
    </div>
  );
}

function TaskItem({
  task,
  state,
  onToggle,
  onNoteChange,
}: {
  task: (typeof DEFAULT_TASKS)[number];
  state: TaskState;
  onToggle: () => void;
  onNoteChange: (note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);

  return (
    <motion.div
      layout
      className={cn(
        "glass-card p-4 transition-all duration-300",
        state.completed && "border-accent-emerald/50 glow-emerald"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <motion.button
          onClick={onToggle}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors cursor-pointer shrink-0",
            state.completed
              ? "bg-accent-emerald border-accent-emerald"
              : "bg-transparent border-border-light"
          )}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
        >
          <AnimatePresence mode="wait">
            {state.completed ? (
              <motion.span
                key="check"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-lg"
              >
                ✓
              </motion.span>
            ) : (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="text-lg text-text-muted"
              >
                {task.emoji}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{task.emoji}</span>
            <p
              className={cn(
                "font-semibold text-sm transition-all",
                state.completed ? "text-text-secondary line-through" : "text-text-primary"
              )}
            >
              {task.label}
            </p>
            {"optional" in task && task.optional && (
              <span className="text-[9px] uppercase tracking-wider text-text-muted bg-bg-surface px-1.5 py-0.5 rounded-full">
                opt
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">{task.description}</p>
        </div>

        {/* Note toggle */}
        {state.completed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowNote(!showNote)}
            className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer p-1"
          >
            <span className="text-sm">{state.note ? "📝" : "💬"}</span>
          </motion.button>
        )}
      </div>

      {/* Note input */}
      <AnimatePresence>
        {showNote && state.completed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              placeholder="Add a note... (how'd it go?)"
              value={state.note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="w-full mt-3 px-3 py-2 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DashboardPage() {
  // TODO: replace with real data from hook
  const currentDay = MOCK_CURRENT_DAY;
  const percent = getProgressPercent(currentDay, TOTAL_DAYS);
  const streakMessage = getStreakMessage(currentDay);

  const [tasks, setTasks] = useState<Record<string, TaskState>>(() => {
    const initial: Record<string, TaskState> = {};
    DEFAULT_TASKS.forEach((t) => {
      initial[t.key] = { completed: false, note: "" };
    });
    return initial;
  });

  const [customTasks, setCustomTasks] = useState<{ id: string; name: string; emoji: string; completed: boolean }[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const requiredCompleted = DEFAULT_TASK_KEYS.every((key) => tasks[key]?.completed);

  const fireConfetti = useCallback(() => {
    if (celebrated) return;
    setCelebrated(true);
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#7C3AED", "#EC4899", "#F59E0B", "#10B981"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#7C3AED", "#EC4899", "#F59E0B", "#10B981"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [celebrated]);

  function toggleTask(key: string) {
    setTasks((prev) => {
      const next = { ...prev, [key]: { ...prev[key], completed: !prev[key].completed } };
      // Check if all required are done after this toggle
      const allDone = DEFAULT_TASK_KEYS.every((k) => next[k]?.completed);
      if (allDone && !celebrated) {
        setTimeout(() => fireConfetti(), 300);
      }
      return next;
    });
  }

  function updateNote(key: string, note: string) {
    setTasks((prev) => ({
      ...prev,
      [key]: { ...prev[key], note },
    }));
  }

  function addCustomTask() {
    if (!newTaskName.trim()) return;
    setCustomTasks((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, name: newTaskName.trim(), emoji: "🎯", completed: false },
    ]);
    setNewTaskName("");
    setShowAddTask(false);
  }

  function toggleCustomTask(id: string) {
    setCustomTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="flex justify-center">
          <ProgressRing percent={percent} />
        </div>
        <div>
          <h1 className="text-2xl font-black gradient-text">
            {getDayLabel(currentDay, TOTAL_DAYS)}
          </h1>
          <motion.p
            className="text-text-secondary text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {streakMessage}
          </motion.p>
        </div>
      </motion.div>

      {/* Completion celebration banner */}
      <AnimatePresence>
        {requiredCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="glass-card p-4 text-center glow-emerald border-accent-emerald/50"
          >
            <p className="text-lg font-bold">
              🎉 ALL TASKS DONE! You crushed it today! 🏆
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06 } },
        }}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1">
          Daily Tasks
        </p>
        {DEFAULT_TASKS.map((task) => (
          <motion.div
            key={task.key}
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 25 } },
            }}
          >
            <TaskItem
              task={task}
              state={tasks[task.key]}
              onToggle={() => toggleTask(task.key)}
              onNoteChange={(note) => updateNote(task.key, note)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Custom tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Custom Tasks
          </p>
          <motion.button
            onClick={() => setShowAddTask(!showAddTask)}
            className="text-xs text-accent-violet font-semibold cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            {showAddTask ? "Cancel" : "+ Add"}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAddTask && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Task name..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
                  className="flex-1 px-3 py-2 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
                />
                <motion.button
                  onClick={addCustomTask}
                  className="px-4 py-2 rounded-xl bg-accent-violet text-white text-sm font-semibold cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  Add
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {customTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "glass-card p-4 flex items-center gap-3",
              task.completed && "border-accent-emerald/50 glow-emerald"
            )}
          >
            <motion.button
              onClick={() => toggleCustomTask(task.id)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors cursor-pointer shrink-0",
                task.completed
                  ? "bg-accent-emerald border-accent-emerald"
                  : "bg-transparent border-border-light"
              )}
              whileTap={{ scale: 0.85 }}
            >
              {task.completed ? "✓" : ""}
            </motion.button>
            <span className="text-lg">{task.emoji}</span>
            <p
              className={cn(
                "font-semibold text-sm",
                task.completed ? "text-text-secondary line-through" : "text-text-primary"
              )}
            >
              {task.name}
            </p>
          </motion.div>
        ))}

        {customTasks.length === 0 && !showAddTask && (
          <p className="text-text-muted text-xs text-center py-3">
            No custom tasks yet. Add your own! 🎯
          </p>
        )}
      </div>
    </div>
  );
}
