import { connection } from "next/server";
import type { Metadata } from "next";
import { Activity, AlertCircle, Clock, MessageCircle, Users, Utensils } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/lib/constants";
import { MiniBarChart } from "@/components/analytics/mini-bar-chart";
import type { BhawanComplaint } from "@/types";

export const metadata: Metadata = {
  title: "Analytics",
};

type Analytics = {
  students: number;
  active_students_7d: number;
  meals_logged_7d: number;
  avg_meal_calories_7d: number | null;
  avg_meal_protein_7d: number | null;
  chat_messages_7d: number;
  complaints_by_status: Record<string, number>;
  complaints_by_category: Record<string, number>;
  avg_response_hours: number | null;
  daily: { date: string; meals: number; messages: number; complaints: number }[];
};

function dateLabel(iso: string, short = false): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(short ? {} : { weekday: "short" }),
    timeZone: "UTC",
  });
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 stroke-[1.5px] text-[#9CA3AF]" />
        <span className="text-xs text-[#9CA3AF]">{label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-[#111827]">{value}</p>
      {hint && <p className="text-xs text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

export default async function SecretaryAnalyticsPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();

  const { data, error } = await supabase.rpc("get_bhawan_analytics", { p_days: 14 });
  let analytics = data as Analytics | null;
  const limited = !!error;

  // Migration 005 not applied yet: build what we can from existing access
  if (!analytics) {
    const [{ count: students }, { data: complaints }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("bhawan_id", profile.bhawan_id)
        .eq("role", "student"),
      supabase.rpc("get_bhawan_complaints"),
    ]);
    const list = (complaints ?? []) as BhawanComplaint[];
    const countBy = (key: "status" | "category") =>
      list.reduce<Record<string, number>>((acc, c) => {
        acc[c[key]] = (acc[c[key]] ?? 0) + 1;
        return acc;
      }, {});
    analytics = {
      students: students ?? 0,
      active_students_7d: 0,
      meals_logged_7d: 0,
      avg_meal_calories_7d: null,
      avg_meal_protein_7d: null,
      chat_messages_7d: 0,
      complaints_by_status: countBy("status"),
      complaints_by_category: countBy("category"),
      avg_response_hours: null,
      daily: [],
    };
  }

  const a = analytics;
  const openComplaints = Object.entries(a.complaints_by_status)
    .filter(([status]) => status !== "resolved")
    .reduce((n, [, v]) => n + v, 0);
  const categoryMax = Math.max(1, ...Object.values(a.complaints_by_category));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">Analytics</h2>
        <p className="text-sm text-[#9CA3AF]">{profile.bhawans?.name} · last 7 days</p>
      </div>

      {limited && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Showing basic stats only. Run database migration 005 to enable
          engagement and meal analytics.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={Users}
          label="Active students"
          value={`${a.active_students_7d}`}
          hint={`of ${a.students} registered`}
        />
        <StatTile icon={Utensils} label="Meals logged" value={`${a.meals_logged_7d}`} />
        <StatTile
          icon={Activity}
          label="Avg logged meal"
          value={a.avg_meal_calories_7d ? `${a.avg_meal_calories_7d}` : "–"}
          hint={a.avg_meal_protein_7d ? `kcal · ${a.avg_meal_protein_7d}g protein` : "kcal"}
        />
        <StatTile icon={MessageCircle} label="Chat messages" value={`${a.chat_messages_7d}`} />
        <StatTile icon={AlertCircle} label="Open complaints" value={`${openComplaints}`} />
        <StatTile
          icon={Clock}
          label="Avg response time"
          value={a.avg_response_hours !== null ? `${a.avg_response_hours}h` : "–"}
        />
      </div>

      {a.daily.length > 0 && (
        <>
          <MiniBarChart
            title="Meals logged per day"
            unit="meals"
            data={a.daily.map((d) => ({
              label: dateLabel(d.date),
              shortLabel: dateLabel(d.date, true),
              value: d.meals,
            }))}
          />
          <MiniBarChart
            title="Chat messages per day"
            unit="messages"
            data={a.daily.map((d) => ({
              label: dateLabel(d.date),
              shortLabel: dateLabel(d.date, true),
              value: d.messages,
            }))}
          />
        </>
      )}

      <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
        <h3 className="text-sm font-semibold text-[#111827]">Complaints by category</h3>
        {Object.keys(a.complaints_by_category).length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No complaints in the last 30 days.</p>
        ) : (
          <div className="space-y-2.5">
            {COMPLAINT_CATEGORIES.map((c) => {
              const n = a.complaints_by_category[c.value] ?? 0;
              return (
                <div key={c.value} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-[#4B5563]">{c.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#F3F4F6]">
                    {n > 0 && (
                      <div
                        className="h-full rounded-full bg-[#BA5D38]"
                        style={{ width: `${(n / categoryMax) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="w-6 text-right font-mono text-xs tabular-nums text-[#111827]">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#E5E7EB] pt-3 text-xs text-[#4B5563]">
          {COMPLAINT_STATUSES.map((s) => (
            <span key={s.value}>
              {s.label}:{" "}
              <span className="font-mono tabular-nums text-[#111827]">
                {a.complaints_by_status[s.value] ?? 0}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
