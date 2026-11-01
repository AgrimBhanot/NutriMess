import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "Edit Profile",
};

export default async function EditProfilePage() {
  await connection();
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <Link
        href="/profile"
        className="flex w-fit items-center text-sm text-[#9CA3AF] hover:text-[#4B5563]"
      >
        <ChevronLeft className="h-4 w-4 stroke-[1.5px]" />
        Profile
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Nutrition Profile</h2>
        <p className="text-sm text-[#9CA3AF]">
          Used to personalise your daily targets and AI recommendations.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
