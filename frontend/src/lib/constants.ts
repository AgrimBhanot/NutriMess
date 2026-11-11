// ============================================
// Bhawan constants
// ============================================

export const BHAWANS = [
  { code: "VB", name: "Vivekanand Bhawan", shortName: "Vivekanand" },
  { code: "RB", name: "Rajiv Bhawan", shortName: "Rajiv" },
  { code: "GB", name: "Govind Bhawan", shortName: "Govind" },
  { code: "JB", name: "Jawahar Bhawan", shortName: "Jawahar" },
  { code: "HB", name: "Himalaya Bhawan", shortName: "Himalaya" },
] as const;

export type BhawanCode = (typeof BHAWANS)[number]["code"];

// ============================================
// Meal types & schedule
// ============================================

export const MEAL_TYPES = ["breakfast", "lunch", "snacks", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_SCHEDULE: Record<
  MealType,
  { label: string; startTime: string; endTime: string }
> = {
  breakfast: { label: "Breakfast", startTime: "07:30", endTime: "09:30" },
  lunch: { label: "Lunch", startTime: "12:15", endTime: "14:15" },
  snacks: { label: "Snacks", startTime: "16:30", endTime: "18:00" },
  dinner: { label: "Dinner", startTime: "19:30", endTime: "21:30" },
};

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ============================================
// Diet preferences
// ============================================

export const DIET_PREFERENCES = [
  { value: "veg", label: "Vegetarian" },
  { value: "non_veg", label: "Non-Vegetarian" },
  { value: "egg", label: "Eggetarian" },
] as const;

// ============================================
// Activity levels
// ============================================

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "moderate", label: "Moderately Active" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very Active" },
] as const;

// ============================================
// Goals
// ============================================

export const GOALS = [
  { value: "maintain", label: "Maintain Weight" },
  { value: "lose_weight", label: "Lose Weight" },
  { value: "gain_muscle", label: "Gain Muscle" },
  { value: "balanced", label: "Balanced Nutrition" },
] as const;

// ============================================
// API
// ============================================

/**
 * Backend base URL. Tolerates a value saved without a scheme or with a
 * trailing slash: "host.azurewebsites.net" would otherwise be treated as a
 * relative path and every API call would hit the frontend itself.
 */
export function normalizeApiUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return "http://localhost:8000";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

// ============================================
// Complaints
// ============================================

export const COMPLAINT_CATEGORIES = [
  { value: "food_quality", label: "Food Quality" },
  { value: "hygiene", label: "Hygiene" },
  { value: "quantity", label: "Quantity" },
  { value: "menu", label: "Menu" },
  { value: "other", label: "Other" },
] as const;

export const COMPLAINT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
] as const;
