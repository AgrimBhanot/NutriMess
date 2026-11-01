import { connection } from "next/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ComplaintForm } from "@/components/complaints/complaint-form";

export const metadata: Metadata = {
  title: "New Complaint",
};

export default async function NewComplaintPage() {
  await connection();
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <Link
        href="/complaints"
        className="flex w-fit items-center text-sm text-[#9CA3AF] hover:text-[#4B5563]"
      >
        <ChevronLeft className="h-4 w-4 stroke-[1.5px]" />
        My complaints
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">
          File a Complaint
        </h2>
        <p className="text-sm text-[#9CA3AF]">
          Goes to the {profile.bhawans?.name} mess secretary.
        </p>
      </div>
      <ComplaintForm userId={profile.id} bhawanId={profile.bhawan_id} />
    </div>
  );
}
