-- ============================================
-- 005: Week 4 — chat image attachments + secretary analytics
-- Run after 004. The app degrades gracefully if this isn't applied yet
-- (image attach errors out; analytics falls back to basic counts).
-- ============================================

-- --------------------------------------------
-- Chat images: private bucket, path {bhawan_id}/{random}.jpg,
-- readable by members of that bhawan only.
-- --------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', false, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Bhawan members upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = public.get_user_bhawan((SELECT auth.uid()))::text
  );

CREATE POLICY "Bhawan members view chat images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = public.get_user_bhawan((SELECT auth.uid()))::text
  );

-- An image message may have no text
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_length;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_length
  CHECK (
    char_length(content) <= 1000
    AND (char_length(content) >= 1 OR image_url IS NOT NULL)
  );

-- --------------------------------------------
-- Secretary analytics: aggregates only, never individual students' meals.
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bhawan_analytics(p_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bhawan UUID := get_user_bhawan((SELECT auth.uid()));
  v_today DATE := ist_today();
  v_from DATE := ist_today() - (LEAST(GREATEST(p_days, 7), 60) - 1);
  v_result JSONB;
BEGIN
  IF get_user_role((SELECT auth.uid())) NOT IN ('secretary', 'admin') THEN
    RAISE EXCEPTION 'Secretary access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'students', (
      SELECT count(*) FROM profiles WHERE bhawan_id = v_bhawan AND role = 'student'
    ),
    'active_students_7d', (
      SELECT count(DISTINCT uid) FROM (
        SELECT user_id AS uid FROM meal_logs
        WHERE bhawan_id = v_bhawan AND meal_date > v_today - 7
        UNION
        SELECT cm.user_id FROM chat_messages cm
        JOIN chat_weeks cw ON cw.id = cm.chat_week_id
        WHERE cw.bhawan_id = v_bhawan AND cm.created_at > now() - interval '7 days'
      ) a
    ),
    'meals_logged_7d', (
      SELECT count(*) FROM meal_logs WHERE bhawan_id = v_bhawan AND meal_date > v_today - 7
    ),
    'avg_meal_calories_7d', (
      SELECT round(avg(total_calories)::numeric) FROM meal_logs
      WHERE bhawan_id = v_bhawan AND meal_date > v_today - 7
    ),
    'avg_meal_protein_7d', (
      SELECT round(avg(total_protein)::numeric, 1) FROM meal_logs
      WHERE bhawan_id = v_bhawan AND meal_date > v_today - 7
    ),
    'chat_messages_7d', (
      SELECT count(*) FROM chat_messages cm
      JOIN chat_weeks cw ON cw.id = cm.chat_week_id
      WHERE cw.bhawan_id = v_bhawan AND cm.created_at > now() - interval '7 days'
    ),
    'complaints_by_status', (
      SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb) FROM (
        SELECT status, count(*) n FROM complaints WHERE bhawan_id = v_bhawan GROUP BY status
      ) s
    ),
    'complaints_by_category', (
      SELECT coalesce(jsonb_object_agg(category, n), '{}'::jsonb) FROM (
        SELECT category, count(*) n FROM complaints
        WHERE bhawan_id = v_bhawan AND created_at > now() - interval '30 days'
        GROUP BY category
      ) c
    ),
    'avg_response_hours', (
      SELECT round((avg(extract(epoch FROM responded_at - created_at)) / 3600)::numeric, 1)
      FROM complaints WHERE bhawan_id = v_bhawan AND responded_at IS NOT NULL
    ),
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', d::date,
        'meals', (SELECT count(*) FROM meal_logs WHERE bhawan_id = v_bhawan AND meal_date = d::date),
        'messages', (
          SELECT count(*) FROM chat_messages cm
          JOIN chat_weeks cw ON cw.id = cm.chat_week_id
          WHERE cw.bhawan_id = v_bhawan
            AND (cm.created_at AT TIME ZONE 'Asia/Kolkata')::date = d::date
        ),
        'complaints', (
          SELECT count(*) FROM complaints
          WHERE bhawan_id = v_bhawan
            AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = d::date
        )
      ) ORDER BY d)
      FROM generate_series(v_from, v_today, interval '1 day') d
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_bhawan_analytics(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bhawan_analytics(INTEGER) TO authenticated;
