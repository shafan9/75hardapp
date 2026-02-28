"use client";

import { MotionConfig } from "framer-motion";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { useServiceWorker } from "@/lib/hooks/use-service-worker";
import { ToastProvider } from "@/components/ui/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  useServiceWorker();

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        {children}
        <InstallPrompt />
      </ToastProvider>
    </MotionConfig>
  );
}
