import { connection } from "next/server";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { suggestedMeal } from "@/lib/meal-time";
import { istMinutesNow, istToday } from "@/lib/week";
import { ScanFlow } from "@/components/scan/scan-flow";

export const metadata: Metadata = {
  title: "Scan Plate",
};

export default async function ScanPage() {
  await connection();
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Scan Your Plate</h2>
        <p className="text-sm text-[#9CA3AF]">
          Snap your thali to estimate its nutrition, then fix anything we got
          wrong.
        </p>
      </div>
      <ScanFlow
        userId={profile.id}
        bhawanId={profile.bhawan_id}
        defaultMeal={suggestedMeal(istMinutesNow())}
        mealDate={istToday()}
      />
    </div>
  );
}
