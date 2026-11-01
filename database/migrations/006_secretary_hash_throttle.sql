-- ============================================
-- 006: Stop brute-forcing the 16-bit secretary hash
-- A 4-hex-digit hash has 65,536 values; with verify_secretary_hash open to
-- anon it could be guessed in minutes. Now:
--   - verify_secretary_hash is internal only (signup trigger, promote RPC)
--   - promote_to_secretary allows 5 failed attempts per user per hour
--   - signup-time checks are already throttled by Supabase Auth rate limits
-- Run after 005.
-- ============================================

CREATE TABLE IF NOT EXISTS public.secretary_hash_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  succeeded BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS on with no policies: only SECURITY DEFINER functions touch it
ALTER TABLE public.secretary_hash_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_secretary_attempts_user
  ON public.secretary_hash_attempts(user_id, created_at);

CREATE OR REPLACE FUNCTION public.promote_to_secretary(p_bhawan_id UUID, p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_ok BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*) FROM secretary_hash_attempts
    WHERE user_id = v_uid AND NOT succeeded AND created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many attempts. Try again in an hour.' USING ERRCODE = 'P0001';
  END IF;

  v_ok := verify_secretary_hash(p_bhawan_id, p_hash);
  INSERT INTO secretary_hash_attempts (user_id, succeeded) VALUES (v_uid, v_ok);
  IF NOT v_ok THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET role = 'secretary', bhawan_id = p_bhawan_id
  WHERE id = v_uid
    AND (bhawan_id IS NULL OR bhawan_id = p_bhawan_id);
  RETURN FOUND;
END;
$$;

-- Internal-only helpers
REVOKE EXECUTE ON FUNCTION public.verify_secretary_hash(UUID, TEXT) FROM PUBLIC, anon, authenticated;
-- RLS helpers answer only for the caller (003); anon never needs them
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_bhawan(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bhawan(UUID) TO authenticated;
