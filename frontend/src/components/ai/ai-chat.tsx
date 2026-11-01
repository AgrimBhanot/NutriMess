"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sendAiMessage } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AiChatMessage } from "@/types";

const STARTERS = [
  "What should I eat at the next meal?",
  "Am I getting enough protein today?",
  "Which days this week have the best high-protein options?",
  "I'm trying to lose weight. What should I skip in the mess?",
];

interface AiChatProps {
  initialSessionId: string | null;
  initialMessages: AiChatMessage[];
}

/** Renders "- " lines as bullets; the assistant is told to use plain text. */
function FormattedReply({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-*•]\s+/, "").replace(/\*\*/g, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </div>
  );
}

export function AiChat({ initialSessionId, initialMessages }: AiChatProps) {
  const supabase = useMemo(() => createClient(), []);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking) return;

    const optimistic: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setThinking(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Please sign in again.");

      const res = await sendAiMessage(message, sessionId, token);
      setSessionId(res.session_id);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(message);
      toast.error(err instanceof Error ? err.message : "The assistant is unavailable");
    } finally {
      setThinking(false);
    }
  }

  function newChat() {
    setSessionId(null);
    setMessages([]);
  }

  return (
    <div className="flex h-[calc(100dvh-56px-80px-32px)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#244E3D]/10">
            <Sparkles className="h-5 w-5 stroke-[1.5px] text-[#244E3D]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Nutrition Assistant</h2>
            <p className="text-xs text-[#9CA3AF]">Knows your menu, meals and goals</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newChat}
            disabled={thinking}
            className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4B5563]"
          >
            <Plus className="h-3.5 w-3.5 stroke-[1.5px]" />
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {messages.length === 0 && (
          <div className="space-y-3 pt-6">
            <p className="text-center text-sm text-[#4B5563]">
              Ask anything about what to eat from your mess menu.
            </p>
            <div className="space-y-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left text-sm text-[#111827] hover:border-[#244E3D]/30 card-shadow"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-tr-md bg-[#244E3D] text-white"
                  : "rounded-tl-md border border-[#E5E7EB] bg-white text-[#111827]"
              )}
            >
              {m.role === "assistant" ? <FormattedReply text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-2 px-1 text-xs text-[#9CA3AF]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking your menu and meals...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-2 card-shadow"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about your meals..."
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#9CA3AF] field-sizing-content"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#244E3D] text-white disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4 stroke-[1.5px]" />
        </button>
      </form>
    </div>
  );
}
