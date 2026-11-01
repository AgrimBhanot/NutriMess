"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nutrimess:install-dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Add to home screen" card: native prompt on Android/desktop Chrome,
 *  Share-sheet hint on iOS Safari. Hidden once installed or dismissed. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone);
    if (standalone || wasDismissed()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time platform check
      setShowIosHint(true);
      setHidden(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable (private mode); just hide for this visit
    }
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#244E3D]/20 bg-[#244E3D]/5 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-semibold text-white">
        N
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#111827]">Install NutriMess</p>
        {showIosHint ? (
          <p className="text-xs text-[#4B5563]">
            Tap <Share className="inline h-3.5 w-3.5 stroke-[1.5px]" /> Share, then
            &ldquo;Add to Home Screen&rdquo;.
          </p>
        ) : (
          <>
            <p className="text-xs text-[#4B5563]">
              Open it from your home screen like an app.
            </p>
            <button
              type="button"
              onClick={install}
              className="mt-2 flex h-8 items-center gap-1.5 rounded-lg bg-[#244E3D] px-3 text-xs font-medium text-white"
            >
              <Download className="h-3.5 w-3.5 stroke-[1.5px]" />
              Install
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-[#9CA3AF] hover:text-[#4B5563]"
      >
        <X className="h-4 w-4 stroke-[1.5px]" />
      </button>
    </div>
  );
}
