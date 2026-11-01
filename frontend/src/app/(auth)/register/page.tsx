"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BHAWANS, DIET_PREFERENCES } from "@/lib/constants";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSecretary = searchParams.get("role") === "secretary";

  const [step, setStep] = useState(1); // 1: credentials, 2: bhawan, 3: preferences (optional)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Credentials
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Bhawan selection
  const [selectedBhawan, setSelectedBhawan] = useState<string | null>(null);
  const [bhawans, setBhawans] = useState<
    { id: string; name: string; code: string }[]
  >([]);

  // Step 3: Diet preference (optional)
  const [dietPreference, setDietPreference] = useState<string | null>(null);

  // Secretary hash
  const [secretaryHash, setSecretaryHash] = useState("");

  useEffect(() => {
    async function fetchBhawans() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bhawans")
        .select("id, name, code")
        .order("name");
      if (data && data.length > 0) {
        setBhawans(data);
      } else if (error) {
        console.error("Failed to load bhawans:", error);
      }
    }
    fetchBhawans();
  }, []);

  async function handleRegister() {
    if (!selectedBhawan) {
      setError("Please select a Bhawan before continuing.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // If secretary, verify hash first
    if (isSecretary) {
      const { data: valid, error: rpcError } = await supabase.rpc(
        "verify_secretary_hash",
        {
          p_bhawan_id: selectedBhawan,
          p_hash: secretaryHash.trim(),
        }
      );

      if (rpcError || !valid) {
        setError("Invalid secretary hash. Please check and try again.");
        setLoading(false);
        return;
      }
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          bhawan_id: selectedBhawan,
          role: isSecretary ? "secretary" : "student",
          diet_preference: dietPreference,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user && !signUpData.session) {
      router.push("/login?message=check_email");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#244E3D]">
          <span className="text-2xl font-semibold text-white">N</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#111827]">
            {isSecretary ? "Secretary Registration" : "Join NutriMess"}
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {isSecretary
              ? "Register as a mess secretary"
              : "Track your mess nutrition at IITR"}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all",
              s === step
                ? "w-8 bg-[#244E3D]"
                : s < step
                  ? "w-4 bg-[#244E3D]/40"
                  : "w-4 bg-[#E5E7EB]"
            )}
          />
        ))}
      </div>

      {/* Step 1: Credentials */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#4B5563]">
              Full Name
            </Label>
            <Input
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-11 rounded-xl border-[#E5E7EB] bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#4B5563]">Email</Label>
            <Input
              type="email"
              placeholder="name@iitr.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border-[#E5E7EB] bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#4B5563]">
              Password
            </Label>
            <Input
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-xl border-[#E5E7EB] bg-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#244E3D] font-medium text-white hover:bg-[#1a3a2d]"
          >
            Continue
          </Button>
        </form>
      )}

      {/* Step 2: Bhawan Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-[#4B5563]">
            Select your Bhawan
          </p>
          {bhawans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-[#9CA3AF]">
              <Loader2 className="h-5 w-5 animate-spin mb-2 text-[#244E3D]" />
              <p>Loading bhawans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {bhawans.map((bhawan) => (
                <button
                  key={bhawan.id}
                  type="button"
                  onClick={() => setSelectedBhawan(bhawan.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all",
                    selectedBhawan === bhawan.id
                      ? "border-[#244E3D] bg-[#244E3D]/5"
                      : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold",
                      selectedBhawan === bhawan.id
                        ? "bg-[#244E3D] text-white"
                        : "bg-[#F3F4F6] text-[#4B5563]"
                    )}
                  >
                    {bhawan.code}
                  </div>
                  <span className="text-xs font-medium text-[#4B5563]">
                    {bhawan.name.replace(" Bhawan", "")}
                  </span>
                  {selectedBhawan === bhawan.id && (
                    <Check className="h-4 w-4 text-[#244E3D]" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Secretary hash input */}
          {isSecretary && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#4B5563]">
                Secretary Hash
              </Label>
              <Input
                type="text"
                placeholder="Enter 16-bit hash (e.g., 8F42)"
                value={secretaryHash}
                onChange={(e) =>
                  setSecretaryHash(e.target.value.toUpperCase())
                }
                required
                maxLength={4}
                className="h-11 rounded-xl border-[#E5E7EB] bg-white font-mono tracking-wider text-center uppercase"
              />
              <p className="text-xs text-[#9CA3AF]">
                This hash is provided by your mess administration
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-11 flex-1 rounded-xl border-[#E5E7EB]"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={!selectedBhawan || (isSecretary && !secretaryHash)}
              onClick={() => setStep(3)}
              className="h-11 flex-1 rounded-xl bg-[#244E3D] font-medium text-white hover:bg-[#1a3a2d]"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Diet Preference */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-[#4B5563]">
            Dietary preference (optional)
          </p>
          <div className="flex flex-col gap-2">
            {DIET_PREFERENCES.map((pref) => (
              <button
                key={pref.value}
                type="button"
                onClick={() => setDietPreference(pref.value)}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all",
                  dietPreference === pref.value
                    ? "border-[#244E3D] bg-[#244E3D]/5"
                    : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                )}
              >
                <span className="text-sm font-medium text-[#4B5563]">
                  {pref.label}
                </span>
                {dietPreference === pref.value && (
                  <Check className="h-4 w-4 text-[#244E3D]" />
                )}
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="h-11 flex-1 rounded-xl border-[#E5E7EB]"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleRegister}
              className="h-11 flex-1 rounded-xl bg-[#244E3D] font-medium text-white hover:bg-[#1a3a2d]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Login link */}
      <p className="text-center text-sm text-[#9CA3AF]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#244E3D] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
