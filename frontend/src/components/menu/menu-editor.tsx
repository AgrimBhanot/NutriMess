"use client";

import { useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  MEAL_SCHEDULE,
  MEAL_TYPES,
} from "@/lib/constants";
import type { MenuGrid } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { DayOfWeek, MealType } from "@/types";

interface MenuEditorProps {
  grid: MenuGrid;
  onChange: (grid: MenuGrid) => void;
}

function updateCell(
  grid: MenuGrid,
  day: DayOfWeek,
  meal: MealType,
  items: string[]
): MenuGrid {
  return { ...grid, [day]: { ...grid[day], [meal]: items } };
}

export function MenuEditor({ grid, onChange }: MenuEditorProps) {
  const [activeDay, setActiveDay] = useState<DayOfWeek>("monday");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function addItem(meal: MealType) {
    const key = `${activeDay}-${meal}`;
    const names = (drafts[key] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const existing = grid[activeDay][meal];
    const merged = [
      ...existing,
      ...names.filter(
        (n) => !existing.some((e) => e.toLowerCase() === n.toLowerCase())
      ),
    ];
    onChange(updateCell(grid, activeDay, meal, merged));
    setDrafts((d) => ({ ...d, [key]: "" }));
  }

  function renameItem(meal: MealType, index: number, name: string) {
    const items = [...grid[activeDay][meal]];
    items[index] = name;
    onChange(updateCell(grid, activeDay, meal, items));
  }

  function removeItem(meal: MealType, index: number) {
    const items = grid[activeDay][meal].filter((_, i) => i !== index);
    onChange(updateCell(grid, activeDay, meal, items));
  }

  function copyFromPreviousDay() {
    const idx = DAYS_OF_WEEK.indexOf(activeDay);
    if (idx === 0) return;
    const prev = DAYS_OF_WEEK[idx - 1];
    onChange({ ...grid, [activeDay]: structuredClone(grid[prev]) });
  }

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const count = MEAL_TYPES.reduce(
              (n, meal) => n + grid[day][meal].length,
              0
            );
            return (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={cn(
                  "flex min-w-[52px] flex-col items-center rounded-2xl border px-3 py-2 text-xs font-medium",
                  day === activeDay
                    ? "border-[#244E3D] bg-[#244E3D] text-white"
                    : "border-[#E5E7EB] bg-white text-[#4B5563]"
                )}
              >
                {DAY_LABELS[day]}
                <span
                  className={cn(
                    "tabular-nums",
                    day === activeDay
                      ? "text-white/80"
                      : count === 0
                        ? "text-[#BA5D38]"
                        : "text-[#9CA3AF]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeDay !== "monday" && (
        <button
          type="button"
          onClick={copyFromPreviousDay}
          className="flex items-center gap-1 text-xs font-medium text-[#244E3D]"
        >
          <Copy className="h-3.5 w-3.5 stroke-[1.5px]" />
          Copy from{" "}
          {DAY_LABELS[DAYS_OF_WEEK[DAYS_OF_WEEK.indexOf(activeDay) - 1]]}
        </button>
      )}

      {MEAL_TYPES.map((meal) => {
        const key = `${activeDay}-${meal}`;
        const items = grid[activeDay][meal];
        return (
          <div
            key={meal}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#111827]">
                {MEAL_SCHEDULE[meal].label}
              </span>
              <span className="text-xs tabular-nums text-[#9CA3AF]">
                {items.length} items
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => renameItem(meal, index, e.target.value)}
                    maxLength={120}
                    className="h-9 flex-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#111827] outline-none focus:border-[#244E3D]/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(meal, index)}
                    aria-label={`Remove ${item}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4 stroke-[1.5px]" />
                  </button>
                </div>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem(meal);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={drafts[key] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [key]: e.target.value }))
                  }
                  placeholder="Add item (comma-separate several)"
                  className="h-9 flex-1 rounded-lg border border-dashed border-[#E5E7EB] bg-white px-3 text-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#244E3D]/40"
                />
                <button
                  type="submit"
                  aria-label="Add item"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#244E3D]/10 text-[#244E3D]"
                >
                  <Plus className="h-4 w-4 stroke-[1.5px]" />
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
