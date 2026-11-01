import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Upload,
  MessageCircle,
  AlertCircle,
  BarChart3,
  Users,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secretary Dashboard",
};

export default async function SecretaryDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, bhawans(name, code)")
    .eq("id", user.id)
    .single();

  const bhawan = profile?.bhawans as unknown as { name: string; code: string } | null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">
          {bhawan?.name || "Secretary"} Dashboard
        </h2>
        <p className="text-sm text-[#9CA3AF]">{dateStr}</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[#9CA3AF] stroke-[1.5px]" />
            <span className="text-xs text-[#9CA3AF]">Active Students</span>
          </div>
          <span className="text-2xl font-semibold text-[#111827] tabular-nums">
            --
          </span>
          <span className="text-xs text-[#9CA3AF] ml-1">/ --</span>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-[#9CA3AF] stroke-[1.5px]" />
            <span className="text-xs text-[#9CA3AF]">Satisfaction</span>
          </div>
          <span className="text-2xl font-semibold text-[#111827] tabular-nums">
            --
          </span>
          <span className="text-xs text-[#9CA3AF] ml-1">/ 5.0</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#111827]">Quick Actions</h3>
        <div className="space-y-2">
          <Link
            href="/secretary/menu-upload"
            className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#244E3D]/10">
              <Upload className="h-5 w-5 text-[#244E3D] stroke-[1.5px]" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[#111827]">
                Upload Menu
              </span>
              <p className="text-xs text-[#9CA3AF]">
                Upload this week&apos;s menu image
              </p>
            </div>
          </Link>

          <Link
            href="/secretary/chat"
            className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BA5D38]/10">
              <MessageCircle className="h-5 w-5 text-[#BA5D38] stroke-[1.5px]" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[#111827]">
                Community Chat
              </span>
              <p className="text-xs text-[#9CA3AF]">
                Post announcements, respond to feedback
              </p>
            </div>
          </Link>

          <Link
            href="/secretary/complaints"
            className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-500 stroke-[1.5px]" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[#111827]">
                Complaints
              </span>
              <p className="text-xs text-[#9CA3AF]">
                View and respond to student complaints
              </p>
            </div>
          </Link>

          <Link
            href="/secretary/analytics"
            className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#244E3D]/20 hover:shadow-sm card-shadow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4B5563]/10">
              <BarChart3 className="h-5 w-5 text-[#4B5563] stroke-[1.5px]" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[#111827]">
                Analytics
              </span>
              <p className="text-xs text-[#9CA3AF]">
                Student engagement and feedback stats
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
