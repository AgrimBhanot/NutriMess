// ============================================
// User & Profile types
// ============================================

export type UserRole = "student" | "secretary" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  bhawan_id: string;
  avatar_url: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
  diet_preference: string | null;
  allergies: string[] | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Bhawan types
// ============================================

export interface Bhawan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

// ============================================
// Menu types
// ============================================

export type MenuStatus = "draft" | "published" | "archived";
export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Menu {
  id: string;
  bhawan_id: string;
  week_start: string;
  week_end: string;
  image_url: string | null;
  status: MenuStatus;
  uploaded_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  day: DayOfWeek;
  meal: MealType;
  item_name: string;
  item_order: number;
  food_id: string | null;
  created_at: string;
}

// ============================================
// Chat types
// ============================================

export interface ChatWeek {
  id: string;
  bhawan_id: string;
  week_start: string;
  week_end: string;
  menu_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_week_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to: string | null;
  created_at: string;
  // Denormalised by a DB trigger on insert
  author_name: string | null;
  author_role: UserRole | null;
}

// ============================================
// Nutrition types
// ============================================

export interface FoodItem {
  id: string;
  name: string;
  name_hindi: string | null;
  category: string | null;
  default_serving_unit: string | null;
  default_grams: number | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  iron_per_100g: number | null;
  calcium_per_100g: number | null;
  source: string | null;
  is_mess_specific: boolean;
}

export type PortionSize = "small" | "medium" | "large";

export interface MealLog {
  id: string;
  user_id: string;
  bhawan_id: string;
  meal_type: MealType;
  meal_date: string;
  image_url: string | null;
  user_confirmed: boolean;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  total_fiber: number | null;
  confidence: string | null;
  created_at: string;
}

export interface MealLogItem {
  id: string;
  meal_log_id: string;
  food_name: string;
  food_id: string | null;
  portion: PortionSize;
  estimated_grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  ai_detected: boolean;
  user_corrected: boolean;
}

// ============================================
// Complaint types
// ============================================

export type ComplaintStatus = "open" | "acknowledged" | "in_progress" | "resolved";
export type ComplaintCategory =
  | "food_quality"
  | "hygiene"
  | "quantity"
  | "menu"
  | "other";

export interface Complaint {
  id: string;
  bhawan_id: string;
  user_id: string;
  category: ComplaintCategory;
  description: string;
  image_url: string | null;
  is_anonymous: boolean;
  status: ComplaintStatus;
  secretary_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row returned by the `get_bhawan_complaints` RPC (secretary view). */
export interface BhawanComplaint {
  id: string;
  category: ComplaintCategory;
  description: string;
  image_url: string | null;
  is_anonymous: boolean;
  status: ComplaintStatus;
  secretary_response: string | null;
  responded_at: string | null;
  created_at: string;
  reporter_name: string | null;
}

// ============================================
// Menu extraction (FastAPI)
// ============================================

export interface EditableMenuItem {
  day: DayOfWeek;
  meal: MealType;
  item_name: string;
  item_order: number;
}

export interface MenuExtraction {
  items: EditableMenuItem[];
  warnings: string[];
  model: string;
}

// ============================================
// Daily nutrition summary (computed)
// ============================================

export interface DailyNutritionSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  meal_count: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
}

// ============================================
// Plate analysis (FastAPI)
// ============================================

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface NutrientLine {
  food_name: string;
  food_id: string | null;
  matched: boolean;
  /** Food database source, or "ai_estimate" when the dish wasn't found */
  source: string;
  portion: PortionSize;
  grams: number;
  default_grams: number;
  serving_unit: string | null;
  per_100g: Macros;
  nutrients: Macros;
  confidence: number;
}

export type AnalysisConfidence = "low" | "moderate" | "high";

export interface PlateAnalysis {
  is_food: boolean;
  items: NutrientLine[];
  totals: Macros;
  confidence: AnalysisConfidence;
  notes: string[];
  model: string;
}

export interface FoodRecord {
  id: string | null;
  name: string;
  category: string | null;
  default_serving_unit: string | null;
  default_grams: number;
  per_100g: Macros;
  source: string | null;
}
