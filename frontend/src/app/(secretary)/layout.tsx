import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify secretary role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bhawans(name, code)")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "secretary" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const bhawanData = profile?.bhawans as unknown as
    | { name: string; code: string }
    | null;
  const bhawanName = bhawanData?.name ?? "Secretary";
  const bhawanCode = bhawanData?.code ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Secretary header with verified badge */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#244E3D]">
              <span className="text-sm font-semibold text-white">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#111827]">
                Secretary Portal
              </span>
              <span className="text-xs text-[#9CA3AF]">
                {bhawanName} ({bhawanCode})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#244E3D]/10 px-2.5 py-1 text-xs font-medium text-[#244E3D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#244E3D]" />
              Verified
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>
    </div>
  );
}
