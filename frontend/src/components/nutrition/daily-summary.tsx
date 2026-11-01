import type { NutritionTargets } from "@/lib/nutrition";
import type { Macros } from "@/types";

interface DailySummaryProps {
  totals: Macros;
  targets: NutritionTargets;
}

const MACROS = [
  { key: "protein", label: "Protein", color: "#BA5D38" },
  { key: "carbs", label: "Carbs", color: "#244E3D" },
  { key: "fat", label: "Fats", color: "#4B5563" },
  { key: "fiber", label: "Fiber", color: "#9CA3AF" },
] as const;

function pct(value: number, target: number): number {
  return target > 0 ? Math.min(100, (value / target) * 100) : 0;
}

export function DailySummary({ totals, targets }: DailySummaryProps) {
  const remaining = Math.round(targets.calories - totals.calories);

  return (
    <div className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[#9CA3AF]">Calories today</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-[#111827]">
            {Math.round(totals.calories).toLocaleString("en-IN")}
            <span className="text-sm font-medium text-[#9CA3AF]">
              {" "}
              / {targets.calories.toLocaleString("en-IN")} kcal
            </span>
          </p>
        </div>
        <p className="text-right text-xs tabular-nums text-[#4B5563]">
          {remaining >= 0
            ? `${remaining.toLocaleString("en-IN")} left`
            : `${Math.abs(remaining).toLocaleString("en-IN")} over`}
        </p>
      </div>

      <div className="h-1.5 w-full rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[#244E3D]"
          style={{ width: `${pct(totals.calories, targets.calories)}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {MACROS.map((m) => (
          <div key={m.key}>
            <p className="text-xs text-[#9CA3AF]">{m.label}</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-[#111827]">
              {Math.round(totals[m.key])}
              <span className="text-xs font-medium text-[#9CA3AF]">
                /{targets[m.key]}g
              </span>
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct(totals[m.key], targets[m.key])}%`,
                  backgroundColor: m.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {!targets.personalised && (
        <p className="text-xs text-[#9CA3AF]">
          Default targets. Add your age, height and weight in your profile to
          personalise them.
        </p>
      )}
    </div>
  );
}
