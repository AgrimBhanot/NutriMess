import type { Macros, PortionSize, Profile } from "@/types";

export const EMPTY_MACROS: Macros = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

/** Multiplier on a food's default serving (mirrors the backend). */
export const PORTION_FACTORS: Record<PortionSize, number> = {
  small: 0.6,
  medium: 1,
  large: 1.5,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    calories: round1(per100g.calories * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
    fiber: round1(per100g.fiber * f),
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, m) => ({
      calories: round1(acc.calories + m.calories),
      protein: round1(acc.protein + m.protein),
      carbs: round1(acc.carbs + m.carbs),
      fat: round1(acc.fat + m.fat),
      fiber: round1(acc.fiber + m.fiber),
    }),
    EMPTY_MACROS
  );
}

/** Nearest portion label for a gram weight relative to the default serving. */
export function portionForGrams(grams: number, defaultGrams: number): PortionSize {
  const ratio = grams / Math.max(defaultGrams, 1);
  if (ratio < 0.8) return "small";
  if (ratio > 1.25) return "large";
  return "medium";
}

export type NutritionTargets = Omit<Macros, "fiber"> & {
  fiber: number;
  /** True when computed from the user's body stats rather than defaults. */
  personalised: boolean;
};

// Typical active college student, used until the profile is filled in (Week 4)
const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2200,
  protein: 85,
  carbs: 290,
  fat: 65,
  fiber: 30,
  personalised: false,
};

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Daily targets from Mifflin-St Jeor. The profile has no sex field, so the
 * constant is the midpoint of the male (+5) and female (-161) equations.
 */
export function computeTargets(
  profile: Pick<
    Profile,
    "age" | "height_cm" | "weight_kg" | "activity_level" | "goal"
  >
): NutritionTargets {
  const { age, height_cm, weight_kg } = profile;
  if (!age || !height_cm || !weight_kg) return DEFAULT_TARGETS;

  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 78;
  let calories =
    bmr * (ACTIVITY_FACTORS[profile.activity_level ?? ""] ?? ACTIVITY_FACTORS.moderate);
  if (profile.goal === "lose_weight") calories -= 400;
  if (profile.goal === "gain_muscle") calories += 300;
  calories = Math.round(calories / 10) * 10;

  const proteinPerKg = profile.goal === "gain_muscle" ? 1.6 : 1.0;
  const protein = Math.round(weight_kg * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, fiber: 30, personalised: true };
}
