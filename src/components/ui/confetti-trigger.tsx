"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiTriggerProps {
  trigger: boolean;
}

const CONFETTI_COLORS = [
  "#7C3AED", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
];

export function ConfettiTrigger({ trigger }: ConfettiTriggerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!trigger || hasFired.current) return;
    hasFired.current = true;

    const fireConfetti = () => {
      // Left burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.1, y: 0.6 },
        colors: CONFETTI_COLORS,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
      });

      // Right burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.9, y: 0.6 },
        colors: CONFETTI_COLORS,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
      });

      // Center burst after a beat
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { x: 0.5, y: 0.4 },
          colors: CONFETTI_COLORS,
          startVelocity: 55,
          gravity: 0.7,
          ticks: 400,
        });
      }, 250);

      // Final shower
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 160,
          origin: { x: 0.5, y: 0 },
          colors: CONFETTI_COLORS,
          startVelocity: 30,
          gravity: 1.2,
          ticks: 350,
        });
      }, 600);
    };

    fireConfetti();

    return () => {
      hasFired.current = false;
    };
  }, [trigger]);

  return null;
}
