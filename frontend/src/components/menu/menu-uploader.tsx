"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Sparkles, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_MB = 10;

interface MenuUploaderProps {
  busy: boolean;
  onExtract: (file: File) => void;
  onManual: (file: File | null) => void;
}

export function MenuUploader({ busy, onExtract, onManual }: MenuUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(next: File | undefined) {
    if (!next) return;
    if (!ACCEPTED.includes(next.type)) {
      setError("Please choose a JPEG, PNG, WebP or HEIC image.");
      return;
    }
    if (next.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-6 text-center transition-colors",
          dragging ? "border-[#244E3D] bg-[#244E3D]/5" : "border-[#E5E7EB]"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={preview}
            alt="Menu preview"
            className="max-h-72 rounded-xl object-contain"
          />
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#244E3D]/10">
              <ImageUp className="h-6 w-6 stroke-[1.5px] text-[#244E3D]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">
                Drop the menu photo here
              </p>
              <p className="text-xs text-[#9CA3AF]">
                or tap to take a photo / choose a file
              </p>
            </div>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full text-center text-xs font-medium text-[#244E3D]"
        >
          Choose a different image
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onManual(file)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-sm font-medium text-[#4B5563] disabled:opacity-50"
        >
          <PenLine className="h-4 w-4 stroke-[1.5px]" />
          Enter manually
        </button>
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => file && onExtract(file)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 stroke-[1.5px]" />
          )}
          {busy ? "Reading menu..." : "Extract with AI"}
        </button>
      </div>
    </div>
  );
}
