"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface MiniBarChartProps {
  title: string;
  unit: string;
  data: { label: string; shortLabel: string; value: number }[];
}

const HEIGHT = 72;

/** Single-series column chart with a hover/tap readout and a table for screen readers. */
export function MiniBarChart({ title, unit, data }: MiniBarChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  const shown = active !== null ? data[active] : null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        <p className="text-xs tabular-nums text-[#4B5563]" aria-live="polite">
          {shown ? (
            <>
              {shown.label}:{" "}
              <span className="font-mono font-semibold text-[#111827]">{shown.value}</span> {unit}
            </>
          ) : (
            <>
              <span className="font-mono font-semibold text-[#111827]">{total}</span> {unit} total
            </>
          )}
        </p>
      </div>

      <div
        className="grid items-end gap-[2px] border-b border-[#E5E7EB]"
        style={{ height: HEIGHT, gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(i)}
            className="flex h-full items-end justify-center"
          >
            {d.value > 0 && (
              <span
                className={cn(
                  "block w-full max-w-6 rounded-t-[4px] bg-[#244E3D] transition-opacity",
                  active !== null && active !== i && "opacity-40"
                )}
                style={{ height: Math.max(2, (d.value / max) * HEIGHT) }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#9CA3AF]">
        <span>{data[0]?.shortLabel}</span>
        <span>{data.at(-1)?.shortLabel}</span>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
