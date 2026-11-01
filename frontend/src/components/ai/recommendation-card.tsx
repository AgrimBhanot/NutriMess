"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { getRecommendations } from "@/lib/api";
import { MEAL_SCHEDULE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Recommendations } from "@/types";

/** Rule-based picks for the next meal; hides itself if unavailable. */
export function RecommendationCard() {
  const [data, setData] = useState<Recommendations | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data: auth } = await createClient().auth.getSession();
        const token = auth.session?.access_token;
        if (!token) return setState("hidden");
        const res = await getRecommendations(token, controller.signal);
        setData(res);
        setState(res.menu_available && res.suggestions.length ? "ready" : "hidden");
      } catch {
        if (!controller.signal.aborted) setState("hidden");
      }
    })();
    return () => controller.abort();
  }, []);

  if (state === "hidden") return null;
  if (state === "loading" || !data) {
    return <div className="h-32 animate-pulse rounded-2xl bg-[#F3F4F6]" />;
  }

  const picks = data.suggestions.filter((s) => s.kind === "recommended");
  const limits = data.suggestions.filter((s) => s.kind === "limit");

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 stroke-[1.5px] text-[#244E3D]" />
        <h3 className="text-sm font-semibold text-[#111827]">
          Suggested for {data.day === "today" ? "" : "tomorrow's "}
          {MEAL_SCHEDULE[data.meal].label.toLowerCase()}
        </h3>
      </div>

      <ul className="space-y-2">
        {picks.map((s) => (
          <li key={s.food_name} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111827]">{s.food_name}</p>
              <p className="text-xs text-[#9CA3AF]">{s.reason}</p>
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums text-[#BA5D38]">
              {Math.round(s.nutrients.protein)}g protein
            </span>
          </li>
        ))}
      </ul>

      {limits.length > 0 && (
        <p className="text-xs text-[#4B5563]">
          <span className="font-medium">Go easy on:</span>{" "}
          {limits.map((l) => l.food_name).join(", ")}
        </p>
      )}

      <Link
        href="/ai-chat"
        className="flex items-center justify-between rounded-xl bg-[#244E3D]/5 px-3 py-2.5 text-xs font-medium text-[#244E3D]"
      >
        Ask the assistant why, or for alternatives
        <ChevronRight className="h-4 w-4 stroke-[1.5px]" />
      </Link>
    </div>
  );
}
