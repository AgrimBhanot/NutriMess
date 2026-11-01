"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { COMPLAINT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BhawanComplaint, ComplaintStatus } from "@/types";
import { ComplaintCard } from "./complaint-card";

type Filter = ComplaintStatus | "active" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  ...COMPLAINT_STATUSES,
  { value: "all", label: "All" },
];

interface ComplaintManagerProps {
  complaints: BhawanComplaint[];
  imageUrls: Record<string, string>;
}

export function ComplaintManager({
  complaints,
  imageUrls,
}: ComplaintManagerProps) {
  const [filter, setFilter] = useState<Filter>("active");

  const counts = Object.fromEntries(
    COMPLAINT_STATUSES.map((s) => [
      s.value,
      complaints.filter((c) => c.status === s.value).length,
    ])
  ) as Record<ComplaintStatus, number>;

  const visible = complaints.filter((c) =>
    filter === "all"
      ? true
      : filter === "active"
        ? c.status !== "resolved"
        : c.status === filter
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {COMPLAINT_STATUSES.map((s) => (
          <div
            key={s.value}
            className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center"
          >
            <span className="block text-lg font-semibold tabular-nums text-[#111827]">
              {counts[s.value]}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
              filter === f.value
                ? "border-[#244E3D] bg-[#244E3D]/10 text-[#244E3D]"
                : "border-[#E5E7EB] bg-white text-[#4B5563]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center text-sm text-[#9CA3AF]">
          <Inbox className="mb-2 h-8 w-8 stroke-[1.5px]" />
          Nothing here.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <ComplaintCard
              key={c.id}
              category={c.category}
              description={c.description}
              status={c.status}
              createdAt={c.created_at}
              isAnonymous={c.is_anonymous}
              reporterName={c.reporter_name}
              imageUrl={c.image_url ? imageUrls[c.image_url] : null}
              secretaryResponse={c.secretary_response}
              respondedAt={c.responded_at}
            >
              <ResponsePanel complaint={c} />
            </ComplaintCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponsePanel({ complaint }: { complaint: BhawanComplaint }) {
  const router = useRouter();
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty = status !== complaint.status || response.trim() !== "";

  async function submit() {
    setSaving(true);
    const { error } = await createClient().rpc("respond_to_complaint", {
      p_complaint_id: complaint.id,
      p_status: status,
      p_response: response.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not update: ${error.message}`);
      return;
    }
    setResponse("");
    toast.success("Complaint updated");
    router.refresh();
  }

  return (
    <div className="space-y-2 border-t border-[#E5E7EB] pt-3">
      <div className="flex flex-wrap gap-1.5">
        {COMPLAINT_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              status === s.value
                ? "border-[#244E3D] bg-[#244E3D] text-white"
                : "border-[#E5E7EB] bg-white text-[#4B5563]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value.slice(0, 1000))}
        rows={2}
        placeholder={
          complaint.secretary_response
            ? "Update your response (optional)"
            : "Reply to the student (optional)"
        }
        className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 text-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#244E3D]/40"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!dirty || saving}
        className="flex h-9 w-full items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
      </button>
    </div>
  );
}
