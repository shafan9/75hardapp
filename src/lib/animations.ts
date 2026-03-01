import type { Variants } from "framer-motion";

export const springs = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  smooth: { type: "spring" as const, stiffness: 200, damping: 25 },
  bouncy: {
    type: "spring" as const,
    stiffness: 300,
    damping: 15,
    mass: 0.8,
  },
  gentle: { type: "spring" as const, stiffness: 100, damping: 20 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const stagger = (delay = 0.05): Variants => ({
  show: { transition: { staggerChildren: delay } },
});
