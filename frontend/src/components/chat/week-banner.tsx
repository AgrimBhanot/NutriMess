import { CalendarDays } from "lucide-react";
import { formatWeekRange } from "@/lib/week";

interface WeekBannerProps {
  bhawanName: string;
  weekStart: string;
  weekEnd: string;
  connection: "connecting" | "live" | "offline";
}

export function WeekBanner({
  bhawanName,
  weekStart,
  weekEnd,
  connection,
}: WeekBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 card-shadow">
      <div>
        <h2 className="text-sm font-semibold text-[#111827]">
          {bhawanName} Mess Community
        </h2>
        <p className="flex items-center gap-1 text-xs text-[#9CA3AF]">
          <CalendarDays className="h-3.5 w-3.5 stroke-[1.5px]" />
          Week of {formatWeekRange(weekStart, weekEnd)} · resets Monday
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
        <span
          className={
            connection === "live"
              ? "h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft"
              : connection === "offline"
                ? "h-2 w-2 rounded-full bg-[#BA5D38]"
                : "h-2 w-2 rounded-full bg-[#D1D5DB]"
          }
        />
        {connection === "live"
          ? "Live"
          : connection === "offline"
            ? "Offline"
            : "Connecting"}
      </span>
    </div>
  );
}
