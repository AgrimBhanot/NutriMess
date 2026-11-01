"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { analyzePlate } from "@/lib/api";
import { downscaleImage } from "@/lib/image";
import { saveMealLog } from "@/lib/meal-log";
import { createClient } from "@/lib/supabase/client";
import type { MealType, PlateAnalysis } from "@/types";
import { CameraView } from "./camera-view";
import { PlateResult } from "./plate-result";
import type { PlateItem } from "./portion-editor";

type Stage = "camera" | "analyzing" | "review";

interface ScanFlowProps {
  userId: string;
  bhawanId: string;
  defaultMeal: MealType;
  mealDate: string;
}

export function ScanFlow({ userId, bhawanId, defaultMeal, mealDate }: ScanFlowProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [stage, setStage] = useState<Stage>("camera");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlateAnalysis | null>(null);
  const [items, setItems] = useState<PlateItem[]>([]);
  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function reset() {
    setPhoto(null);
    setPhotoUrl(null);
    setAnalysis(null);
    setItems([]);
    setStage("camera");
  }

  async function handleCapture(raw: File) {
    const file = await downscaleImage(raw);
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
    setStage("analyzing");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Please sign in again.");

      const result = await analyzePlate(file, token);
      setAnalysis(result);
      setItems(
        result.items.map((line) => ({
          ...line,
          key: crypto.randomUUID(),
          ai_detected: true,
          user_corrected: false,
        }))
      );
      if (!result.is_food) {
        toast.warning("We couldn't spot any food. Add items manually or retake.");
      }
    } catch (err) {
      toast.error(
        `${err instanceof Error ? err.message : "Analysis failed"}. You can add foods manually.`
      );
    }
    setStage("review");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { photoSaved } = await saveMealLog(supabase, {
        userId,
        bhawanId,
        mealType,
        mealDate,
        photo,
        items,
        analysis,
      });
      if (photoSaved) {
        toast.success("Meal logged");
      } else {
        toast.warning("Meal logged, but the photo couldn't be uploaded.");
      }
      router.push("/nutrition");
      router.refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Unknown error";
      toast.error(`Could not save: ${message}`);
      setSaving(false);
    }
  }

  if (stage === "camera") {
    return <CameraView onCapture={handleCapture} onManual={() => setStage("review")} />;
  }

  if (stage === "analyzing") {
    return (
      <div className="space-y-4">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={photoUrl}
            alt="Your plate"
            className="aspect-[3/4] w-full rounded-2xl object-cover opacity-70"
          />
        )}
        <div className="flex items-center justify-center gap-2 text-sm text-[#4B5563]">
          <Loader2 className="h-4 w-4 animate-spin text-[#244E3D]" />
          Identifying foods on your plate...
        </div>
      </div>
    );
  }

  return (
    <PlateResult
      photoUrl={photoUrl}
      items={items}
      onItemsChange={setItems}
      confidence={analysis?.confidence ?? null}
      notes={analysis?.notes ?? []}
      mealType={mealType}
      onMealTypeChange={setMealType}
      saving={saving}
      onSave={handleSave}
      onRetake={reset}
    />
  );
}
