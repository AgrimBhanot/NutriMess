import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secretary Chat",
};

export default function SecretaryChatPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold text-[#111827]">Community Chat</h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Post announcements and interact with bhawan students.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 2</p>
    </div>
  );
}
