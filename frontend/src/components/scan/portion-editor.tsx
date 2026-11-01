"use client";

import { Minus, Plus, Sparkles, X } from "lucide-react";
import { PORTION_FACTORS, portionForGrams, scaleMacros } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { NutrientLine, PortionSize } from "@/types";

export type PlateItem = NutrientLine & {
  key: string;
  ai_detected: boolean;
  user_corrected: boolean;
};

const PIECE_UNITS = new Set(["piece", "slice", "scoop"]);

/** Step size: one piece for countable foods, else a tenth of a serving. */
function stepFor(item: PlateItem): number {
  if (item.serving_unit && PIECE_UNITS.has(item.serving_unit)) {
    return item.default_grams;
  }
  return Math.max(5, Math.round(item.default_grams / 10 / 5) * 5);
}

function describeAmount(item: PlateItem): string {
  if (item.serving_unit && PIECE_UNITS.has(item.serving_unit)) {
    const count = Math.round((item.grams / item.default_grams) * 10) / 10;
    return `${count} ${item.serving_unit}${count === 1 ? "" : "s"}`;
  }
  return `${Math.round(item.grams)} g`;
}

export function withGrams(item: PlateItem, grams: number): PlateItem {
  const g = Math.max(5, Math.min(2000, Math.round(grams)));
  return {
    ...item,
    grams: g,
    portion: portionForGrams(g, item.default_grams),
    nutrients: scaleMacros(item.per_100g, g),
    user_corrected: true,
  };
}

interface PortionEditorProps {
  item: PlateItem;
  onChange: (item: PlateItem) => void;
  onRemove: () => void;
}

export function PortionEditor({ item, onChange, onRemove }: PortionEditorProps) {
  const step = stepFor(item);

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {item.food_name}
          </p>
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-[#9CA3AF]">
            <span className="font-mono">{Math.round(item.nutrients.calories)} kcal</span>
            <span>·</span>
            <span className="font-mono text-[#BA5D38]">
              {item.nutrients.protein}g protein
            </span>
            {!item.matched && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#BA5D38]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#BA5D38]">
                <Sparkles className="h-3 w-3 stroke-[1.5px]" />
                AI estimate
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.food_name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4 stroke-[1.5px]" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {(Object.keys(PORTION_FACTORS) as PortionSize[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                onChange(withGrams(item, item.default_grams * PORTION_FACTORS[p]))
              }
              className={cn(
                "h-8 rounded-lg border px-2.5 text-xs font-medium capitalize",
                item.portion === p
                  ? "border-[#244E3D] bg-[#244E3D] text-white"
                  : "border-[#E5E7EB] bg-white text-[#4B5563]"
              )}
            >
              {p[0].toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#E5E7EB] p-0.5">
          <button
            type="button"
            onClick={() => onChange(withGrams(item, item.grams - step))}
            disabled={item.grams <= step}
            aria-label="Less"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-30"
          >
            <Minus className="h-4 w-4 stroke-[1.5px]" />
          </button>
          <span className="min-w-[64px] text-center font-mono text-xs tabular-nums text-[#111827]">
            {describeAmount(item)}
          </span>
          <button
            type="button"
            onClick={() => onChange(withGrams(item, item.grams + step))}
            aria-label="More"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            <Plus className="h-4 w-4 stroke-[1.5px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
