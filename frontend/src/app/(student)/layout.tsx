import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function StudentLayout({
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

  // Fetch user profile with bhawan info
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, bhawans(name, code)")
    .eq("id", user.id)
    .single();

  const bhawanName =
    (profile?.bhawans as unknown as { name: string; code: string } | null)
      ?.name ?? undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader bhawanName={bhawanName} />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
