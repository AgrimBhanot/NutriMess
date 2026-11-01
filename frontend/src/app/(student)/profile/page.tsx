import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, LayoutDashboard } from "lucide-react";
import {
  ACTIVITY_LEVELS,
  DIET_PREFERENCES,
  GOALS,
} from "@/lib/constants";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { SignOutButton } from "@/components/layout/sign-out-button";

export const metadata: Metadata = {
  title: "Profile",
};

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null
): string {
  return options.find((o) => o.value === value)?.label ?? "Not set";
}

export default async function ProfilePage() {
  await connection();
  const { profile } = await getCurrentProfile();
  const isSecretary = profile.role === "secretary" || profile.role === "admin";

  const details = [
    { label: "Diet", value: labelFor(DIET_PREFERENCES, profile.diet_preference) },
    { label: "Goal", value: labelFor(GOALS, profile.goal) },
    { label: "Activity", value: labelFor(ACTIVITY_LEVELS, profile.activity_level) },
    { label: "Age", value: profile.age ? `${profile.age} yrs` : "Not set" },
    { label: "Height", value: profile.height_cm ? `${profile.height_cm} cm` : "Not set" },
    { label: "Weight", value: profile.weight_kg ? `${profile.weight_kg} kg` : "Not set" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#244E3D] text-lg font-semibold text-white">
          {profile.full_name.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[#111827]">
            {profile.full_name}
          </h2>
          <p className="truncate text-sm text-[#9CA3AF]">{profile.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium capitalize text-[#4B5563]">
              {profile.role}
            </span>
            {isSecretary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#BA5D38]/10 px-2 py-0.5 text-xs font-medium text-[#BA5D38]">
                <BadgeCheck className="h-3 w-3 stroke-[1.5px]" />
                Verified Secretary
              </span>
            )}
          </div>
        </div>
      </div>

      {isSecretary && (
        <Link
          href="/secretary/dashboard"
          className="flex items-center gap-3 rounded-2xl border border-[#244E3D]/20 bg-[#244E3D]/5 p-4"
        >
          <LayoutDashboard className="h-5 w-5 stroke-[1.5px] text-[#244E3D]" />
          <span className="flex-1 text-sm font-medium text-[#244E3D]">
            Go to Secretary Portal
          </span>
          <ChevronRight className="h-4 w-4 stroke-[1.5px] text-[#244E3D]" />
        </Link>
      )}

      {/* Bhawan info */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <h3 className="mb-3 text-sm font-semibold text-[#111827]">My Bhawan</h3>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-semibold text-white">
            {profile.bhawans?.code}
          </div>
          <div>
            <p className="text-sm font-medium text-[#111827]">
              {profile.bhawans?.name}
            </p>
            {profile.bhawans?.description && (
              <p className="text-xs text-[#9CA3AF]">
                {profile.bhawans.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Nutrition profile */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <h3 className="mb-3 text-sm font-semibold text-[#111827]">
          Nutrition Profile
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {details.map((d) => (
            <div key={d.label}>
              <span className="text-xs text-[#9CA3AF]">{d.label}</span>
              <p className="font-medium tabular-nums text-[#4B5563]">
                {d.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <SignOutButton />
    </div>
  );
}
