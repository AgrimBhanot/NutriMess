import { connection } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const { profile } = await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader bhawanName={profile.bhawans?.name} />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
