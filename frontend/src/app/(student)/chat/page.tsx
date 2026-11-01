import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/chat-page";

export const metadata: Metadata = {
  title: "Bhawan Chat",
};

export default function StudentChatPage() {
  return <ChatPage />;
}
