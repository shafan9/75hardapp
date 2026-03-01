"use client";

import { useEffect, useId } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressRingVariant = "hero" | "avatar" | "mini";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  variant?: ProgressRingVariant;
  innerProgress?: number;
  className?: string;
}

const variantDefaults: Record<ProgressRingVariant, { size: number; strokeWidth: number }> = {
  hero: { size: 200, strokeWidth: 12 },
  avatar: { size: 120, strokeWidth: 8 },
  mini: { size: 62, strokeWidth: 6 },
};

export function ProgressRing({
  progress,
  size,
  strokeWidth,
  label,
  sublabel,
  variant = "hero",
  innerProgress,
  className,
}: ProgressRingProps) {
  const id = useId();
  const metrics = variantDefaults[variant];
  const resolvedSize = size ?? metrics.size;
  const resolvedStroke = strokeWidth ?? metrics.strokeWidth;

  const radius = (resolvedSize - resolvedStroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const springProgress = useSpring(0, {
    stiffness: 70,
    damping: 18,
    mass: 0.9,
  });

  const strokeDashoffset = useTransform(springProgress, [0, 100], [circumference, 0]);

  useEffect(() => {
    springProgress.set(Math.max(0, Math.min(progress, 100)));
  }, [progress, springProgress]);

  const isHighProgress = progress >= 80;
  const gradientId = `progress-gradient-${id}`;
  const innerGradientId = `progress-inner-gradient-${id}`;

  const innerProgressValue = Math.max(0, Math.min(innerProgress ?? 0, 100));
  const hasInnerRing = typeof innerProgress === "number";
  const innerRadius = Math.max(radius - resolvedStroke - 4, 0);
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerOffset = innerCircumference - (innerCircumference * innerProgressValue) / 100;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-label="Challenge progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(progress, 100)))}
    >
      {isHighProgress && (
        <div
          className="absolute rounded-full"
          style={{
            width: resolvedSize + 26,
            height: resolvedSize + 26,
            background: "radial-gradient(circle, rgba(0,212,255,0.24) 0%, transparent 68%)",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
      )}

      <svg
        width={resolvedSize}
        height={resolvedSize}
        viewBox={`0 0 ${resolvedSize} ${resolvedSize}`}
        className="rotate-[-90deg]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#7C4DFF" />
          </linearGradient>
          <linearGradient id={innerGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>

        <circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={resolvedStroke}
          strokeLinecap="round"
        />

        <motion.circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={resolvedStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />

        {hasInnerRing && innerRadius > 0 && (
          <>
            <circle
              cx={resolvedSize / 2}
              cy={resolvedSize / 2}
              r={innerRadius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={Math.max(2, resolvedStroke * 0.52)}
              strokeLinecap="round"
            />
            <circle
              cx={resolvedSize / 2}
              cy={resolvedSize / 2}
              r={innerRadius}
              fill="none"
              stroke={`url(#${innerGradientId})`}
              strokeWidth={Math.max(2, resolvedStroke * 0.52)}
              strokeLinecap="round"
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
            />
          </>
        )}
      </svg>

      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && (
            <span
              className={cn(
                variant === "hero" ? "text-5xl" : variant === "avatar" ? "text-2xl" : "text-sm",
                "font-black text-text-primary",
                isHighProgress && "gradient-text"
              )}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className={cn(
                "font-medium text-text-secondary",
                variant === "hero" ? "text-xs" : "text-[10px]"
              )}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
