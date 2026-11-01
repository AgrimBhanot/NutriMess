-- ============================================
-- 002: Week 2 — Menu publishing, weekly chat, complaints, storage
-- Run after 001_auth_security_hardening.sql
-- ============================================

-- --------------------------------------------
-- Helpers: IST calendar (mess weeks run Monday–Sunday, Asia/Kolkata)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.ist_today()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

CREATE OR REPLACE FUNCTION public.week_monday(p_date DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_date - (EXTRACT(ISODOW FROM p_date)::int - 1);
$$;

-- ============================================
-- CHAT
-- ============================================

-- Denormalised author info so realtime payloads can render without
-- students needing read access to other students' profiles.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_role user_role;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_length;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_length
  CHECK (char_length(content) BETWEEN 1 AND 1000);

CREATE OR REPLACE FUNCTION public.set_chat_message_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT full_name, role INTO NEW.author_name, NEW.author_role
  FROM profiles WHERE id = NEW.user_id;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_chat_message_author() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS chat_messages_author ON public.chat_messages;
CREATE TRIGGER chat_messages_author
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_message_author();

-- Users can delete their own messages; secretaries can moderate their bhawan
CREATE POLICY "Users delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      get_user_role(auth.uid()) = 'secretary'
      AND EXISTS (
        SELECT 1 FROM chat_weeks cw
        WHERE cw.id = chat_messages.chat_week_id
          AND cw.bhawan_id = get_user_bhawan(auth.uid())
      )
    )
  );

-- Lazy weekly rotation: returns the caller's active chat week, creating a
-- new one when the current week has rolled over. No cron needed.
CREATE OR REPLACE FUNCTION public.ensure_current_chat_week()
RETURNS public.chat_weeks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bhawan UUID := get_user_bhawan(auth.uid());
  v_monday DATE := week_monday(ist_today());
  v_week chat_weeks;
  v_menu UUID;
BEGIN
  IF v_bhawan IS NULL THEN
    RAISE EXCEPTION 'No bhawan set for user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_week FROM chat_weeks
  WHERE bhawan_id = v_bhawan AND is_active
  ORDER BY week_start DESC LIMIT 1;

  IF v_week.id IS NOT NULL AND v_week.week_start = v_monday THEN
    RETURN v_week;
  END IF;

  SELECT id INTO v_menu FROM menus
  WHERE bhawan_id = v_bhawan AND week_start = v_monday AND status = 'published';

  PERFORM create_chat_week(v_bhawan, v_monday, v_menu);

  SELECT * INTO v_week FROM chat_weeks
  WHERE bhawan_id = v_bhawan AND week_start = v_monday;
  RETURN v_week;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ensure_current_chat_week() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_chat_week() TO authenticated;

-- Realtime: deliver chat inserts/deletes (RLS is applied per subscriber)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============================================
-- MENUS
-- ============================================

-- Explicit WITH CHECK so a secretary can't insert a menu for another bhawan
DROP POLICY IF EXISTS "Secretaries manage own bhawan menus" ON public.menus;
CREATE POLICY "Secretaries manage own bhawan menus"
  ON public.menus FOR ALL
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND bhawan_id = get_user_bhawan(auth.uid())
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'secretary'
    AND bhawan_id = get_user_bhawan(auth.uid())
  );

DROP POLICY IF EXISTS "Secretaries manage menu items" ON public.menu_items;
CREATE POLICY "Secretaries manage menu items"
  ON public.menu_items FOR ALL
  USING (
    get_user_role(auth.uid()) = 'secretary'
    AND EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
        AND m.bhawan_id = get_user_bhawan(auth.uid())
    )
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'secretary'
    AND EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = menu_items.menu_id
        AND m.bhawan_id = get_user_bhawan(auth.uid())
    )
  );

-- Replace a draft's items atomically (the editor saves the whole grid)
CREATE OR REPLACE FUNCTION public.save_menu_items(p_menu_id UUID, p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM menu_items WHERE menu_id = p_menu_id;

  INSERT INTO menu_items (menu_id, day, meal, item_name, item_order, food_id)
  SELECT
    p_menu_id,
    (i->>'day')::day_of_week,
    (i->>'meal')::meal_type,
    trim(i->>'item_name'),
    COALESCE((i->>'item_order')::int, 0),
    (
      SELECT f.id FROM food_items f
      WHERE lower(f.name) = lower(trim(i->>'item_name'))
      LIMIT 1
    )
  FROM jsonb_array_elements(p_items) AS i
  WHERE trim(COALESCE(i->>'item_name', '')) <> '';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE menus SET updated_at = now() WHERE id = p_menu_id;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_menu_items(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_menu_items(UUID, JSONB) TO authenticated;

-- Publish a menu and rotate the chat week when it's for the current week
CREATE OR REPLACE FUNCTION public.publish_menu(p_menu_id UUID)
RETURNS public.menus
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_menu menus;
BEGIN
  SELECT * INTO v_menu FROM menus WHERE id = p_menu_id;

  IF v_menu.id IS NULL
     OR get_user_role(auth.uid()) <> 'secretary'
     OR v_menu.bhawan_id <> get_user_bhawan(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to publish this menu' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE menu_id = p_menu_id) THEN
    RAISE EXCEPTION 'Cannot publish an empty menu' USING ERRCODE = '22023';
  END IF;

  UPDATE menus
  SET status = 'published', published_at = now()
  WHERE id = p_menu_id
  RETURNING * INTO v_menu;

  -- Only the current week's menu starts a fresh chat week; a future week's
  -- menu gets linked when ensure_current_chat_week() rolls over.
  IF v_menu.week_start = week_monday(ist_today()) THEN
    PERFORM create_chat_week(v_menu.bhawan_id, v_menu.week_start, v_menu.id);
  END IF;

  RETURN v_menu;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.publish_menu(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_menu(UUID) TO authenticated;

-- ============================================
-- COMPLAINTS
-- ============================================
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_description_length;
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_description_length
  CHECK (char_length(description) BETWEEN 10 AND 2000);

-- Secretary view of their bhawan's complaints. Reporter identity is hidden
-- for anonymous complaints (secretaries have no direct SELECT on the table).
CREATE OR REPLACE FUNCTION public.get_bhawan_complaints()
RETURNS TABLE (
  id UUID,
  category complaint_category,
  description TEXT,
  image_url TEXT,
  is_anonymous BOOLEAN,
  status complaint_status,
  secretary_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reporter_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role(auth.uid()) NOT IN ('secretary', 'admin') THEN
    RAISE EXCEPTION 'Secretary access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.id, c.category, c.description, c.image_url, c.is_anonymous,
         c.status, c.secretary_response, c.responded_at, c.created_at,
         CASE WHEN c.is_anonymous THEN NULL ELSE p.full_name END
  FROM complaints c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.bhawan_id = get_user_bhawan(auth.uid())
  ORDER BY c.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_bhawan_complaints() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bhawan_complaints() TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_complaint(
  p_complaint_id UUID,
  p_status complaint_status,
  p_response TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role(auth.uid()) NOT IN ('secretary', 'admin') THEN
    RAISE EXCEPTION 'Secretary access required' USING ERRCODE = '42501';
  END IF;

  UPDATE complaints
  SET status = p_status,
      secretary_response = COALESCE(NULLIF(trim(p_response), ''), secretary_response),
      responded_by = auth.uid(),
      responded_at = now()
  WHERE id = p_complaint_id
    AND bhawan_id = get_user_bhawan(auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.respond_to_complaint(UUID, complaint_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_complaint(UUID, complaint_status, TEXT) TO authenticated;

-- ============================================
-- STORAGE BUCKETS
--   menu-images  : public read, secretaries write to {bhawan_id}/...
--   complaints   : private, students write to {bhawan_id}/...,
--                  read by uploader or that bhawan's secretary
--   plate-images : private, users own {user_id}/... (used in Week 3)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('menu-images', 'menu-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('complaints', 'complaints', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('plate-images', 'plate-images', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Secretaries upload menu images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.get_user_role(auth.uid()) = 'secretary'
    AND (storage.foldername(name))[1] = public.get_user_bhawan(auth.uid())::text
  );

CREATE POLICY "Secretaries manage menu images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.get_user_role(auth.uid()) = 'secretary'
    AND (storage.foldername(name))[1] = public.get_user_bhawan(auth.uid())::text
  );

CREATE POLICY "Students upload complaint images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'complaints'
    AND (storage.foldername(name))[1] = public.get_user_bhawan(auth.uid())::text
  );

CREATE POLICY "Complaint images visible to uploader and secretary"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'complaints'
    AND (
      owner_id = auth.uid()::text
      OR (
        public.get_user_role(auth.uid()) = 'secretary'
        AND (storage.foldername(name))[1] = public.get_user_bhawan(auth.uid())::text
      )
    )
  );

CREATE POLICY "Users manage own plate images"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'plate-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'plate-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Indexes for the new access paths
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_weeks_active ON public.chat_weeks(bhawan_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
