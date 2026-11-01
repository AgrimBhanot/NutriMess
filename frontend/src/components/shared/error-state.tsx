"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface ErrorStateProps {
  error: unknown;
  retry: () => void;
}

/** Shared body for route error boundaries. */
export function ErrorState({ error, retry }: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BA5D38]/10">
        <AlertTriangle className="h-7 w-7 stroke-[1.5px] text-[#BA5D38]" />
      </div>
      <h2 className="text-base font-semibold text-[#111827]">
        {offline ? "You're offline" : "Something went wrong"}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-[#9CA3AF]">
        {offline
          ? "Reconnect to the internet to load this page."
          : "This page couldn't load. Please try again."}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-[#244E3D] px-4 text-sm font-medium text-white"
      >
        <RotateCw className="h-4 w-4 stroke-[1.5px]" />
        Try again
      </button>
    </div>
  );
}
