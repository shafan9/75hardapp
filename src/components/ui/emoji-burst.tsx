"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  duration: number;
  scale: number;
}

interface EmojiBurstProps {
  emoji: string;
  trigger: boolean;
  onComplete?: () => void;
}

export function EmojiBurst({ emoji, trigger, onComplete }: EmojiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const count = 8 + Math.floor(Math.random() * 5); // 8-12 particles
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + (Math.random() * 30 - 15),
      distance: 40 + Math.random() * 60,
      duration: 0.5 + Math.random() * 0.4,
      scale: 0.6 + Math.random() * 0.6,
    }));

    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {particles.map((p) => {
        const radians = (p.angle * Math.PI) / 180;
        const x = Math.cos(radians) * p.distance;
        const y = Math.sin(radians) * p.distance;

        return (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.2 }}
            animate={{
              opacity: 0,
              x,
              y,
              scale: p.scale,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.duration,
              ease: "easeOut",
            }}
            className="pointer-events-none absolute text-lg"
            style={{ fontSize: "1.2em" }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </AnimatePresence>
  );
}
