"use client";

import { MotionConfig } from "framer-motion";
import { useServiceWorker } from "@/lib/hooks/use-service-worker";
import { ToastProvider } from "@/components/ui/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  useServiceWorker();

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
