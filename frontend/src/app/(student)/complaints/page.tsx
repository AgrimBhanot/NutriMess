import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { BUCKETS, signedImageUrls } from "@/lib/supabase/storage";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import type { Complaint } from "@/types";

export const metadata: Metadata = {
  title: "My Complaints",
};

export default async function ComplaintsPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const { data } = await supabase
    .from("complaints")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  const complaints = (data ?? []) as Complaint[];

  const imageUrls = await signedImageUrls(
    supabase,
    BUCKETS.complaints,
    complaints.flatMap((c) => (c.image_url ? [c.image_url] : []))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">
            My Complaints
          </h2>
          <p className="text-sm text-[#9CA3AF]">
            Sent to the {profile.bhawans?.name} mess secretary
          </p>
        </div>
        <Link
          href="/complaints/new"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#244E3D] px-3 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4 stroke-[1.5px]" />
          New
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BA5D38]/10">
            <AlertCircle className="h-7 w-7 stroke-[1.5px] text-[#BA5D38]" />
          </div>
          <p className="text-sm font-medium text-[#111827]">
            No complaints filed
          </p>
          <p className="mt-1 max-w-xs text-xs text-[#9CA3AF]">
            Something wrong with food quality, hygiene or quantity? Let your
            secretary know.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintCard
              key={c.id}
              category={c.category}
              description={c.description}
              status={c.status}
              createdAt={c.created_at}
              isAnonymous={c.is_anonymous}
              imageUrl={c.image_url ? imageUrls[c.image_url] : null}
              secretaryResponse={c.secretary_response}
              respondedAt={c.responded_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
