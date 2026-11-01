"use client";

import { useState } from "react";
import type { DayTotal } from "@/lib/meal-history";
import { cn } from "@/lib/utils";

interface WeeklyChartProps {
  days: DayTotal[];
  target: number;
}

const CHART_HEIGHT = 140;

function dayLabel(iso: string, short = true): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: short ? "short" : "long",
    ...(short ? {} : { day: "numeric", month: "short" }),
    timeZone: "UTC",
  });
}

/** Single-series column chart of daily calories with a goal line. */
export function WeeklyChart({ days, target }: WeeklyChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(target * 1.15, ...days.map((d) => d.totals.calories));
  const y = (v: number) => (v / max) * CHART_HEIGHT;
  const todayIdx = days.length - 1;
  const shown = active ?? todayIdx;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">
          Calories, last 7 days
        </h3>
        <p className="text-xs tabular-nums text-[#4B5563]" aria-live="polite">
          {dayLabel(days[shown].date, false)}:{" "}
          <span className="font-mono font-semibold text-[#111827]">
            {Math.round(days[shown].totals.calories).toLocaleString("en-IN")} kcal
          </span>
          {days[shown].meals > 0 &&
            ` · ${Math.round(days[shown].totals.protein)}g protein`}
        </p>
      </div>

      <div className="relative" style={{ height: CHART_HEIGHT }} aria-hidden>
        {/* Goal line */}
        <div
          className="absolute inset-x-0 border-t border-[#E5E7EB]"
          style={{ bottom: y(target) }}
        >
          <span className="absolute -top-4 right-0 bg-white pl-1 text-[10px] tabular-nums text-[#9CA3AF]">
            Goal {target.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-[#E5E7EB]" />

        <div className="absolute inset-0 grid grid-cols-7">
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(i)}
              className="relative flex h-full items-end justify-center"
            >
              {d.totals.calories > 0 && (
                <span
                  className={cn(
                    "block w-full max-w-6 rounded-t-[4px] transition-opacity",
                    active !== null && active !== i ? "opacity-40" : "opacity-100",
                    i === todayIdx ? "bg-[#244E3D]" : "bg-[#244E3D]/60"
                  )}
                  style={{ height: Math.max(2, y(d.totals.calories)) }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center">
        {days.map((d, i) => (
          <span
            key={d.date}
            className={cn(
              "text-[10px]",
              i === todayIdx ? "font-semibold text-[#111827]" : "text-[#9CA3AF]"
            )}
          >
            {i === todayIdx ? "Today" : dayLabel(d.date)}
          </span>
        ))}
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Daily calories for the last 7 days, goal {target} kcal</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Calories</th>
            <th>Protein (g)</th>
            <th>Meals logged</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date, false)}</td>
              <td>{Math.round(d.totals.calories)}</td>
              <td>{Math.round(d.totals.protein)}</td>
              <td>{d.meals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
