import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, ScanLine, Utensils } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { computeTargets, sumMacros } from "@/lib/nutrition";
import { dailyTotals, getRecentMealLogs, logMacros } from "@/lib/meal-history";
import { istToday } from "@/lib/week";
import { DailySummary } from "@/components/nutrition/daily-summary";
import { WeeklyChart } from "@/components/nutrition/weekly-chart";
import { MealLogCard } from "@/components/nutrition/meal-log-card";

export const metadata: Metadata = {
  title: "My Nutrition",
};

export default async function NutritionPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const today = istToday();
  const logs = await getRecentMealLogs(supabase, profile.id, today);
  const todaysLogs = logs.filter((l) => l.meal_date === today);
  const targets = computeTargets(profile);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">My Nutrition</h2>
          <p className="text-sm text-[#9CA3AF]">What you&apos;ve eaten today</p>
        </div>
        <Link
          href="/scan"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#244E3D] px-3 text-sm font-medium text-white"
        >
          <ScanLine className="h-4 w-4 stroke-[1.5px]" />
          Log meal
        </Link>
      </div>

      <DailySummary
        totals={sumMacros(todaysLogs.map(logMacros))}
        targets={targets}
      />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[#111827]">Today&apos;s meals</h3>
        {todaysLogs.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white py-8 text-center">
            <Utensils className="mb-2 h-6 w-6 stroke-[1.5px] text-[#9CA3AF]" />
            <p className="text-sm font-medium text-[#111827]">No meals logged yet</p>
            <p className="text-xs text-[#9CA3AF]">
              Scan your plate after each meal to track your intake.
            </p>
          </div>
        ) : (
          todaysLogs.map((log) => <MealLogCard key={log.id} log={log} />)
        )}
      </div>

      <WeeklyChart days={dailyTotals(logs, today)} target={targets.calories} />

      <Link
        href="/nutrition/history"
        className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm font-medium text-[#111827] card-shadow"
      >
        View meal history
        <ChevronRight className="h-4 w-4 stroke-[1.5px] text-[#9CA3AF]" />
      </Link>
    </div>
  );
}
