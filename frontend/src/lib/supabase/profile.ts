import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export type ProfileWithBhawan = Profile & {
  bhawans: { name: string; code: string; description: string | null } | null;
};

/**
 * Current user's profile + bhawan, deduplicated per request so layouts and
 * pages can both call it. Redirects to /login or /onboarding when needed.
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*, bhawans(name, code, description)")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as ProfileWithBhawan | null;
  if (!profile?.bhawan_id) redirect("/onboarding");

  return { supabase, user, profile };
});
