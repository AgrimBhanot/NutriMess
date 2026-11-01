import { BadgeCheck, CornerUpLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
  replyTo?: ChatMessageType;
  imageUrl?: string;
  isOwn: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function ChatMessage({
  message,
  replyTo,
  imageUrl,
  isOwn,
  canDelete,
  onReply,
  onDelete,
}: ChatMessageProps) {
  const isSecretary = message.author_role === "secretary";

  return (
    <div className={cn("group flex flex-col", isOwn ? "items-end" : "items-start")}>
      <div className="mb-1 flex items-center gap-1.5 px-1">
        <span className="text-xs font-medium text-[#4B5563]">
          {isOwn ? "You" : (message.author_name ?? "Student")}
        </span>
        {isSecretary && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#BA5D38]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#BA5D38]">
            <BadgeCheck className="h-3 w-3 stroke-[1.5px]" />
            Mess Secy
          </span>
        )}
        <span className="text-[10px] tabular-nums text-[#9CA3AF]">
          {formatTime(message.created_at)}
        </span>
      </div>

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
          isOwn
            ? "rounded-tr-md bg-[#244E3D]/10 text-[#111827]"
            : isSecretary
              ? "rounded-tl-md border border-[#BA5D38]/20 bg-[#BA5D38]/5 text-[#111827]"
              : "rounded-tl-md border border-[#E5E7EB] bg-white text-[#111827]"
        )}
      >
        {replyTo && (
          <div className="mb-1.5 border-l-2 border-[#244E3D]/30 pl-2 text-xs text-[#9CA3AF]">
            <span className="font-medium">{replyTo.author_name ?? "Student"}:</span>{" "}
            <span className="line-clamp-1">{replyTo.content || "Photo"}</span>
          </div>
        )}
        {message.image_url &&
          (imageUrl ? (
            <a href={imageUrl} target="_blank" rel="noreferrer" className="mb-1.5 block">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
              <img
                src={imageUrl}
                alt="Shared photo"
                className="max-h-60 rounded-xl object-cover"
              />
            </a>
          ) : (
            <div className="mb-1.5 h-40 w-48 animate-pulse rounded-xl bg-[#F3F4F6]" />
          ))}
        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>

      <div className="mt-0.5 flex gap-2 px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          type="button"
          onClick={onReply}
          className="flex items-center gap-0.5 text-[10px] text-[#9CA3AF] hover:text-[#4B5563]"
          aria-label="Reply"
        >
          <CornerUpLeft className="h-3 w-3 stroke-[1.5px]" />
          Reply
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-0.5 text-[10px] text-[#9CA3AF] hover:text-red-500"
            aria-label="Delete message"
          >
            <Trash2 className="h-3 w-3 stroke-[1.5px]" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
