"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types";

const PAGE_SIZE = 200;

type ConnectionState = "connecting" | "live" | "offline";

function upsertMessage(list: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

/**
 * Messages for one chat week, kept in sync through Supabase Realtime
 * (postgres_changes, so RLS decides who receives what).
 */
export function useChat(chatWeekId: string, userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_week_id", chatWeekId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError(loadError.message);
        // Merge with anything realtime delivered while loading
        setMessages((current) =>
          ((data ?? []) as ChatMessage[]).reduce(upsertMessage, current)
        );
        setLoading(false);
      });

    const channel = supabase
      .channel(`chat:${chatWeekId}`)
      .on<ChatMessage>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_week_id=eq.${chatWeekId}`,
        },
        (payload) => setMessages((list) => upsertMessage(list, payload.new))
      )
      .on<ChatMessage>(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `chat_week_id=eq.${chatWeekId}`,
        },
        (payload) =>
          setMessages((list) => list.filter((m) => m.id !== payload.old.id))
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") setConnection("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setConnection("offline");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, chatWeekId]);

  const sendMessage = useCallback(
    async (content: string, replyTo?: string | null, imagePath?: string | null) => {
      const text = content.trim();
      if (!text && !imagePath) return;
      const { data, error: sendError } = await supabase
        .from("chat_messages")
        .insert({
          chat_week_id: chatWeekId,
          user_id: userId,
          content: text,
          image_url: imagePath ?? null,
          reply_to: replyTo ?? null,
        })
        .select("*")
        .single();
      if (sendError) throw new Error(sendError.message);
      setMessages((list) => upsertMessage(list, data as ChatMessage));
    },
    [supabase, chatWeekId, userId]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
      setMessages((list) => list.filter((m) => m.id !== id));
    },
    [supabase]
  );

  return {
    messages,
    loading,
    error,
    connection,
    sendMessage,
    deleteMessage,
  };
}
