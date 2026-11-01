"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { MEAL_SCHEDULE, MEAL_TYPES } from "@/lib/constants";
import { scaleMacros, sumMacros } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { AnalysisConfidence, FoodRecord, MealType } from "@/types";
import { FoodSearch } from "./food-search";
import { PortionEditor, type PlateItem } from "./portion-editor";

const CONFIDENCE_STYLE: Record<AnalysisConfidence, string> = {
  high: "bg-[#244E3D]/10 text-[#244E3D]",
  moderate: "bg-amber-50 text-amber-700",
  low: "bg-[#BA5D38]/10 text-[#BA5D38]",
};

export function itemFromFood(food: FoodRecord): PlateItem {
  return {
    key: crypto.randomUUID(),
    food_name: food.name,
    food_id: food.id,
    matched: true,
    source: food.source ?? "custom",
    portion: "medium",
    grams: food.default_grams,
    default_grams: food.default_grams,
    serving_unit: food.default_serving_unit,
    per_100g: food.per_100g,
    nutrients: scaleMacros(food.per_100g, food.default_grams),
    confidence: 1,
    ai_detected: false,
    user_corrected: true,
  };
}

interface PlateResultProps {
  photoUrl: string | null;
  items: PlateItem[];
  onItemsChange: (items: PlateItem[]) => void;
  confidence: AnalysisConfidence | null;
  notes: string[];
  mealType: MealType;
  onMealTypeChange: (meal: MealType) => void;
  saving: boolean;
  onSave: () => void;
  onRetake: () => void;
}

export function PlateResult({
  photoUrl,
  items,
  onItemsChange,
  confidence,
  notes,
  mealType,
  onMealTypeChange,
  saving,
  onSave,
  onRetake,
}: PlateResultProps) {
  const totals = sumMacros(items.map((i) => i.nutrients));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={photoUrl}
            alt="Your plate"
            className="h-24 w-24 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xl font-semibold tabular-nums text-[#111827]">
              {Math.round(totals.calories)}
              <span className="ml-1 text-sm font-medium text-[#9CA3AF]">kcal</span>
            </span>
            {confidence && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                  CONFIDENCE_STYLE[confidence]
                )}
              >
                {confidence} confidence
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs tabular-nums">
            <span className="rounded-full bg-[#BA5D38]/10 px-2 py-0.5 text-[#BA5D38]">
              {Math.round(totals.protein)}g protein
            </span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#4B5563]">
              {Math.round(totals.carbs)}g carbs
            </span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#4B5563]">
              {Math.round(totals.fat)}g fat
            </span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#4B5563]">
              {Math.round(totals.fiber)}g fiber
            </span>
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 stroke-[1.5px]" />
            Please check
          </p>
          <ul className="list-disc pl-5">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#111827]">Meal</p>
        <div className="flex gap-2">
          {MEAL_TYPES.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => onMealTypeChange(meal)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-xs font-medium",
                mealType === meal
                  ? "border-[#244E3D] bg-[#244E3D]/10 text-[#244E3D]"
                  : "border-[#E5E7EB] bg-white text-[#4B5563]"
              )}
            >
              {MEAL_SCHEDULE[meal].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#111827]">
          {items.length > 0 ? "What's on your plate" : "Add what you ate"}
        </p>
        {items.map((item) => (
          <PortionEditor
            key={item.key}
            item={item}
            onChange={(next) =>
              onItemsChange(items.map((i) => (i.key === item.key ? next : i)))
            }
            onRemove={() =>
              onItemsChange(items.filter((i) => i.key !== item.key))
            }
          />
        ))}
        <FoodSearch
          onAdd={(food) => onItemsChange([...items, itemFromFood(food)])}
        />
      </div>

      <div className="sticky bottom-20 flex gap-3 rounded-2xl border border-[#E5E7EB] bg-white/95 p-3 backdrop-blur card-shadow">
        <button
          type="button"
          onClick={onRetake}
          disabled={saving}
          className="h-11 rounded-xl border border-[#E5E7EB] px-4 text-sm font-medium text-[#4B5563] disabled:opacity-50"
        >
          Retake
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || items.length === 0}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Log to Daily Nutrition"
          )}
        </button>
      </div>
    </div>
  );
}
