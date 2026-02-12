"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  stats: {
    currentDay: number;
    achievementsEarned: number;
    totalCompletions: number;
  };
  onUpdateName: (name: string) => void;
  onSignOut: () => void;
}

export function ProfileCard({
  profile,
  stats,
  onUpdateName,
  onSignOut,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.display_name || "");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const avatarFallback = (profile.display_name || "?")[0].toUpperCase();

  const handleSaveName = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== profile.display_name) {
      onUpdateName(trimmed);
    }
    setIsEditing(false);
  }, [editName, profile.display_name, onUpdateName]);

  const statItems = [
    { label: "Day", value: stats.currentDay, emoji: "📅" },
    { label: "Achievements", value: stats.achievementsEarned, emoji: "🏆" },
    { label: "Completions", value: stats.totalCompletions, emoji: "✅" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="space-y-6"
    >
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-4">
        {/* Avatar with gradient ring */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          {/* Gradient ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber p-[3px]">
            <div className="h-full w-full rounded-full bg-bg-primary" />
          </div>

          {/* Avatar */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet to-accent-pink text-3xl font-bold text-white">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || "User"}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              avatarFallback
            )}
          </div>
        </motion.div>

        {/* Name with inline edit */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                  autoFocus
                  maxLength={30}
                  className="rounded-lg border border-accent-violet bg-bg-primary px-3 py-1.5 text-center text-lg font-bold text-text-primary focus:outline-none"
                />
                <button
                  onClick={handleSaveName}
                  className="rounded-lg bg-accent-emerald/20 p-1.5 text-accent-emerald hover:bg-accent-emerald/30 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8.5L6.5 12L13 4" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setEditName(profile.display_name || "");
                    setIsEditing(false);
                  }}
                  className="rounded-lg bg-accent-red/10 p-1.5 text-accent-red hover:bg-accent-red/20 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <h2 className="text-xl font-bold text-text-primary">
                  {profile.display_name || "Anonymous"}
                </h2>
                <button
                  onClick={() => {
                    setEditName(profile.display_name || "");
                    setIsEditing(true);
                  }}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-bg-surface hover:text-text-secondary transition-colors"
                  aria-label="Edit name"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11.5 1.5l1 1-8.5 8.5L2 12l1-2 8.5-8.5z" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-3"
      >
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center rounded-2xl border border-border bg-bg-card p-3"
          >
            <span className="text-lg">{stat.emoji}</span>
            <span className="text-xl font-bold text-text-primary mt-1">
              {stat.value}
            </span>
            <span className="text-[10px] text-text-muted">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="pt-4"
      >
        <AnimatePresence mode="wait">
          {showSignOutConfirm ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <p className="text-sm text-center text-text-secondary">
                Are you sure you want to sign out?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 rounded-xl border border-border bg-bg-card py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onSignOut}
                  className="flex-1 rounded-xl bg-accent-red py-2.5 text-sm font-semibold text-white hover:bg-accent-red/80 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="signout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full rounded-xl border border-accent-red/30 bg-accent-red/5 py-2.5 text-sm font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
            >
              Sign Out
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
