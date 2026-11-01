-- ============================================
-- RLS / access-control audit
-- Creates throwaway users in two bhawans, then checks as each user that
-- bhawan isolation, role guards and anonymity hold. Everything runs in one
-- transaction that is ROLLED BACK, so it is safe on a live project.
-- Any failed check raises an exception naming the check.
-- Run in the Supabase SQL editor (as postgres).
-- ============================================
BEGIN;

-- ---------- fixtures (as postgres) ----------
CREATE TEMP TABLE audit_ids ON COMMIT DROP AS
SELECT
  (SELECT id FROM bhawans WHERE code = 'VB') AS bhawan_x,
  (SELECT id FROM bhawans WHERE code = 'RB') AS bhawan_y,
  '00000000-0000-4000-a000-00000000000a'::uuid AS student_x,
  '00000000-0000-4000-a000-00000000000b'::uuid AS student_y,
  '00000000-0000-4000-a000-00000000000c'::uuid AS secretary_x;
GRANT SELECT ON audit_ids TO authenticated;

INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       u.email, jsonb_build_object('full_name', u.name, 'bhawan_id', u.bhawan,
                                   'role', u.wants_role, 'secretary_hash', 'WRONG')
FROM audit_ids a, LATERAL (VALUES
  (a.student_x,   'audit-x@example.com',   'Audit X',   a.bhawan_x, 'student'),
  (a.student_y,   'audit-y@example.com',   'Audit Y',   a.bhawan_y, 'secretary'),
  (a.secretary_x, 'audit-sec@example.com', 'Audit Sec', a.bhawan_x, 'student')
) AS u(id, email, name, bhawan, wants_role);

-- Promote the secretary directly (as postgres, bypassing the guard)
UPDATE profiles SET role = 'secretary' FROM audit_ids a WHERE profiles.id = a.secretary_x;

-- Bhawan Y data that X must never see
INSERT INTO menus (id, bhawan_id, week_start, week_end, status)
SELECT '00000000-0000-4000-b000-000000000001', bhawan_y, '2020-01-06', '2020-01-12', 'published' FROM audit_ids;
INSERT INTO chat_weeks (id, bhawan_id, week_start, week_end, is_active)
SELECT '00000000-0000-4000-b000-000000000002', bhawan_y, '2020-01-06', '2020-01-12', true FROM audit_ids;
INSERT INTO chat_messages (chat_week_id, user_id, content)
SELECT '00000000-0000-4000-b000-000000000002', student_y, 'secret Y chat' FROM audit_ids;
INSERT INTO complaints (bhawan_id, user_id, category, description)
SELECT bhawan_y, student_y, 'hygiene', 'complaint from bhawan Y' FROM audit_ids;
INSERT INTO meal_logs (user_id, bhawan_id, meal_type, meal_date)
SELECT student_y, bhawan_y, 'lunch', '2020-01-06' FROM audit_ids;
-- An anonymous complaint in X, for the anonymity check
INSERT INTO complaints (bhawan_id, user_id, category, description, is_anonymous)
SELECT bhawan_x, student_x, 'quantity', 'anonymous complaint in X', true FROM audit_ids;

-- ---------- 1. signup trigger never trusts metadata ----------
DO $$ BEGIN
  ASSERT (SELECT role FROM profiles WHERE id = (SELECT student_y FROM audit_ids)) = 'student',
    'FAIL signup: wrong secretary_hash still granted secretary role';
END $$;

-- ---------- 2. student in bhawan X ----------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT student_x FROM audit_ids), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  ASSERT (SELECT count(*) FROM profiles) = 1, 'FAIL profiles: student sees other profiles';
  ASSERT (SELECT count(*) FROM menus WHERE bhawan_id = (SELECT bhawan_y FROM audit_ids)) = 0,
    'FAIL menus: cross-bhawan menu visible';
  ASSERT (SELECT count(*) FROM chat_weeks WHERE bhawan_id = (SELECT bhawan_y FROM audit_ids)) = 0,
    'FAIL chat_weeks: cross-bhawan chat week visible';
  ASSERT (SELECT count(*) FROM chat_messages WHERE content = 'secret Y chat') = 0,
    'FAIL chat_messages: cross-bhawan messages visible';
  ASSERT (SELECT count(*) FROM complaints WHERE bhawan_id = (SELECT bhawan_y FROM audit_ids)) = 0,
    'FAIL complaints: other bhawan complaints visible';
  ASSERT (SELECT count(*) FROM meal_logs WHERE user_id <> (SELECT student_x FROM audit_ids)) = 0,
    'FAIL meal_logs: other users meal logs visible';
  ASSERT (SELECT get_user_role((SELECT student_y FROM audit_ids))) IS NULL,
    'FAIL helpers: get_user_role leaks other users role';
END $$;

DO $$ BEGIN
  INSERT INTO chat_messages (chat_week_id, user_id, content)
  VALUES ('00000000-0000-4000-b000-000000000002', (SELECT student_x FROM audit_ids), 'intrusion');
  RAISE EXCEPTION 'FAIL chat insert: posted into another bhawan chat';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE profiles SET role = 'secretary' WHERE id = (SELECT student_x FROM audit_ids);
  RAISE EXCEPTION 'FAIL role guard: student promoted themselves';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  INSERT INTO complaints (bhawan_id, user_id, category, description)
  VALUES ((SELECT bhawan_y FROM audit_ids), (SELECT student_x FROM audit_ids), 'other', 'filed into wrong bhawan');
  RAISE EXCEPTION 'FAIL complaints insert: filed into another bhawan';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM get_bhawan_complaints();
  RAISE EXCEPTION 'FAIL RPC: student can call get_bhawan_complaints';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM bhawans WHERE secretary_hash IS NOT NULL;
  RAISE EXCEPTION 'FAIL bhawans: secretary_hash column readable';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

RESET ROLE;

-- ---------- 3. secretary of bhawan X ----------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT secretary_x FROM audit_ids), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  ASSERT NOT EXISTS (
    SELECT 1 FROM get_bhawan_complaints() WHERE description = 'complaint from bhawan Y'),
    'FAIL secretary: sees another bhawan complaints';
  ASSERT (SELECT reporter_name FROM get_bhawan_complaints()
          WHERE description = 'anonymous complaint in X') IS NULL,
    'FAIL anonymity: anonymous complaint reveals reporter';
  ASSERT (SELECT count(*) FROM profiles WHERE bhawan_id = (SELECT bhawan_y FROM audit_ids)) = 0,
    'FAIL secretary: sees other bhawan profiles';
END $$;

DO $$ BEGIN
  UPDATE menus SET status = 'archived' WHERE id = '00000000-0000-4000-b000-000000000001';
  ASSERT NOT FOUND, 'FAIL secretary: modified another bhawan menu';
END $$;

DO $$ BEGIN
  PERFORM publish_menu('00000000-0000-4000-b000-000000000001');
  RAISE EXCEPTION 'FAIL secretary: published another bhawan menu';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

RESET ROLE;

-- ---------- 4. anonymous (not signed in) ----------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM bhawans) = 5, 'FAIL anon: bhawan list not readable for signup';
END $$;
DO $$ BEGIN
  PERFORM 1 FROM profiles LIMIT 1;
  ASSERT NOT FOUND, 'FAIL anon: profiles readable';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

SELECT 'RLS audit passed' AS result;
ROLLBACK;
