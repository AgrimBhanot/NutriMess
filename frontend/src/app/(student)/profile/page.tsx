"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ChevronRight, Shield } from "lucide-react";
import type { Profile, Bhawan } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<
    (Profile & { bhawans: Bhawan }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*, bhawans(*)")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile & { bhawans: Bhawan });
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 rounded-2xl bg-[#F3F4F6]" />
        <div className="h-40 rounded-2xl bg-[#F3F4F6]" />
        <div className="h-32 rounded-2xl bg-[#F3F4F6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#244E3D] text-lg font-semibold text-white">
          {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-[#111827]">
            {profile?.full_name}
          </h2>
          <p className="text-sm text-[#9CA3AF]">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="secondary"
              className="rounded-full text-xs capitalize"
            >
              {profile?.role}
            </Badge>
            {profile?.role === "secretary" && (
              <Badge className="rounded-full bg-[#244E3D]/10 text-[#244E3D] text-xs gap-1">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bhawan info */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <h3 className="text-sm font-semibold text-[#111827] mb-3">
          My Bhawan
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-semibold text-white">
            {profile?.bhawans?.code}
          </div>
          <div>
            <p className="text-sm font-medium text-[#111827]">
              {profile?.bhawans?.name}
            </p>
            <p className="text-xs text-[#9CA3AF]">
              {profile?.bhawans?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Nutrition profile */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#111827]">
            Nutrition Profile
          </h3>
          <button className="flex items-center gap-1 text-xs text-[#244E3D] font-medium">
            Edit
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#9CA3AF] text-xs">Diet</span>
            <p className="font-medium text-[#4B5563] capitalize">
              {profile?.diet_preference?.replace("_", "-") || "Not set"}
            </p>
          </div>
          <div>
            <span className="text-[#9CA3AF] text-xs">Goal</span>
            <p className="font-medium text-[#4B5563] capitalize">
              {profile?.goal?.replace("_", " ") || "Not set"}
            </p>
          </div>
          <div>
            <span className="text-[#9CA3AF] text-xs">Activity</span>
            <p className="font-medium text-[#4B5563] capitalize">
              {profile?.activity_level?.replace("_", " ") || "Not set"}
            </p>
          </div>
          <div>
            <span className="text-[#9CA3AF] text-xs">Weight</span>
            <p className="font-medium text-[#4B5563] tabular-nums">
              {profile?.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <Button
        variant="outline"
        onClick={handleSignOut}
        className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
