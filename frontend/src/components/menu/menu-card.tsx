import { MEAL_SCHEDULE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types";

interface MenuCardProps {
  meal: MealType;
  items: string[];
  state?: "past" | "current" | "upcoming";
}

export function MenuCard({ meal, items, state = "upcoming" }: MenuCardProps) {
  const schedule = MEAL_SCHEDULE[meal];
  const isCurrent = state === "current";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-4 card-shadow",
        isCurrent ? "border-[#244E3D]/20" : "border-[#E5E7EB]",
        state === "past" && "opacity-60"
      )}
    >
      {isCurrent && (
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#244E3D]" />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">
            {schedule.label}
          </span>
          {isCurrent && (
            <span className="rounded-full bg-[#244E3D]/10 px-2 py-0.5 text-xs font-medium text-[#244E3D]">
              Serving now
            </span>
          )}
          {state === "past" && (
            <span className="text-xs text-[#9CA3AF]">Completed</span>
          )}
        </div>
        <span className="text-xs tabular-nums text-[#9CA3AF]">
          {schedule.startTime} – {schedule.endTime}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#4B5563]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#9CA3AF]">Not on the menu</p>
      )}
    </div>
  );
}
