-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhawans ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BHAWANS: Everyone can read all bhawans (needed for registration picker)
-- ============================================
CREATE POLICY "Anyone can view bhawans"
  ON bhawans FOR SELECT
  USING (true);

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Secretaries can view profiles in their bhawan (for chat names, etc.)
CREATE POLICY "Secretaries can view bhawan profiles"
  ON profiles FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND bhawan_id = get_user_bhawan(auth.uid())
  );

-- ============================================
-- FOOD ITEMS: Everyone can read (public nutrition data)
-- ============================================
CREATE POLICY "Anyone can view food items"
  ON food_items FOR SELECT
  USING (true);

-- ============================================
-- MENUS: Students see published menus for their bhawan
-- ============================================
CREATE POLICY "Students see own bhawan published menus"
  ON menus FOR SELECT
  USING (
    bhawan_id = get_user_bhawan(auth.uid())
    AND (status = 'published' OR uploaded_by = auth.uid())
  );

-- Secretaries can manage menus for their bhawan
CREATE POLICY "Secretaries manage own bhawan menus"
  ON menus FOR ALL
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND bhawan_id = get_user_bhawan(auth.uid())
  );

-- MENU ITEMS: Visible if parent menu is visible
CREATE POLICY "View menu items for accessible menus"
  ON menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
      AND (
        (m.bhawan_id = get_user_bhawan(auth.uid()) AND m.status = 'published')
        OR m.uploaded_by = auth.uid()
      )
    )
  );

CREATE POLICY "Secretaries manage menu items"
  ON menu_items FOR ALL
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
      AND m.bhawan_id = get_user_bhawan(auth.uid())
    )
  );

-- ============================================
-- CHAT: Only bhawan members can read/write
-- ============================================
CREATE POLICY "Bhawan members can view chat weeks"
  ON chat_weeks FOR SELECT
  USING (
    bhawan_id = get_user_bhawan(auth.uid())
  );

CREATE POLICY "Bhawan members access chat messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_weeks cw
      WHERE cw.id = chat_messages.chat_week_id
      AND cw.bhawan_id = get_user_bhawan(auth.uid())
    )
  );

CREATE POLICY "Bhawan members can send chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_weeks cw
      WHERE cw.id = chat_week_id
      AND cw.bhawan_id = get_user_bhawan(auth.uid())
      AND cw.is_active = true
    )
  );

-- ============================================
-- MEAL LOGS: Users can only see/create their own
-- ============================================
CREATE POLICY "Users manage own meal logs"
  ON meal_logs FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own meal log items"
  ON meal_log_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_log_items.meal_log_id
      AND ml.user_id = auth.uid()
    )
  );

-- ============================================
-- COMPLAINTS
-- ============================================
CREATE POLICY "Students can create complaints"
  ON complaints FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND bhawan_id = get_user_bhawan(auth.uid())
  );

CREATE POLICY "Students see own complaints"
  ON complaints FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      get_user_role(auth.uid()) = 'secretary'
      AND bhawan_id = complaints.bhawan_id
    )
  );

CREATE POLICY "Secretaries can update complaints"
  ON complaints FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND bhawan_id = complaints.bhawan_id
  );

-- ============================================
-- AI CHAT: Users manage their own sessions
-- ============================================
CREATE POLICY "Users manage own AI sessions"
  ON ai_chat_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own AI messages"
  ON ai_chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
      AND s.user_id = auth.uid()
    )
  );
