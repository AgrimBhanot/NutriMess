import { connection } from "next/server";
import { UtensilsCrossed, Info } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPublishedMenu } from "@/lib/menu";
import {
  dayOfWeek,
  formatShortDate,
  formatWeekRange,
  istMinutesNow,
  istToday,
  weekDates,
  weekMonday,
} from "@/lib/week";
import { WeeklyMenu } from "@/components/menu/weekly-menu";

export const metadata: Metadata = {
  title: "Weekly Menu",
};

export default async function MenuPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const today = istToday();
  const monday = weekMonday(today);
  const published = await getPublishedMenu(
    supabase,
    profile.bhawan_id,
    monday
  );

  if (!published) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4B5563]/10">
          <UtensilsCrossed className="h-8 w-8 stroke-[1.5px] text-[#4B5563]" />
        </div>
        <h2 className="text-lg font-semibold text-[#111827]">
          No menu published yet
        </h2>
        <p className="mt-1 max-w-xs text-sm text-[#9CA3AF]">
          Your mess secretary hasn&apos;t published this week&apos;s menu.
          Check back soon.
        </p>
      </div>
    );
  }

  const days = weekDates(monday).map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Weekly Menu</h2>
        <p className="text-sm text-[#9CA3AF]">
          {profile.bhawans?.name} · {formatWeekRange(monday, days[6].date)}
        </p>
      </div>

      {published.isFallback && (
        <div className="flex items-start gap-2 rounded-xl border border-[#BA5D38]/20 bg-[#BA5D38]/5 p-3 text-xs text-[#BA5D38]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.5px]" />
          <span>
            This week&apos;s menu isn&apos;t up yet. Showing the menu from the
            week of {formatShortDate(published.menu.week_start)}.
          </span>
        </div>
      )}

      <WeeklyMenu
        grid={published.grid}
        days={days}
        today={dayOfWeek(today)}
        nowMinutes={istMinutesNow()}
      />
    </div>
  );
}
