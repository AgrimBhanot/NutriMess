import type { SupabaseClient } from "@supabase/supabase-js";
import { sumMacros } from "@/lib/nutrition";
import { BUCKETS, uploadImage } from "@/lib/supabase/storage";
import type { AnalysisConfidence, MealType, NutrientLine, PlateAnalysis } from "@/types";

export interface SaveMealInput {
  userId: string;
  bhawanId: string;
  mealType: MealType;
  mealDate: string;
  photo: File | null;
  items: (NutrientLine & { ai_detected: boolean; user_corrected: boolean })[];
  analysis: PlateAnalysis | null;
}

/**
 * Store a confirmed meal: plate photo (best effort), the meal_logs row with
 * totals, then its items. Removes the log again if the items insert fails.
 */
export async function saveMealLog(
  supabase: SupabaseClient,
  input: SaveMealInput
): Promise<{ id: string; photoSaved: boolean }> {
  let imagePath: string | null = null;
  if (input.photo) {
    try {
      imagePath = await uploadImage(
        supabase,
        BUCKETS.plateImages,
        input.userId,
        input.photo
      );
    } catch (err) {
      // The meal matters more than the photo; save it without one
      console.warn("Plate photo upload failed, saving meal without it:", err);
    }
  }

  const totals = sumMacros(input.items.map((i) => i.nutrients));
  const confidence: AnalysisConfidence | null = input.analysis
    ? input.items.some((i) => i.user_corrected)
      ? "high" // user-confirmed corrections
      : input.analysis.confidence
    : null;

  const { data: log, error: logError } = await supabase
    .from("meal_logs")
    .insert({
      user_id: input.userId,
      bhawan_id: input.bhawanId,
      meal_type: input.mealType,
      meal_date: input.mealDate,
      image_url: imagePath,
      ai_raw_response: input.analysis,
      user_confirmed: true,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
      total_fiber: totals.fiber,
      confidence,
    })
    .select("id")
    .single();
  if (logError) throw logError;

  const { error: itemsError } = await supabase.from("meal_log_items").insert(
    input.items.map((item) => ({
      meal_log_id: log.id,
      food_name: item.food_name,
      food_id: item.food_id,
      portion: item.portion,
      estimated_grams: item.grams,
      calories: item.nutrients.calories,
      protein: item.nutrients.protein,
      carbs: item.nutrients.carbs,
      fat: item.nutrients.fat,
      fiber: item.nutrients.fiber,
      ai_detected: item.ai_detected,
      user_corrected: item.user_corrected,
    }))
  );
  if (itemsError) {
    await supabase.from("meal_logs").delete().eq("id", log.id);
    throw itemsError;
  }

  return { id: log.id as string, photoSaved: !input.photo || imagePath !== null };
}
