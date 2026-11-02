"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Camera, ImageUp, PenLine } from "lucide-react";
import { useCamera } from "@/lib/hooks/use-camera";

// QR-scanner, WhatsApp, Instagram etc. open links in webviews that usually
// can't grant camera access to websites
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)|Snapchat|GSA\//i;

function useInAppBrowser(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => IN_APP_BROWSER.test(navigator.userAgent),
    () => false
  );
}

interface CameraViewProps {
  onCapture: (file: File) => void;
  onManual: () => void;
}

export function CameraView({ onCapture, onManual }: CameraViewProps) {
  const { videoRef, status, start, stop, capture } = useCamera();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    start();
  }, [start]);

  async function handleCapture() {
    const file = await capture();
    if (file) {
      stop();
      onCapture(file);
    }
  }

  const cameraBlocked = status === "denied" || status === "unavailable";
  const inAppBrowser = useInAppBrowser();

  return (
    <div className="space-y-4">
      {/* Viewfinder */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#111827]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {!cameraBlocked && (
          <div className="pointer-events-none absolute inset-8">
            {[
              "left-0 top-0 border-l-2 border-t-2 rounded-tl-2xl",
              "right-0 top-0 border-r-2 border-t-2 rounded-tr-2xl",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
            ].map((pos) => (
              <span
                key={pos}
                className={`absolute h-10 w-10 border-white/80 ${pos}`}
              />
            ))}
          </div>
        )}

        {status === "starting" && (
          <p className="absolute inset-x-0 bottom-6 text-center text-xs text-white/70">
            Starting camera...
          </p>
        )}
        {status === "live" && (
          <p className="absolute inset-x-0 bottom-6 text-center text-xs text-white/80">
            Fit the whole thali inside the frame
          </p>
        )}
        {cameraBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera className="h-8 w-8 stroke-[1.5px] text-white/60" />
            <p className="text-sm font-medium text-white">
              {inAppBrowser
                ? "This in-app browser can't use the camera"
                : status === "denied"
                  ? "Camera access is blocked"
                  : "Live camera not available"}
            </p>
            <p className="text-xs text-white/70">
              {inAppBrowser
                ? "Open this page in Chrome or Safari for the live camera, or take a photo below."
                : status === "denied"
                  ? "Tap the lock icon next to the address bar, then Permissions → Camera → Allow, and try again. Or take a photo below."
                  : "Take a photo with your camera app instead."}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#244E3D]"
              >
                <Camera className="h-4 w-4 stroke-[1.5px]" />
                Take photo
              </button>
              {status === "denied" && !inAppBrowser && (
                <button
                  type="button"
                  onClick={() => start()}
                  className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563]"
          aria-label="Upload a photo"
        >
          <ImageUp className="h-5 w-5 stroke-[1.5px]" />
        </button>
        <button
          type="button"
          onClick={handleCapture}
          disabled={status !== "live"}
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-[#244E3D]/20 bg-[#244E3D] text-white transition-opacity disabled:opacity-40"
          aria-label="Capture photo"
        >
          <Camera className="h-7 w-7 stroke-[1.5px]" />
        </button>
        <button
          type="button"
          onClick={() => {
            stop();
            onManual();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563]"
          aria-label="Log manually without a photo"
        >
          <PenLine className="h-5 w-5 stroke-[1.5px]" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            stop();
            onCapture(file);
          }
        }}
      />
    </div>
  );
}
