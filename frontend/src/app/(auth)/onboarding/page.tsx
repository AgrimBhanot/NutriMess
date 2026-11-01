"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIET_PREFERENCES } from "@/lib/constants";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BhawanOption = { id: string; name: string; code: string };

// Shown when a signed-in user has no bhawan yet — typically after Google
// OAuth, which skips the registration form.
export default function OnboardingPage() {
  const router = useRouter();
  const [bhawans, setBhawans] = useState<BhawanOption[]>([]);
  const [selectedBhawan, setSelectedBhawan] = useState<string | null>(null);
  const [dietPreference, setDietPreference] = useState<string | null>(null);
  const [isSecretary, setIsSecretary] = useState(false);
  const [secretaryHash, setSecretaryHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("bhawans")
      .select("id, name, code")
      .order("name")
      .then(({ data }) => setBhawans(data ?? []));
  }, []);

  async function handleSubmit() {
    if (!selectedBhawan) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Normally created by the signup trigger; recreate if that failed.
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name:
          (user.user_metadata.full_name as string | undefined) ??
          (user.user_metadata.name as string | undefined) ??
          "New User",
        bhawan_id: selectedBhawan,
        diet_preference: dietPreference,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    if (isSecretary) {
      const { data: promoted, error: rpcError } = await supabase.rpc(
        "promote_to_secretary",
        { p_bhawan_id: selectedBhawan, p_hash: secretaryHash.trim() }
      );
      if (rpcError || !promoted) {
        setError(
          "Invalid secretary hash. Your bhawan was saved; you can continue as a student or try the hash again."
        );
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#111827]">
          Choose your Bhawan
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          You&apos;ll see the menu, chat and complaints for this bhawan only.
        </p>
      </div>

      {bhawans.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#244E3D]" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {bhawans.map((bhawan) => {
            const selected = selectedBhawan === bhawan.id;
            return (
              <button
                key={bhawan.id}
                type="button"
                onClick={() => setSelectedBhawan(bhawan.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all",
                  selected
                    ? "border-[#244E3D] bg-[#244E3D]/5"
                    : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold",
                    selected
                      ? "bg-[#244E3D] text-white"
                      : "bg-[#F3F4F6] text-[#4B5563]"
                  )}
                >
                  {bhawan.code}
                </div>
                <span className="text-xs font-medium text-[#4B5563]">
                  {bhawan.name.replace(" Bhawan", "")}
                </span>
                {selected && <Check className="h-4 w-4 text-[#244E3D]" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {DIET_PREFERENCES.map((pref) => (
          <button
            key={pref.value}
            type="button"
            onClick={() =>
              setDietPreference(
                dietPreference === pref.value ? null : pref.value
              )
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              dietPreference === pref.value
                ? "border-[#244E3D] bg-[#244E3D] text-white"
                : "border-[#E5E7EB] bg-white text-[#4B5563]"
            )}
          >
            {pref.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-[#4B5563]">
        <input
          type="checkbox"
          checked={isSecretary}
          onChange={(e) => setIsSecretary(e.target.checked)}
          className="h-4 w-4 accent-[#244E3D]"
        />
        I am the mess secretary of this bhawan
      </label>

      {isSecretary && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#4B5563]">
            Secretary Hash
          </Label>
          <Input
            value={secretaryHash}
            onChange={(e) => setSecretaryHash(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="e.g. 8F42"
            className="h-11 rounded-xl border-[#E5E7EB] bg-white text-center font-mono uppercase tracking-wider"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={
          loading || !selectedBhawan || (isSecretary && secretaryHash.length < 4)
        }
        className="h-11 w-full rounded-xl bg-[#244E3D] font-medium text-white hover:bg-[#1a3a2d]"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
      </Button>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full text-center text-xs text-[#9CA3AF] hover:text-[#4B5563]"
      >
        Sign out
      </button>
    </div>
  );
}
