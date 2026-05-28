"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, WifiOff, X } from "lucide-react";
import { getPwaDisplayState } from "@/lib/pwa/install-state";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as StandaloneNavigator).standalone)
  );
}

export function PwaInstallStatus() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setDismissed(false);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const displayState = useMemo(
    () =>
      getPwaDisplayState({
        online,
        installed,
        canInstall: Boolean(installEvent) && !dismissed
      }),
    [dismissed, installEvent, installed, online]
  );

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstalled(true);
    } else {
      setDismissed(true);
    }

    setInstallEvent(null);
  }

  if (displayState === "hidden") {
    return null;
  }

  if (displayState === "offline") {
    return (
      <div className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
        <WifiOff className="h-4 w-4" />
        离线
      </div>
    );
  }

  if (displayState === "installed") {
    return (
      <div className="hidden min-h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:inline-flex">
        <CheckCircle2 className="h-4 w-4" />
        已安装
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleInstall}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-panel-strong"
      >
        <Download className="h-4 w-4 text-accent" />
        安装
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-panel-strong hover:text-foreground sm:inline-flex"
        aria-label="关闭安装提示"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
