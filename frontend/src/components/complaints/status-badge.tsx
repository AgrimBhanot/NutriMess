import { COMPLAINT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/types";

const STYLES: Record<ComplaintStatus, string> = {
  open: "bg-[#BA5D38]/10 text-[#BA5D38]",
  acknowledged: "bg-[#4B5563]/10 text-[#4B5563]",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-[#244E3D]/10 text-[#244E3D]",
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const label =
    COMPLAINT_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {label}
    </span>
  );
}
