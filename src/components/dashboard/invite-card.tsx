"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InviteCardProps {
  inviteCode: string;
  groupName: string;
}

export function InviteCard({ inviteCode, groupName }: InviteCardProps) {
  const [copied, setCopied] = useState(false);

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const canonicalBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const baseUrl = origin || canonicalBase || "";
  const inviteUrl = baseUrl ? `${baseUrl}/join/${inviteCode}` : `/join/${inviteCode}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on 75 Squad!`,
          text: `Join my 75 Hard challenge group "${groupName}" and let's crush it together! 💪`,
          url: inviteUrl,
        });
      } catch {
        // User cancelled share or share failed, fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [groupName, inviteUrl, handleCopy]);

  return (
    <div className="relative overflow-hidden rounded-2xl p-[1px]">
      {/* Gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent-violet via-accent-pink to-accent-amber" />

      {/* Card content */}
      <div className="relative rounded-2xl bg-bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🔗</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Invite to {groupName}
            </p>
            <p className="text-xs text-text-muted">
              Share this link with your squad
            </p>
          </div>
        </div>

        {/* Invite URL display */}
        <div className="flex items-center gap-2 rounded-xl bg-bg-primary px-3 py-2.5 border border-border">
          <p className="min-w-0 flex-1 truncate text-sm text-text-secondary font-mono">
            {inviteUrl}
          </p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded-lg bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 text-accent-emerald"
                >
                  <svg aria-hidden="true" focusable="false"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6.5L4.5 9L10 3" />
                  </svg>
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1"
                >
                  <svg aria-hidden="true" focusable="false"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="4" width="7" height="7" rx="1.5" />
                    <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" />
                  </svg>
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <svg aria-hidden="true" focusable="false"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="3" r="2" />
            <circle cx="4" cy="8" r="2" />
            <circle cx="12" cy="13" r="2" />
            <path d="M5.8 9.1l4.4 2.8M10.2 4.1L5.8 6.9" />
          </svg>
          Share Invite Link
        </button>

        {/* Invite code display */}
        <p className="text-center text-[10px] text-text-muted">
          Code: <span className="font-mono font-medium text-text-secondary">{inviteCode}</span>
        </p>
      </div>
    </div>
  );
}
