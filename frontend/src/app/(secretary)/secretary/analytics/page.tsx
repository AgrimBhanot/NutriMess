import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold text-[#111827]">Analytics</h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Student engagement, feedback stats, and mess performance metrics.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 4</p>
    </div>
  );
}
