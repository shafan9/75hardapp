"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "75squad.pwa.install.dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaMode = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return mediaMode || navigatorStandalone === true;
}

function readDismissState() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissState() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore storage write failures.
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const offsetClass = useMemo(() => {
    if (pathname?.startsWith("/dashboard")) {
      return "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]";
    }

    return "bottom-[calc(env(safe-area-inset-bottom)+1rem)]";
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;

    if (readDismissState()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstall() {
    if (!deferredEvent) return;

    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    setVisible(false);
  }

  function handleDismiss() {
    saveDismissState();
    setVisible(false);
  }

  if (!visible || !deferredEvent) return null;

  return (
    <div className={`fixed left-3 right-3 z-[95] sm:left-auto sm:right-4 sm:w-[360px] ${offsetClass}`}>
      <div className="glass-card border border-white/15 p-3 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold tracking-[0.15em] text-white/55">INSTALL APP</p>
        <p className="mt-1 text-sm text-white/90">
          Add 75 Squad to your home screen for faster open and app-like feel.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleInstall();
            }}
            className="rounded-xl bg-gradient-to-r from-accent-violet to-accent-pink px-4 min-h-11 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 min-h-11 text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
