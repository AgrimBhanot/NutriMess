import { connection } from "next/server";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { addDays, formatWeekRange, istToday, weekMonday } from "@/lib/week";
import { MenuWorkflow, type WeekOption } from "@/components/menu/menu-workflow";

export const metadata: Metadata = {
  title: "Upload Menu",
};

export default async function MenuUploadPage() {
  await connection();
  const { profile } = await getCurrentProfile();

  const thisMonday = weekMonday(istToday());
  const weeks: WeekOption[] = [0, 7].map((offset) => {
    const start = addDays(thisMonday, offset);
    const end = addDays(start, 6);
    return {
      start,
      end,
      label: `${offset === 0 ? "This week" : "Next week"} · ${formatWeekRange(start, end)}`,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Weekly Menu</h2>
        <p className="text-sm text-[#9CA3AF]">
          Upload a photo, let AI read it, fix anything it got wrong, then
          publish. Publishing this week&apos;s menu starts a fresh weekly chat.
        </p>
      </div>
      <MenuWorkflow bhawanId={profile.bhawan_id} userId={profile.id} weeks={weeks} />
    </div>
  );
}
