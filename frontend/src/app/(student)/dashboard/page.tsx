import { connection } from "next/server";
import { MEAL_SCHEDULE, MEAL_TYPES } from "@/lib/constants";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPublishedMenu } from "@/lib/menu";
import { currentMeal, mealState } from "@/lib/meal-time";
import { dayOfWeek, istMinutesNow, istToday, weekMonday } from "@/lib/week";
import { MenuCard } from "@/components/menu/menu-card";
import { DailySummary } from "@/components/nutrition/daily-summary";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { computeTargets, sumMacros } from "@/lib/nutrition";
import { logMacros } from "@/lib/meal-history";
import type { MealLog } from "@/types";
import {
  ScanLine,
  MessageCircle,
  UtensilsCrossed,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const bhawan = profile.bhawans;
  const today = istToday();
  const nowMinutes = istMinutesNow();
  const liveMeal = currentMeal(nowMinutes);
  const [published, { data: todaysLogs }] = await Promise.all([
    getPublishedMenu(supabase, profile.bhawan_id, weekMonday(today)),
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", profile.id)
      .eq("meal_date", today),
  ]);
  const todaysTotals = sumMacros(((todaysLogs ?? []) as MealLog[]).map(logMacros));
  const targets = computeTargets(profile);
  const todaysMenu = published?.grid[dayOfWeek(today)];

  const hour = Math.floor(nowMinutes / 60);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Good {hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"},{" "}
          {profile.full_name?.split(" ")[0] || "Student"}
        </h2>
        <p className="text-sm text-[#9CA3AF]">{dateStr}</p>
      </div>

      <InstallPrompt />

      {/* Live meal status */}
      {liveMeal && (
        <div className="flex w-fit items-center gap-2 rounded-full bg-[#244E3D]/5 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span className="text-sm font-medium text-[#244E3D]">
            {MEAL_SCHEDULE[liveMeal].label} Active
          </span>
          <span className="text-xs tabular-nums text-[#9CA3AF]">
            {MEAL_SCHEDULE[liveMeal].startTime} –{" "}
            {MEAL_SCHEDULE[liveMeal].endTime}
          </span>
        </div>
      )}

      {/* Today's schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#111827]">
            Today&apos;s Menu
          </h3>
          <Link
            href="/menu"
            className="flex items-center text-xs font-medium text-[#244E3D]"
          >
            Full week
            <ChevronRight className="h-4 w-4 stroke-[1.5px]" />
          </Link>
        </div>
        {todaysMenu ? (
          <div className="space-y-2">
            {MEAL_TYPES.map((meal) => (
              <MenuCard
                key={meal}
                meal={meal}
                items={todaysMenu[meal]}
                state={mealState(meal, nowMinutes)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-4 text-center text-sm text-[#9CA3AF]">
            This week&apos;s menu hasn&apos;t been published yet.
          </div>
        )}
      </div>

      <Link href="/nutrition" className="block">
        <DailySummary totals={todaysTotals} targets={targets} />
      </Link>

      <RecommendationCard />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/scan"
          className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#244E3D]/10">
            <ScanLine className="h-6 w-6 text-[#244E3D] stroke-[1.5px]" />
          </div>
          <span className="text-sm font-medium text-[#111827]">
            Scan Meal Plate
          </span>
        </Link>

        <Link
          href="/chat"
          className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BA5D38]/10">
            <MessageCircle className="h-6 w-6 text-[#BA5D38] stroke-[1.5px]" />
          </div>
          <span className="text-sm font-medium text-[#111827]">
            {bhawan?.name.replace(" Bhawan", "")} Community
          </span>
        </Link>

        <Link
          href="/menu"
          className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4B5563]/10">
            <UtensilsCrossed className="h-6 w-6 text-[#4B5563] stroke-[1.5px]" />
          </div>
          <span className="text-sm font-medium text-[#111827]">
            Weekly Menu
          </span>
        </Link>

        <Link
          href="/nutrition"
          className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#244E3D]/10">
            <TrendingUp className="h-6 w-6 text-[#244E3D] stroke-[1.5px]" />
          </div>
          <span className="text-sm font-medium text-[#111827]">
            My Nutrition
          </span>
        </Link>
      </div>

      <Link
        href="/ai-chat"
        className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 card-shadow"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#244E3D]/10">
          <Sparkles className="h-5 w-5 stroke-[1.5px] text-[#244E3D]" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-[#111827]">
            Nutrition Assistant
          </span>
          <p className="text-xs text-[#9CA3AF]">
            Ask what to eat from today&apos;s menu
          </p>
        </div>
        <ChevronRight className="h-4 w-4 stroke-[1.5px] text-[#9CA3AF]" />
      </Link>

      <Link
        href="/complaints"
        className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 card-shadow"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BA5D38]/10">
          <AlertCircle className="h-5 w-5 stroke-[1.5px] text-[#BA5D38]" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-[#111827]">
            Complaints
          </span>
          <p className="text-xs text-[#9CA3AF]">
            Report a problem to your mess secretary
          </p>
        </div>
        <ChevronRight className="h-4 w-4 stroke-[1.5px] text-[#9CA3AF]" />
      </Link>
    </div>
  );
}
