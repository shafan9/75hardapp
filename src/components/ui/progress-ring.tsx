"use client";

import { useEffect, useId } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
}: ProgressRingProps) {
  const id = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const springProgress = useSpring(0, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });

  const strokeDashoffset = useTransform(
    springProgress,
    [0, 100],
    [circumference, 0]
  );

  useEffect(() => {
    springProgress.set(Math.min(progress, 100));
  }, [progress, springProgress]);

  const isHighProgress = progress > 80;
  const gradientId = `progress-gradient-${id}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect for high progress */}
      {isHighProgress && (
        <div
          className="absolute rounded-full"
          style={{
            width: size + 20,
            height: size + 20,
            background:
              "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A3150"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span
            className={cn(
              "text-2xl font-bold text-text-primary",
              isHighProgress && "gradient-text"
            )}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-sm text-text-muted">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
