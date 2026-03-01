"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiTrigger } from "@/components/ui/confetti-trigger";
import { springs } from "@/lib/animations";

interface CelebrationOverlayProps {
  open: boolean;
  day: number;
  tasksDone: number;
  streak: number;
  onClose: () => void;
}

export function CelebrationOverlay({
  open,
  day,
  tasksDone,
  streak,
  onClose,
}: CelebrationOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(3,4,8,0.84)] px-5 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ConfettiTrigger trigger={open} />

          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,22,31,0.98),rgba(9,9,14,0.98))] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0, scale: 0.8, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 18 }}
            transition={springs.bouncy}
          >
            <div className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-accent-cyan/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-accent-orange/20 blur-3xl" />

            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-text-secondary">
              All Tasks Complete
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight gradient-text sm:text-5xl">
              DAY {day} CRUSHED
            </h2>
            <p className="mt-3 text-base text-text-secondary">
              All {tasksDone} tasks complete
            </p>
            <p className="mt-2 text-lg font-semibold text-accent-orange">
              🔥 {streak}-day streak 🔥
            </p>
            <p className="mt-5 text-xs text-text-muted">Tap anywhere to close</p>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body
  );
}
