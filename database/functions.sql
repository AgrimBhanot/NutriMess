-- ============================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================

-- ============================================
-- Auto-create profile on signup (trigger)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role, bhawan_id, diet_preference)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'New User'
    ),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    NULLIF(NEW.raw_user_meta_data->>'bhawan_id', '')::UUID,
    NEW.raw_user_meta_data->>'diet_preference'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = COALESCE(profiles.role, EXCLUDED.role),
    bhawan_id = COALESCE(EXCLUDED.bhawan_id, profiles.bhawan_id),
    diet_preference = COALESCE(EXCLUDED.diet_preference, profiles.diet_preference),
    updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch error so it doesn't block auth.users creation entirely, 
  -- and log it to help debugging
  RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RLS Helper Functions (Bypass RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_bhawan(p_user_id UUID)
RETURNS UUID AS $$
  SELECT bhawan_id FROM profiles WHERE id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Chat week rotation
-- ============================================

-- Create or activate a new chat week for a bhawan
CREATE OR REPLACE FUNCTION create_chat_week(
  p_bhawan_id UUID,
  p_week_start DATE,
  p_menu_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_chat_week_id UUID;
BEGIN
  -- Deactivate previous weeks for this bhawan
  UPDATE chat_weeks
  SET is_active = false
  WHERE bhawan_id = p_bhawan_id AND is_active = true;

  -- Create new chat week
  INSERT INTO chat_weeks (bhawan_id, week_start, week_end, menu_id, is_active)
  VALUES (p_bhawan_id, p_week_start, p_week_start + 6, p_menu_id, true)
  ON CONFLICT (bhawan_id, week_start)
  DO UPDATE SET is_active = true, menu_id = COALESCE(p_menu_id, chat_weeks.menu_id)
  RETURNING id INTO v_chat_week_id;

  RETURN v_chat_week_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current active chat week for a bhawan
CREATE OR REPLACE FUNCTION get_active_chat_week(p_bhawan_id UUID)
RETURNS UUID AS $$
  SELECT id FROM chat_weeks
  WHERE bhawan_id = p_bhawan_id
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================
-- Secretary hash verification
-- ============================================
CREATE OR REPLACE FUNCTION verify_secretary_hash(
  p_bhawan_id UUID,
  p_hash TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bhawans
    WHERE id = p_bhawan_id
    AND secretary_hash = p_hash
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Promote user to secretary role after hash verification
CREATE OR REPLACE FUNCTION promote_to_secretary(
  p_user_id UUID,
  p_bhawan_id UUID,
  p_hash TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT verify_secretary_hash(p_bhawan_id, p_hash) INTO v_valid;

  IF v_valid THEN
    UPDATE profiles
    SET role = 'secretary'
    WHERE id = p_user_id AND bhawan_id = p_bhawan_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
