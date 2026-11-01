import { MEAL_SCHEDULE, MEAL_TYPES } from "@/lib/constants";
import type { MealType } from "@/types";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type MealState = "past" | "current" | "upcoming";

/** State of a meal relative to `nowMinutes` (minutes since IST midnight). */
export function mealState(meal: MealType, nowMinutes: number): MealState {
  const { startTime, endTime } = MEAL_SCHEDULE[meal];
  if (nowMinutes > toMinutes(endTime)) return "past";
  if (nowMinutes >= toMinutes(startTime)) return "current";
  return "upcoming";
}

export function currentMeal(nowMinutes: number): MealType | null {
  return MEAL_TYPES.find((m) => mealState(m, nowMinutes) === "current") ?? null;
}

/** Meal to pre-select when logging: the one being served, else the last one. */
export function suggestedMeal(nowMinutes: number): MealType {
  const served = MEAL_TYPES.filter((m) => mealState(m, nowMinutes) !== "upcoming");
  return served.at(-1) ?? "breakfast";
}
