"use client";

import { useServiceWorker } from "@/lib/hooks/use-service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  useServiceWorker();

  return <>{children}</>;
}
