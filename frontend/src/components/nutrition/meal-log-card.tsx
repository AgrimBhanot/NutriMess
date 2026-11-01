"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MEAL_SCHEDULE } from "@/lib/constants";
import type { MealLogWithItems } from "@/lib/meal-history";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS } from "@/lib/supabase/storage";

export function MealLogCard({ log }: { log: MealLogWithItems }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this meal from your log?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("meal_logs").delete().eq("id", log.id);
    if (error) {
      toast.error(`Could not delete: ${error.message}`);
      setDeleting(false);
      return;
    }
    if (log.image_url) {
      await supabase.storage.from(BUCKETS.plateImages).remove([log.image_url]);
    }
    router.refresh();
  }

  const time = new Date(log.created_at).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
            {MEAL_SCHEDULE[log.meal_type].label}
            {log.image_url && (
              <Camera
                className="h-3.5 w-3.5 stroke-[1.5px] text-[#9CA3AF]"
                aria-label="Logged from a photo"
              />
            )}
          </p>
          <p className="text-xs text-[#9CA3AF]">{time}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-mono text-sm font-semibold tabular-nums text-[#111827]">
              {Math.round(log.total_calories ?? 0)} kcal
            </p>
            <p className="font-mono text-xs tabular-nums text-[#BA5D38]">
              {Math.round(log.total_protein ?? 0)}g protein
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete meal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-red-50 hover:text-red-500"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 stroke-[1.5px]" />
            )}
          </button>
        </div>
      </div>
      {log.meal_log_items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {log.meal_log_items.map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs text-[#4B5563]"
            >
              {item.food_name}
              <span className="ml-1 font-mono tabular-nums text-[#9CA3AF]">
                {Math.round(item.estimated_grams ?? 0)}g
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
