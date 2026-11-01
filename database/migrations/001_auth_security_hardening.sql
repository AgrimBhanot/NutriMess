-- ============================================
-- 001: Auth & security hardening
-- Applied on top of schema.sql / rls_policies.sql / functions.sql
-- ============================================

-- 1. Hide secretary_hash from API roles (column-level grant)
REVOKE SELECT ON public.bhawans FROM anon, authenticated;
GRANT SELECT (id, name, code, description, image_url, created_at) ON public.bhawans TO anon, authenticated;

-- 2. Signup trigger: never trust role from client metadata.
--    Secretary role is only granted when secretary_hash matches the bhawan.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bhawan_id UUID;
  v_role user_role := 'student';
BEGIN
  BEGIN
    v_bhawan_id := NULLIF(NEW.raw_user_meta_data->>'bhawan_id', '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    v_bhawan_id := NULL;
  END;

  IF v_bhawan_id IS NOT NULL
     AND NEW.raw_user_meta_data->>'role' = 'secretary'
     AND EXISTS (
       SELECT 1 FROM bhawans
       WHERE id = v_bhawan_id
         AND secretary_hash = upper(trim(NEW.raw_user_meta_data->>'secretary_hash'))
     ) THEN
    v_role := 'secretary';
  END IF;

  INSERT INTO profiles (id, full_name, email, role, bhawan_id, diet_preference)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      'New User'
    ),
    NEW.email,
    v_role,
    v_bhawan_id,
    NULLIF(NEW.raw_user_meta_data->>'diet_preference', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Don't keep the secretary hash in user metadata
  IF NEW.raw_user_meta_data ? 'secretary_hash' THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'secretary_hash'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Guard profile writes made through the API:
--    API users can't change role; secretaries can't switch bhawan.
CREATE OR REPLACE FUNCTION public.guard_profile_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;  -- trusted callers (SECURITY DEFINER functions, service role)
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Changing id or email is not allowed' USING ERRCODE = '42501';
  END IF;
  IF OLD.role <> 'student' AND OLD.bhawan_id IS NOT NULL
     AND NEW.bhawan_id IS DISTINCT FROM OLD.bhawan_id THEN
    RAISE EXCEPTION 'Secretaries cannot change bhawan' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_write();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Secretary verification / promotion
CREATE OR REPLACE FUNCTION public.verify_secretary_hash(p_bhawan_id UUID, p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bhawans
    WHERE id = p_bhawan_id
      AND secretary_hash = upper(trim(p_hash))
  );
$$;

-- Old signature allowed promoting any user id; replace it
DROP FUNCTION IF EXISTS public.promote_to_secretary(UUID, UUID, TEXT);

-- Promotes the *calling* user (used by OAuth onboarding)
CREATE OR REPLACE FUNCTION public.promote_to_secretary(p_bhawan_id UUID, p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT verify_secretary_hash(p_bhawan_id, p_hash) THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET role = 'secretary', bhawan_id = p_bhawan_id
  WHERE id = auth.uid()
    AND (bhawan_id IS NULL OR bhawan_id = p_bhawan_id);

  RETURN FOUND;
END;
$$;

-- 5. Remaining function hardening
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.get_active_chat_week(UUID) SET search_path = public;
ALTER FUNCTION public.create_chat_week(UUID, DATE, UUID) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_chat_week(UUID, DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_to_secretary(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_secretary(UUID, TEXT) TO authenticated;

-- 6. Complaints: fix tautological `bhawan_id = bhawan_id` checks.
--    Students see their own rows; secretaries go through RPCs (002)
--    so anonymous complaints stay anonymous.
DROP POLICY IF EXISTS "Students see own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Secretaries can update complaints" ON public.complaints;

CREATE POLICY "Students see own complaints"
  ON public.complaints FOR SELECT
  USING (user_id = auth.uid());
