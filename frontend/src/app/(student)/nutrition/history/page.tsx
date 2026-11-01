import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, History } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { computeTargets, sumMacros } from "@/lib/nutrition";
import { getRecentMealLogs, logMacros } from "@/lib/meal-history";
import { istToday } from "@/lib/week";
import { MealLogCard } from "@/components/nutrition/meal-log-card";

export const metadata: Metadata = {
  title: "Meal History",
};

const HISTORY_DAYS = 30;

function formatDay(iso: string, today: string): string {
  if (iso === today) return "Today";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function MealHistoryPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const today = istToday();
  const logs = await getRecentMealLogs(supabase, profile.id, today, HISTORY_DAYS);
  const targets = computeTargets(profile);

  // Newest day first, meals within a day in eating order
  const days = [...new Set(logs.map((l) => l.meal_date))].sort().reverse();
  const loggedTotals = days.map((d) =>
    sumMacros(logs.filter((l) => l.meal_date === d).map(logMacros))
  );
  const avgCalories = days.length
    ? Math.round(loggedTotals.reduce((n, t) => n + t.calories, 0) / days.length)
    : 0;
  const avgProtein = days.length
    ? Math.round(loggedTotals.reduce((n, t) => n + t.protein, 0) / days.length)
    : 0;

  return (
    <div className="space-y-4">
      <Link
        href="/nutrition"
        className="flex w-fit items-center text-sm text-[#9CA3AF] hover:text-[#4B5563]"
      >
        <ChevronLeft className="h-4 w-4 stroke-[1.5px]" />
        My Nutrition
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Meal History</h2>
        <p className="text-sm text-[#9CA3AF]">Last {HISTORY_DAYS} days</p>
      </div>

      {days.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white py-12 text-center">
          <History className="mb-2 h-6 w-6 stroke-[1.5px] text-[#9CA3AF]" />
          <p className="text-sm font-medium text-[#111827]">No meals logged yet</p>
          <p className="text-xs text-[#9CA3AF]">Your logged meals will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Days logged", value: days.length.toString() },
              { label: "Avg kcal / day", value: avgCalories.toLocaleString("en-IN") },
              { label: "Avg protein", value: `${avgProtein}g` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-3 card-shadow"
              >
                <p className="font-mono text-lg font-semibold tabular-nums text-[#111827]">
                  {s.value}
                </p>
                <p className="text-xs text-[#9CA3AF]">{s.label}</p>
              </div>
            ))}
          </div>

          {days.map((day, i) => {
            const totals = loggedTotals[i];
            return (
              <section key={day} className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    {formatDay(day, today)}
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-[#4B5563]">
                    {Math.round(totals.calories).toLocaleString("en-IN")} /{" "}
                    {targets.calories.toLocaleString("en-IN")} kcal ·{" "}
                    {Math.round(totals.protein)}g protein
                  </span>
                </div>
                {logs
                  .filter((l) => l.meal_date === day)
                  .map((log) => (
                    <MealLogCard key={log.id} log={log} />
                  ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
