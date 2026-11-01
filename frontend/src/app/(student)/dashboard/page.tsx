import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MEAL_SCHEDULE } from "@/lib/constants";
import {
  ScanLine,
  MessageCircle,
  UtensilsCrossed,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

function getCurrentMeal(): {
  current: string | null;
  label: string;
  time: string;
} {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const entries = Object.entries(MEAL_SCHEDULE) as [
    string,
    { label: string; startTime: string; endTime: string },
  ][];

  for (const [key, meal] of entries) {
    const [startH, startM] = meal.startTime.split(":").map(Number);
    const [endH, endM] = meal.endTime.split(":").map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (currentTime >= start && currentTime <= end) {
      return {
        current: key,
        label: meal.label,
        time: `${meal.startTime} - ${meal.endTime}`,
      };
    }
  }

  return { current: null, label: "No meal", time: "in progress" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, bhawans(name, code)")
    .eq("id", user.id)
    .single();

  const bhawan = profile?.bhawans as unknown as { name: string; code: string } | null;
  const currentMeal = getCurrentMeal();

  // Today's date formatted
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Good{" "}
          {today.getHours() < 12
            ? "Morning"
            : today.getHours() < 17
              ? "Afternoon"
              : "Evening"}
          , {profile?.full_name?.split(" ")[0] || "Student"}
        </h2>
        <p className="text-sm text-[#9CA3AF]">{dateStr}</p>
      </div>

      {/* Live meal status */}
      {currentMeal.current && (
        <div className="flex items-center gap-2 rounded-full bg-[#244E3D]/5 px-4 py-2 w-fit">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span className="text-sm font-medium text-[#244E3D]">
            {currentMeal.label} Active
          </span>
          <span className="text-xs text-[#9CA3AF]">{currentMeal.time}</span>
        </div>
      )}

      {/* Today's schedule */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#111827]">
          Today&apos;s Schedule
        </h3>
        <div className="space-y-2">
          {(
            Object.entries(MEAL_SCHEDULE) as [
              string,
              { label: string; startTime: string; endTime: string },
            ][]
          ).map(([key, meal]) => {
            const isCurrent = key === currentMeal.current;
            const now = new Date();
            const [endH, endM] = meal.endTime.split(":").map(Number);
            const isPast =
              now.getHours() * 60 + now.getMinutes() > endH * 60 + endM;

            return (
              <div
                key={key}
                className={`relative overflow-hidden rounded-2xl border bg-white p-4 transition-all ${
                  isCurrent
                    ? "border-[#244E3D]/20 shadow-sm"
                    : "border-[#E5E7EB]"
                } ${isPast && !isCurrent ? "opacity-50" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#244E3D] rounded-l-2xl" />
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111827]">
                        {meal.label}
                      </span>
                      {isPast && !isCurrent && (
                        <span className="text-xs text-[#9CA3AF]">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {meal.startTime} - {meal.endTime}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="rounded-full bg-[#244E3D]/10 px-3 py-1">
                      <span className="text-xs font-medium text-[#244E3D] tabular-nums">
                        In Progress
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nutrition tracker placeholder */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#111827]">
            Daily Nutrition
          </h3>
          <span className="text-xs text-[#9CA3AF]">Goal: 2,200 kcal</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", value: "0", unit: "kcal", color: "#244E3D" },
            { label: "Protein", value: "0", unit: "g", color: "#BA5D38" },
            { label: "Carbs", value: "0", unit: "g", color: "#4B5563" },
            { label: "Fats", value: "0", unit: "g", color: "#9CA3AF" },
          ].map((macro) => (
            <div key={macro.label} className="text-center">
              <div
                className="mb-2 mx-auto h-1.5 w-full rounded-full bg-[#F3F4F6]"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "0%", backgroundColor: macro.color }}
                />
              </div>
              <span className="text-base font-semibold text-[#111827] tabular-nums">
                {macro.value}
              </span>
              <span className="text-xs text-[#9CA3AF] ml-0.5">
                {macro.unit}
              </span>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{macro.label}</p>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
