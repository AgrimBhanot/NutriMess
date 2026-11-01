import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_MACROS, sumMacros } from "@/lib/nutrition";
import { addDays } from "@/lib/week";
import type { Macros, MealLog, MealLogItem } from "@/types";

export type MealLogWithItems = MealLog & {
  meal_log_items: Pick<
    MealLogItem,
    "id" | "food_name" | "portion" | "estimated_grams" | "calories" | "protein"
  >[];
};

export function logMacros(log: MealLog): Macros {
  return {
    calories: log.total_calories ?? 0,
    protein: log.total_protein ?? 0,
    carbs: log.total_carbs ?? 0,
    fat: log.total_fat ?? 0,
    fiber: log.total_fiber ?? 0,
  };
}

/** The user's meal logs from `days` days ago through `today` (IST dates). */
export async function getRecentMealLogs(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  days = 7
): Promise<MealLogWithItems[]> {
  const { data } = await supabase
    .from("meal_logs")
    .select(
      "*, meal_log_items(id, food_name, portion, estimated_grams, calories, protein)"
    )
    .eq("user_id", userId)
    .gte("meal_date", addDays(today, -(days - 1)))
    .lte("meal_date", today)
    .order("created_at", { ascending: true });
  return (data ?? []) as MealLogWithItems[];
}

export type DayTotal = { date: string; totals: Macros; meals: number };

export function dailyTotals(
  logs: MealLog[],
  today: string,
  days = 7
): DayTotal[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    const dayLogs = logs.filter((l) => l.meal_date === date);
    return {
      date,
      totals: dayLogs.length ? sumMacros(dayLogs.map(logMacros)) : EMPTY_MACROS,
      meals: dayLogs.length,
    };
  });
}
