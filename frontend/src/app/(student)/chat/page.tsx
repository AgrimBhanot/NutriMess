import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bhawan Chat",
};

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#BA5D38]/10 mb-4">
        <MessageCircle className="h-8 w-8 text-[#BA5D38] stroke-[1.5px]" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">
        Bhawan Community
      </h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Chat with fellow students about this week&apos;s mess menu, share
        feedback, and stay connected.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 2</p>
    </div>
  );
}
