"use client";

import { useState } from "react";
import { DAY_LABELS, MEAL_SCHEDULE, MEAL_TYPES } from "@/lib/constants";
import { mealState } from "@/lib/meal-time";
import type { MenuGrid } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { DayOfWeek, MealType } from "@/types";
import { MenuCard } from "./menu-card";

interface WeeklyMenuProps {
  grid: MenuGrid;
  days: { day: DayOfWeek; date: string; label: string }[];
  today: DayOfWeek;
  /** Minutes since IST midnight, computed on the server for consistency. */
  nowMinutes: number;
}

export function WeeklyMenu({ grid, days, today, nowMinutes }: WeeklyMenuProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(today);
  const [mealFilter, setMealFilter] = useState<MealType | "all">("all");

  const meals = mealFilter === "all" ? MEAL_TYPES : [mealFilter];

  return (
    <div className="space-y-4">
      {/* Weekday strip */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {days.map(({ day, label }) => {
            const active = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex min-w-[52px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors",
                  active
                    ? "border-[#244E3D] bg-[#244E3D] text-white"
                    : "border-[#E5E7EB] bg-white text-[#4B5563]"
                )}
              >
                <span className="text-xs font-medium">
                  {day === today ? "Today" : DAY_LABELS[day]}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    active ? "text-white/80" : "text-[#9CA3AF]"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meal filter chips */}
      <div className="flex gap-2 overflow-x-auto">
        {(["all", ...MEAL_TYPES] as const).map((meal) => (
          <button
            key={meal}
            type="button"
            onClick={() => setMealFilter(meal)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              mealFilter === meal
                ? "border-[#244E3D] bg-[#244E3D]/10 text-[#244E3D]"
                : "border-[#E5E7EB] bg-white text-[#4B5563]"
            )}
          >
            {meal === "all" ? "All" : MEAL_SCHEDULE[meal].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {meals.map((meal) => (
          <MenuCard
            key={meal}
            meal={meal}
            items={grid[selectedDay][meal]}
            state={
              selectedDay === today ? mealState(meal, nowMinutes) : "upcoming"
            }
          />
        ))}
      </div>
    </div>
  );
}
