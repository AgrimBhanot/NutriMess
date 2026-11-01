import { describe, expect, it } from "vitest";
import { computeTargets, portionForGrams, scaleMacros, sumMacros } from "@/lib/nutrition";
import { currentMeal, mealState, suggestedMeal } from "@/lib/meal-time";

const per100 = { calories: 240, protein: 7.5, carbs: 50, fat: 1.5, fiber: 3.5 };

describe("macros", () => {
  it("scales per-100g values to a portion", () => {
    expect(scaleMacros(per100, 80)).toEqual({
      calories: 192, protein: 6, carbs: 40, fat: 1.2, fiber: 2.8,
    });
  });

  it("sums without floating-point drift", () => {
    const total = sumMacros([
      { calories: 0.1, protein: 0.2, carbs: 0, fat: 0, fiber: 0 },
      { calories: 0.2, protein: 0.1, carbs: 0, fat: 0, fiber: 0 },
    ]);
    expect(total.calories).toBe(0.3);
    expect(total.protein).toBe(0.3);
  });

  it("labels portions relative to the default serving", () => {
    expect(portionForGrams(60, 100)).toBe("small");
    expect(portionForGrams(110, 100)).toBe("medium");
    expect(portionForGrams(150, 100)).toBe("large");
  });
});

describe("targets (must match backend recommender)", () => {
  it("falls back to defaults without body stats", () => {
    const t = computeTargets({ age: null, height_cm: null, weight_kg: 70, activity_level: null, goal: null });
    expect(t.personalised).toBe(false);
    expect(t.calories).toBe(2200);
  });

  it("matches the backend's Mifflin-St Jeor numbers", () => {
    const t = computeTargets({
      age: 20, height_cm: 175, weight_kg: 70, activity_level: "active", goal: "gain_muscle",
    });
    expect(t.calories).toBe(3090);
    expect(t.protein).toBe(112);
  });
});

describe("meal times (IST minutes)", () => {
  const at = (h: number, m = 0) => h * 60 + m;

  it("knows which meal is being served", () => {
    expect(currentMeal(at(13))).toBe("lunch");
    expect(currentMeal(at(11))).toBeNull();
    expect(mealState("breakfast", at(13))).toBe("past");
    expect(mealState("dinner", at(13))).toBe("upcoming");
  });

  it("suggests the last served meal for logging", () => {
    expect(suggestedMeal(at(6))).toBe("breakfast");
    expect(suggestedMeal(at(15))).toBe("lunch");
    expect(suggestedMeal(at(23))).toBe("dinner");
  });
});
