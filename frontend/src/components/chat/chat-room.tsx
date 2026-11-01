"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/lib/hooks/use-chat";
import { downscaleImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, signedImageUrls, uploadImage } from "@/lib/supabase/storage";
import type { ChatMessage as ChatMessageType, UserRole } from "@/types";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { WeekBanner } from "./week-banner";

interface ChatRoomProps {
  chatWeekId: string;
  weekStart: string;
  weekEnd: string;
  bhawanName: string;
  bhawanId: string;
  userId: string;
  userRole: UserRole;
  menuImageUrl: string | null;
}

export function ChatRoom({
  chatWeekId,
  weekStart,
  weekEnd,
  bhawanName,
  bhawanId,
  userId,
  userRole,
  menuImageUrl,
}: ChatRoomProps) {
  const { messages, loading, error, connection, sendMessage, deleteMessage } =
    useChat(chatWeekId, userId);
  const [replyTo, setReplyTo] = useState<ChatMessageType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages]
  );

  // Signed URLs for image attachments (private, bhawan-scoped bucket)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const requestedImages = useRef(new Set<string>());
  useEffect(() => {
    const missing = messages
      .map((m) => m.image_url)
      .filter((p): p is string => !!p && !requestedImages.current.has(p));
    if (missing.length === 0) return;
    missing.forEach((p) => requestedImages.current.add(p));
    signedImageUrls(createClient(), BUCKETS.chatImages, missing).then((urls) =>
      setImageUrls((prev) => ({ ...prev, ...urls }))
    );
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(content: string, image: File | null) {
    try {
      const imagePath = image
        ? await uploadImage(
            createClient(),
            BUCKETS.chatImages,
            bhawanId,
            await downscaleImage(image)
          )
        : null;
      await sendMessage(content, replyTo?.id, imagePath);
      setReplyTo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
      throw err;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    // Fill the viewport between the app header (56px) and bottom nav (80px)
    <div className="flex h-[calc(100dvh-56px-80px-32px)] flex-col gap-3">
      <WeekBanner
        bhawanName={bhawanName}
        weekStart={weekStart}
        weekEnd={weekEnd}
        connection={connection}
      />

      {menuImageUrl && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white card-shadow">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#244E3D]"
          >
            <ImageIcon className="h-4 w-4 stroke-[1.5px]" />
            {showMenu ? "Hide" : "View"} this week&apos;s menu
          </button>
          {showMenu && (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL, not optimised
            <img
              src={menuImageUrl}
              alt="This week's mess menu"
              className="max-h-80 w-full rounded-b-2xl object-contain"
            />
          )}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">
            Could not load messages: {error}
          </p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BA5D38]/10">
              <MessageCircle className="h-6 w-6 stroke-[1.5px] text-[#BA5D38]" />
            </div>
            <p className="text-sm font-medium text-[#111827]">
              No messages this week yet
            </p>
            <p className="text-xs text-[#9CA3AF]">
              Start the conversation about this week&apos;s food.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              replyTo={message.reply_to ? byId.get(message.reply_to) : undefined}
              imageUrl={message.image_url ? imageUrls[message.image_url] : undefined}
              isOwn={message.user_id === userId}
              canDelete={
                message.user_id === userId || userRole === "secretary"
              }
              onReply={() => setReplyTo(message)}
              onDelete={() => handleDelete(message.id)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  );
}
