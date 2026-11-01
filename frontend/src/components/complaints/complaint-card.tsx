import { EyeOff, MessageSquareReply } from "lucide-react";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import type { ComplaintCategory, ComplaintStatus } from "@/types";
import { StatusBadge } from "./status-badge";

interface ComplaintCardProps {
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  isAnonymous: boolean;
  imageUrl?: string | null;
  reporterName?: string | null;
  secretaryResponse: string | null;
  respondedAt: string | null;
  children?: React.ReactNode;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function ComplaintCard({
  category,
  description,
  status,
  createdAt,
  isAnonymous,
  imageUrl,
  reporterName,
  secretaryResponse,
  respondedAt,
  children,
}: ComplaintCardProps) {
  const categoryLabel =
    COMPLAINT_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-[#111827]">
            {categoryLabel}
          </span>
          <p className="flex items-center gap-1 text-xs text-[#9CA3AF]">
            {formatDate(createdAt)}
            {isAnonymous ? (
              <>
                {" · "}
                <EyeOff className="h-3 w-3 stroke-[1.5px]" /> Anonymous
              </>
            ) : (
              reporterName && <> · {reporterName}</>
            )}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="whitespace-pre-wrap text-sm text-[#4B5563]">
        {description}
      </p>

      {imageUrl && (
        <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
          <img
            src={imageUrl}
            alt="Complaint attachment"
            className="max-h-48 rounded-xl border border-[#E5E7EB] object-cover"
          />
        </a>
      )}

      {secretaryResponse && (
        <div className="rounded-xl bg-[#244E3D]/5 p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#244E3D]">
            <MessageSquareReply className="h-3.5 w-3.5 stroke-[1.5px]" />
            Secretary response
            {respondedAt && (
              <span className="font-normal text-[#9CA3AF]">
                · {formatDate(respondedAt)}
              </span>
            )}
          </p>
          <p className="whitespace-pre-wrap text-sm text-[#111827]">
            {secretaryResponse}
          </p>
        </div>
      )}

      {children}
    </div>
  );
}
