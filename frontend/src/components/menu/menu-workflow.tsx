"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, publicImageUrl, uploadImage } from "@/lib/supabase/storage";
import { ApiError, extractMenu } from "@/lib/api";
import { emptyGrid, gridToItems, groupMenuItems, type MenuGrid } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { MenuItem, MenuStatus } from "@/types";
import { MenuEditor } from "./menu-editor";
import { MenuUploader } from "./menu-uploader";

export type WeekOption = { start: string; end: string; label: string };

interface MenuWorkflowProps {
  bhawanId: string;
  userId: string;
  weeks: WeekOption[];
}

type Stage = "loading" | "upload" | "edit";

export function MenuWorkflow({ bhawanId, userId, weeks }: MenuWorkflowProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [week, setWeek] = useState<WeekOption>(weeks[0]);
  const [stage, setStage] = useState<Stage>("loading");
  const [grid, setGrid] = useState<MenuGrid>(emptyGrid);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<MenuStatus | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  const loadWeek = useCallback(
    async (target: WeekOption) => {
      setStage("loading");
      setWarnings([]);
      const { data: menu } = await supabase
        .from("menus")
        .select("id, image_url, status")
        .eq("bhawan_id", bhawanId)
        .eq("week_start", target.start)
        .maybeSingle();

      if (!menu) {
        setGrid(emptyGrid());
        setImageUrl(null);
        setStatus(null);
        setStage("upload");
        return;
      }

      const { data: items } = await supabase
        .from("menu_items")
        .select("day, meal, item_name, item_order")
        .eq("menu_id", menu.id);
      setGrid(groupMenuItems((items ?? []) as MenuItem[]));
      setImageUrl(menu.image_url);
      setStatus(menu.status as MenuStatus);
      setStage("edit");
    },
    [supabase, bhawanId]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load on week change
    loadWeek(week);
  }, [loadWeek, week]);

  async function uploadMenuImage(file: File): Promise<string | null> {
    try {
      const path = await uploadImage(supabase, BUCKETS.menuImages, bhawanId, file);
      return publicImageUrl(supabase, BUCKETS.menuImages, path);
    } catch (err) {
      console.warn("Menu image upload failed:", err);
      toast.warning("Couldn't store the image, but you can still save the menu.");
      return null;
    }
  }

  async function handleExtract(file: File) {
    setExtracting(true);
    try {
      const [{ data: sessionData }, url] = await Promise.all([
        supabase.auth.getSession(),
        uploadMenuImage(file),
      ]);
      if (url) setImageUrl(url);
      const token = sessionData.session?.access_token;
      if (!token) throw new ApiError("Your session expired. Please sign in again.", 401);

      const result = await extractMenu(file, token);
      setGrid(groupMenuItems(result.items));
      setWarnings(result.warnings);
      toast.success(`Extracted ${result.items.length} items. Review before publishing.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      toast.error(`AI extraction failed: ${message}. You can enter the menu manually.`);
      setGrid(emptyGrid());
    } finally {
      setExtracting(false);
      setStage("edit");
    }
  }

  async function handleManual(file: File | null) {
    if (file) {
      setExtracting(true);
      const url = await uploadMenuImage(file);
      if (url) setImageUrl(url);
      setExtracting(false);
    }
    setStage("edit");
  }

  async function save(publish: boolean) {
    const items = gridToItems(grid);
    if (publish && items.length === 0) {
      toast.error("Add at least one item before publishing.");
      return;
    }

    setSaving(publish ? "publish" : "draft");
    try {
      // status is left out so re-saving a published menu doesn't unpublish it
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .upsert(
          {
            bhawan_id: bhawanId,
            week_start: week.start,
            week_end: week.end,
            image_url: imageUrl,
            uploaded_by: userId,
          },
          { onConflict: "bhawan_id,week_start" }
        )
        .select("id, status")
        .single();
      if (menuError) throw menuError;

      const { error: itemsError } = await supabase.rpc("save_menu_items", {
        p_menu_id: menu.id,
        p_items: items,
      });
      if (itemsError) throw itemsError;

      if (publish) {
        const { error: publishError } = await supabase.rpc("publish_menu", {
          p_menu_id: menu.id,
        });
        if (publishError) throw publishError;
        setStatus("published");
        toast.success("Menu published. Students can see it now.");
      } else {
        setStatus(menu.status as MenuStatus);
        toast.success(
          menu.status === "published" ? "Changes saved and live." : "Draft saved."
        );
      }
      router.refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Unknown error";
      toast.error(`Could not save menu: ${message}`);
    } finally {
      setSaving(null);
    }
  }

  const itemCount = gridToItems(grid).length;

  return (
    <div className="space-y-4">
      {/* Week picker */}
      <div className="grid grid-cols-2 gap-2">
        {weeks.map((option) => (
          <button
            key={option.start}
            type="button"
            onClick={() => setWeek(option)}
            disabled={extracting || saving !== null}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition-colors",
              option.start === week.start
                ? "border-[#244E3D] bg-[#244E3D]/5"
                : "border-[#E5E7EB] bg-white"
            )}
          >
            <span className="block text-xs font-semibold text-[#111827]">
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {status && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
            status === "published"
              ? "bg-[#244E3D]/10 text-[#244E3D]"
              : "bg-[#F3F4F6] text-[#4B5563]"
          )}
        >
          <CheckCircle2 className="h-4 w-4 stroke-[1.5px]" />
          {status === "published"
            ? "Published — visible to students"
            : "Draft — not visible to students yet"}
        </div>
      )}

      {stage === "loading" && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
        </div>
      )}

      {stage === "upload" && (
        <MenuUploader
          busy={extracting}
          onExtract={handleExtract}
          onManual={handleManual}
        />
      )}

      {stage === "edit" && (
        <>
          {warnings.length > 0 && (
            <div className="space-y-1 rounded-xl border border-[#BA5D38]/20 bg-[#BA5D38]/5 p-3 text-xs text-[#BA5D38]">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 stroke-[1.5px]" />
                Check these before publishing
              </p>
              <ul className="list-disc pl-5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-[#9CA3AF]">
              {itemCount} items this week
            </span>
            <button
              type="button"
              onClick={() => setStage("upload")}
              className="flex items-center gap-1 text-xs font-medium text-[#244E3D]"
            >
              <ImageUp className="h-3.5 w-3.5 stroke-[1.5px]" />
              {imageUrl ? "Upload a new photo" : "Add a photo"}
            </button>
          </div>

          <MenuEditor grid={grid} onChange={setGrid} />

          <div className="sticky bottom-20 flex gap-3 rounded-2xl border border-[#E5E7EB] bg-white/95 p-3 backdrop-blur card-shadow">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving !== null}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#4B5563] disabled:opacity-50"
            >
              {saving === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save draft"
              )}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving !== null || itemCount === 0}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
            >
              {saving === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === "published" ? (
                "Republish"
              ) : (
                "Publish"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
