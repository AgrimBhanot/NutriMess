import type { SupabaseClient } from "@supabase/supabase-js";
import { DAYS_OF_WEEK, MEAL_TYPES } from "@/lib/constants";
import type { DayOfWeek, MealType, Menu, MenuItem } from "@/types";

export type MenuGrid = Record<DayOfWeek, Record<MealType, string[]>>;

export function emptyGrid(): MenuGrid {
  return Object.fromEntries(
    DAYS_OF_WEEK.map((day) => [
      day,
      Object.fromEntries(MEAL_TYPES.map((meal) => [meal, [] as string[]])),
    ])
  ) as MenuGrid;
}

export function groupMenuItems(
  items: Pick<MenuItem, "day" | "meal" | "item_name" | "item_order">[]
): MenuGrid {
  const grid = emptyGrid();
  [...items]
    .sort((a, b) => a.item_order - b.item_order)
    .forEach((item) => grid[item.day][item.meal].push(item.item_name));
  return grid;
}

export type PublishedMenu = {
  menu: Menu;
  grid: MenuGrid;
  /** True when this week has no menu and an older one is shown instead. */
  isFallback: boolean;
};

/**
 * Published menu for the given week, falling back to the most recent earlier
 * published menu (mess menus often repeat week to week).
 */
export async function getPublishedMenu(
  supabase: SupabaseClient,
  bhawanId: string,
  weekStart: string
): Promise<PublishedMenu | null> {
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("bhawan_id", bhawanId)
    .eq("status", "published")
    .lte("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle<Menu>();

  if (!menu) return null;

  const { data: items } = await supabase
    .from("menu_items")
    .select("day, meal, item_name, item_order")
    .eq("menu_id", menu.id);

  return {
    menu,
    grid: groupMenuItems(items ?? []),
    isFallback: menu.week_start !== weekStart,
  };
}

export function gridToItems(grid: MenuGrid) {
  return DAYS_OF_WEEK.flatMap((day) =>
    MEAL_TYPES.flatMap((meal) =>
      grid[day][meal]
        .map((name) => name.trim())
        .filter(Boolean)
        .map((item_name, item_order) => ({ day, meal, item_name, item_order }))
    )
  );
}
