import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/chat-page";

export const metadata: Metadata = {
  title: "Secretary Chat",
};

export default function SecretaryChatPage() {
  return <ChatPage />;
}
