import { UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Menu",
};

export default function MenuPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4B5563]/10 mb-4">
        <UtensilsCrossed className="h-8 w-8 text-[#4B5563] stroke-[1.5px]" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">Weekly Menu</h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Your bhawan&apos;s weekly mess menu will appear here once uploaded by
        the secretary.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 2</p>
    </div>
  );
}
