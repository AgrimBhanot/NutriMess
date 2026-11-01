import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Nutrition",
};

export default function NutritionPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#244E3D]/10 mb-4">
        <TrendingUp className="h-8 w-8 text-[#244E3D] stroke-[1.5px]" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">My Nutrition</h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Track your daily nutrition, view meal history, and get personalized
        recommendations.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 3</p>
    </div>
  );
}
