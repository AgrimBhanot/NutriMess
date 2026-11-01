import { connection } from "next/server";
import { getActiveChatWeek } from "@/lib/chat";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ChatRoom } from "./chat-room";

/** Server wrapper shared by the student and secretary chat routes. */
export async function ChatPage() {
  await connection();
  const { supabase, profile } = await getCurrentProfile();
  const { data, error } = await getActiveChatWeek(supabase);

  if (!data) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-center text-sm text-red-600">
        Chat is unavailable right now: {error}
      </div>
    );
  }

  return (
    <ChatRoom
      chatWeekId={data.week.id}
      weekStart={data.week.week_start}
      weekEnd={data.week.week_end}
      bhawanName={profile.bhawans?.name ?? "Bhawan"}
      bhawanId={profile.bhawan_id}
      userId={profile.id}
      userRole={profile.role}
      menuImageUrl={data.menuImageUrl}
    />
  );
}
