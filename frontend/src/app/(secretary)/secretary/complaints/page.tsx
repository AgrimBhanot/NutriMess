import { connection } from "next/server";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { BUCKETS, signedImageUrls } from "@/lib/supabase/storage";
import { ComplaintManager } from "@/components/complaints/complaint-manager";
import type { BhawanComplaint } from "@/types";

export const metadata: Metadata = {
  title: "Complaints",
};

export default async function SecretaryComplaintsPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  // RPC hides reporter identity on anonymous complaints
  const { data, error } = await supabase.rpc("get_bhawan_complaints");
  const complaints = (data ?? []) as BhawanComplaint[];

  const imageUrls = await signedImageUrls(
    supabase,
    BUCKETS.complaints,
    complaints.flatMap((c) => (c.image_url ? [c.image_url] : []))
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Complaints</h2>
        <p className="text-sm text-[#9CA3AF]">
          From {profile.bhawans?.name} students
        </p>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          Could not load complaints: {error.message}
        </p>
      ) : (
        <ComplaintManager complaints={complaints} imageUrls={imageUrls} />
      )}
    </div>
  );
}
