"use client";

import { useEffect } from "react";

/** Registers /sw.js in production (dev HMR and a service worker don't mix). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("Service worker registration failed:", err));
  }, []);

  return null;
}
