-- ============================================
-- 003: Lock down RLS helper functions + RLS performance
-- Run after 002_week2_menu_chat_complaints.sql
-- ============================================

-- --------------------------------------------
-- 1. Helpers only answer for the calling user.
--    Previously anyone could call /rpc/get_user_role with any UUID and learn
--    who the secretaries are. Every policy passes auth.uid(), so behaviour
--    inside RLS is unchanged.
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles
  WHERE id = p_user_id AND p_user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_user_bhawan(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bhawan_id FROM profiles
  WHERE id = p_user_id AND p_user_id = (SELECT auth.uid());
$$;

-- --------------------------------------------
-- 2. Re-create policies with (SELECT auth.uid()) so Postgres evaluates it
--    once per query instead of once per row (Supabase lint 0003).
-- --------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Secretaries can view bhawan profiles" ON public.profiles;
CREATE POLICY "Secretaries can view bhawan profiles" ON public.profiles
  FOR SELECT USING (
    (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
    AND bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
  );

-- MENUS
DROP POLICY IF EXISTS "Students see own bhawan published menus" ON public.menus;
CREATE POLICY "Students see own bhawan published menus" ON public.menus
  FOR SELECT USING (
    bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
    AND (status = 'published' OR uploaded_by = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Secretaries manage own bhawan menus" ON public.menus;
CREATE POLICY "Secretaries manage own bhawan menus" ON public.menus
  FOR ALL
  USING (
    (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
    AND bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
  )
  WITH CHECK (
    (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
    AND bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
  );

-- MENU ITEMS
DROP POLICY IF EXISTS "View menu items for accessible menus" ON public.menu_items;
CREATE POLICY "View menu items for accessible menus" ON public.menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
        AND m.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
        AND (m.status = 'published' OR m.uploaded_by = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Secretaries manage menu items" ON public.menu_items;
CREATE POLICY "Secretaries manage menu items" ON public.menu_items
  FOR ALL
  USING (
    (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
    AND EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
        AND m.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
    )
  )
  WITH CHECK (
    (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
    AND EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
        AND m.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
    )
  );

-- CHAT
DROP POLICY IF EXISTS "Bhawan members can view chat weeks" ON public.chat_weeks;
CREATE POLICY "Bhawan members can view chat weeks" ON public.chat_weeks
  FOR SELECT USING (bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Bhawan members access chat messages" ON public.chat_messages;
CREATE POLICY "Bhawan members access chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_weeks cw
      WHERE cw.id = chat_messages.chat_week_id
        AND cw.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "Bhawan members can send chat messages" ON public.chat_messages;
CREATE POLICY "Bhawan members can send chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM chat_weeks cw
      WHERE cw.id = chat_messages.chat_week_id
        AND cw.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
        AND cw.is_active
    )
  );

DROP POLICY IF EXISTS "Users delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users delete own chat messages" ON public.chat_messages
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR (
      (SELECT get_user_role((SELECT auth.uid()))) = 'secretary'
      AND EXISTS (
        SELECT 1 FROM chat_weeks cw
        WHERE cw.id = chat_messages.chat_week_id
          AND cw.bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
      )
    )
  );

-- COMPLAINTS
DROP POLICY IF EXISTS "Students can create complaints" ON public.complaints;
CREATE POLICY "Students can create complaints" ON public.complaints
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Students see own complaints" ON public.complaints;
CREATE POLICY "Students see own complaints" ON public.complaints
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- MEAL LOGS (also pin bhawan_id to the user's bhawan on write)
DROP POLICY IF EXISTS "Users manage own meal logs" ON public.meal_logs;
CREATE POLICY "Users manage own meal logs" ON public.meal_logs
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND bhawan_id = (SELECT get_user_bhawan((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Users manage own meal log items" ON public.meal_log_items;
CREATE POLICY "Users manage own meal log items" ON public.meal_log_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_log_items.meal_log_id
        AND ml.user_id = (SELECT auth.uid())
    )
  );

-- AI CHAT
DROP POLICY IF EXISTS "Users manage own AI sessions" ON public.ai_chat_sessions;
CREATE POLICY "Users manage own AI sessions" ON public.ai_chat_sessions
  FOR ALL USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users manage own AI messages" ON public.ai_chat_messages;
CREATE POLICY "Users manage own AI messages" ON public.ai_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

-- --------------------------------------------
-- 3. Indexes for foreign keys (Supabase lint 0001)
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_weeks_menu ON public.chat_weeks(menu_id);
CREATE INDEX IF NOT EXISTS idx_complaints_responded_by ON public.complaints(responded_by);
CREATE INDEX IF NOT EXISTS idx_meal_log_items_food ON public.meal_log_items(food_id);
CREATE INDEX IF NOT EXISTS idx_meal_log_items_log ON public.meal_log_items(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_bhawan ON public.meal_logs(bhawan_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_food ON public.menu_items(food_id);
CREATE INDEX IF NOT EXISTS idx_menus_uploaded_by ON public.menus(uploaded_by);
