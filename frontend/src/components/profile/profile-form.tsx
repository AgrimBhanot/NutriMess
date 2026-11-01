"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVITY_LEVELS,
  DIET_PREFERENCES,
  GOALS,
} from "@/lib/constants";
import { computeTargets } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const COMMON_ALLERGIES = ["Dairy", "Gluten", "Peanut", "Egg", "Soy"];

type FormProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "age"
  | "height_cm"
  | "weight_kg"
  | "activity_level"
  | "goal"
  | "diet_preference"
  | "allergies"
>;

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: string | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            value === o.value
              ? "border-[#244E3D] bg-[#244E3D] text-white"
              : "border-[#E5E7EB] bg-white text-[#4B5563]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[#4B5563]">{label}</span>
      <div className="flex items-center rounded-xl border border-[#E5E7EB] bg-white pr-3 focus-within:border-[#244E3D]/40">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full bg-transparent px-3 font-mono text-sm tabular-nums outline-none"
        />
        <span className="text-xs text-[#9CA3AF]">{unit}</span>
      </div>
    </label>
  );
}

function parseNum(v: string, min: number, max: number): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
}

export function ProfileForm({ profile }: { profile: FormProfile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weight_kg?.toString() ?? "");
  const [activity, setActivity] = useState(profile.activity_level);
  const [goal, setGoal] = useState(profile.goal);
  const [diet, setDiet] = useState(profile.diet_preference);
  const [allergies, setAllergies] = useState<string[]>(profile.allergies ?? []);
  const [allergyDraft, setAllergyDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageN = parseNum(age, 15, 80);
  const heightN = parseNum(height, 120, 230);
  const weightN = parseNum(weight, 30, 200);

  const preview = computeTargets({
    age: Number.isNaN(ageN) ? null : ageN,
    height_cm: Number.isNaN(heightN) ? null : heightN,
    weight_kg: Number.isNaN(weightN) ? null : weightN,
    activity_level: activity,
    goal,
  });

  function toggleAllergy(name: string) {
    const key = name.trim();
    if (!key) return;
    setAllergies((list) =>
      list.some((a) => a.toLowerCase() === key.toLowerCase())
        ? list.filter((a) => a.toLowerCase() !== key.toLowerCase())
        : [...list, key]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return setError("Name can't be empty.");
    if (Number.isNaN(ageN)) return setError("Age should be between 15 and 80.");
    if (Number.isNaN(heightN)) return setError("Height should be 120–230 cm.");
    if (Number.isNaN(weightN)) return setError("Weight should be 30–200 kg.");

    setSaving(true);
    setError(null);
    const { error: updateError } = await createClient()
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        age: ageN,
        height_cm: heightN,
        weight_kg: weightN,
        activity_level: activity,
        goal,
        diet_preference: diet,
        allergies: allergies.length ? allergies : null,
      })
      .eq("id", profile.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Profile updated");
    router.push("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[#4B5563]">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={80}
          className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#244E3D]/40"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Age" unit="yrs" value={age} onChange={setAge} min={15} max={80} />
        <NumberField label="Height" unit="cm" value={height} onChange={setHeight} min={120} max={230} />
        <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} min={30} max={200} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#4B5563]">Activity level</p>
        <Chips options={ACTIVITY_LEVELS} value={activity} onChange={setActivity} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#4B5563]">Goal</p>
        <Chips options={GOALS} value={goal} onChange={setGoal} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#4B5563]">Diet</p>
        <Chips options={DIET_PREFERENCES} value={diet} onChange={setDiet} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#4B5563]">Allergies &amp; intolerances</p>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...COMMON_ALLERGIES, ...allergies])].map((a) => {
            const on = allergies.some((x) => x.toLowerCase() === a.toLowerCase());
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergy(a)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium",
                  on
                    ? "border-[#BA5D38] bg-[#BA5D38]/10 text-[#BA5D38]"
                    : "border-[#E5E7EB] bg-white text-[#4B5563]"
                )}
              >
                {a}
                {on && <X className="h-3 w-3 stroke-[1.5px]" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={allergyDraft}
            onChange={(e) => setAllergyDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                toggleAllergy(allergyDraft);
                setAllergyDraft("");
              }
            }}
            placeholder="Other (e.g. mushroom)"
            maxLength={30}
            className="h-9 flex-1 rounded-lg border border-dashed border-[#E5E7EB] bg-white px-3 text-sm outline-none placeholder:text-[#9CA3AF]"
          />
          <button
            type="button"
            onClick={() => {
              toggleAllergy(allergyDraft);
              setAllergyDraft("");
            }}
            className="h-9 rounded-lg bg-[#244E3D]/10 px-3 text-xs font-medium text-[#244E3D]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <p className="text-xs text-[#9CA3AF]">
          {preview.personalised ? "Your daily targets" : "Default targets (add age, height & weight)"}
        </p>
        <p className="mt-1 font-mono text-sm tabular-nums text-[#111827]">
          {preview.calories.toLocaleString("en-IN")} kcal · {preview.protein}g protein ·{" "}
          {preview.carbs}g carbs · {preview.fat}g fat
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
      </button>
    </form>
  );
}
