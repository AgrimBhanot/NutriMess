import { describe, expect, it } from "vitest";
import { emptyGrid, gridToItems, groupMenuItems } from "@/lib/menu";

describe("menu grid", () => {
  it("groups items by day and meal in display order", () => {
    const grid = groupMenuItems([
      { day: "monday", meal: "lunch", item_name: "Rice", item_order: 1 },
      { day: "monday", meal: "lunch", item_name: "Dal", item_order: 0 },
      { day: "sunday", meal: "dinner", item_name: "Kheer", item_order: 0 },
    ]);
    expect(grid.monday.lunch).toEqual(["Dal", "Rice"]);
    expect(grid.sunday.dinner).toEqual(["Kheer"]);
    expect(grid.tuesday.breakfast).toEqual([]);
  });

  it("round-trips through the editor format, dropping blank rows", () => {
    const grid = emptyGrid();
    grid.friday.snacks = ["Samosa", "  ", " Tea "];
    expect(gridToItems(grid)).toEqual([
      { day: "friday", meal: "snacks", item_name: "Samosa", item_order: 0 },
      { day: "friday", meal: "snacks", item_name: "Tea", item_order: 1 },
    ]);
  });
});
