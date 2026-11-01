"use client";

import { useState } from "react";
import { Loader2, SendHorizontal, X } from "lucide-react";
import type { ChatMessage } from "@/types";

const MAX_LENGTH = 1000;

interface ChatInputProps {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = value.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setValue("");
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
            : {replyTo.content}
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-2 card-shadow"
      >
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
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] field-sizing-content"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
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
