"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import { MAX_IMAGE_MB } from "@/lib/supabase/storage";
import type { ChatMessage } from "@/types";

const MAX_LENGTH = 1000;

interface ChatInputProps {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (content: string, image: File | null) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Only images can be attached.");
    if (file.size > MAX_IMAGE_MB * 4 * 1024 * 1024) {
      return setError("That photo is too large.");
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    const text = value.trim();
    if ((!text && !image) || sending) return;
    setSending(true);
    try {
      await onSend(text, image);
      setValue("");
      clearImage();
    } catch {
      // ChatRoom already showed a toast; keep the draft
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-center justify-between rounded-xl bg-[#F3F4F6] px-3 py-2 text-xs text-[#4B5563]">
          <span className="line-clamp-1">
            Replying to{" "}
            <span className="font-medium">
              {replyTo.author_name ?? "Student"}
            </span>
            : {replyTo.content || "Photo"}
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="ml-2 text-[#9CA3AF] hover:text-[#4B5563]"
          >
            <X className="h-4 w-4 stroke-[1.5px]" />
          </button>
        </div>
      )}
      {preview && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={preview} alt="Attachment" className="h-20 rounded-xl object-cover" />
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove photo"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563]"
          >
            <X className="h-3.5 w-3.5 stroke-[1.5px]" />
          </button>
        </div>
      )}
      {error && <p className="px-1 text-xs text-red-600">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-2 card-shadow"
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Attach a photo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4B5563]"
        >
          <ImagePlus className="h-5 w-5 stroke-[1.5px]" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Share feedback about today's food..."
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] field-sizing-content"
        />
        <button
          type="submit"
          disabled={disabled || sending || (!value.trim() && !image)}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#244E3D] text-white transition-opacity disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4 stroke-[1.5px]" />
          )}
        </button>
      </form>
    </div>
  );
}
