import { connection } from "next/server";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AiChat } from "@/components/ai/ai-chat";
import type { AiChatMessage } from "@/types";

export const metadata: Metadata = {
  title: "AI Assistant",
};

export default async function AiChatPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  // Resume the most recent conversation
  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let messages: AiChatMessage[] = [];
  if (session) {
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = (data ?? []) as AiChatMessage[];
  }

  return (
    <AiChat
      initialSessionId={messages.length ? (session?.id ?? null) : null}
      initialMessages={messages}
    />
  );
}
