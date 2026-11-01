import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatWeek } from "@/types";

export type ActiveChatWeek = {
  week: ChatWeek;
  menuImageUrl: string | null;
};

/**
 * Returns the caller's bhawan chat week for the current IST week, rotating
 * to a fresh week (and linking that week's menu) when Monday rolls over.
 */
export async function getActiveChatWeek(
  supabase: SupabaseClient
): Promise<{ data: ActiveChatWeek | null; error: string | null }> {
  const { data: week, error } = await supabase
    .rpc("ensure_current_chat_week")
    .single<ChatWeek>();

  if (error || !week) {
    return { data: null, error: error?.message ?? "No chat week available" };
  }

  let menuImageUrl: string | null = null;
  if (week.menu_id) {
    const { data: menu } = await supabase
      .from("menus")
      .select("image_url")
      .eq("id", week.menu_id)
      .maybeSingle();
    menuImageUrl = menu?.image_url ?? null;
  }

  return { data: { week, menuImageUrl }, error: null };
}
