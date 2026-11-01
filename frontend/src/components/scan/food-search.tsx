"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { searchFoods } from "@/lib/api";
import type { FoodRecord } from "@/types";

interface FoodSearchProps {
  onAdd: (food: FoodRecord) => void;
}

export function FoodSearch({ onAdd }: FoodSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchFoods(q, controller.signal));
        setError(null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const showResults = query.trim().length >= 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3">
        <Search className="h-4 w-4 stroke-[1.5px] text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a food (e.g. roti, dal, paneer)"
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9CA3AF]"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />}
      </div>

      {showResults && error && (
        <p className="px-1 text-xs text-red-600">{error}</p>
      )}
      {showResults && !error && results.length > 0 && (
        <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          {results.map((food) => (
            <button
              key={food.name}
              type="button"
              onClick={() => {
                onAdd(food);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#F9FAFB]"
            >
              <span>
                <span className="block text-sm text-[#111827]">{food.name}</span>
                <span className="font-mono text-xs tabular-nums text-[#9CA3AF]">
                  {Math.round(
                    (food.per_100g.calories * food.default_grams) / 100
                  )}{" "}
                  kcal per {food.default_serving_unit ?? "serving"}
                </span>
              </span>
              <Plus className="h-4 w-4 stroke-[1.5px] text-[#244E3D]" />
            </button>
          ))}
        </div>
      )}
      {showResults && !error && !loading && results.length === 0 && (
        <p className="px-1 text-xs text-[#9CA3AF]">No matching foods.</p>
      )}
    </div>
  );
}
