"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, MAX_IMAGE_MB, uploadImage } from "@/lib/supabase/storage";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ComplaintCategory } from "@/types";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

interface ComplaintFormProps {
  userId: string;
  bhawanId: string;
}

export function ComplaintForm({ userId, bhawanId }: ComplaintFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please attach an image.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Photo must be under ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Choose a category.");
      return;
    }
    if (description.trim().length < MIN_LENGTH) {
      setError(`Describe the issue in at least ${MIN_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    try {
      // Path is {bhawan}/{random} — no user id, so anonymous stays anonymous
      const imagePath = photo
        ? await uploadImage(supabase, BUCKETS.complaints, bhawanId, photo)
        : null;

      const { error: insertError } = await supabase.from("complaints").insert({
        user_id: userId,
        bhawan_id: bhawanId,
        category,
        description: description.trim(),
        image_url: imagePath,
        is_anonymous: isAnonymous,
      });
      if (insertError) throw insertError;

      toast.success("Complaint submitted to your mess secretary.");
      router.push("/complaints");
      router.refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#4B5563]">Category</p>
        <div className="flex flex-wrap gap-2">
          {COMPLAINT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === c.value
                  ? "border-[#244E3D] bg-[#244E3D] text-white"
                  : "border-[#E5E7EB] bg-white text-[#4B5563]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-[#4B5563]"
        >
          What happened?
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
          rows={5}
          placeholder="e.g. The dal at lunch today was undercooked and cold."
          className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#244E3D]/40"
        />
        <p className="text-right text-xs tabular-nums text-[#9CA3AF]">
          {description.length} / {MAX_LENGTH}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[#4B5563]">Photo (optional)</p>
        {preview ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img
              src={preview}
              alt="Attachment preview"
              className="max-h-48 rounded-xl border border-[#E5E7EB] object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#4B5563]"
            >
              <X className="h-4 w-4 stroke-[1.5px]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 text-sm text-[#4B5563]"
          >
            <Camera className="h-4 w-4 stroke-[1.5px]" />
            Add a photo
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#244E3D]"
        />
        <span>
          <span className="block text-sm font-medium text-[#111827]">
            Submit anonymously
          </span>
          <span className="text-xs text-[#9CA3AF]">
            Your name won&apos;t be shown to the secretary.
          </span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Submit complaint"
        )}
      </button>
    </form>
  );
}
