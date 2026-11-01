-- ============================================
-- NUTRIMESS DATABASE SCHEMA
-- Supabase PostgreSQL
-- ============================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'secretary', 'admin');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'snacks', 'dinner');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE complaint_status AS ENUM ('open', 'acknowledged', 'in_progress', 'resolved');
CREATE TYPE complaint_category AS ENUM ('food_quality', 'hygiene', 'quantity', 'menu', 'other');
CREATE TYPE menu_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE portion_size AS ENUM ('small', 'medium', 'large');

-- ============================================
-- BHAWANS (hostel mess units)
-- ============================================
CREATE TABLE bhawans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,        -- e.g., 'VB', 'RB', 'GB', 'JB', 'HB'
  description TEXT,
  image_url TEXT,
  secretary_hash TEXT,              -- 16-bit hash for secretary verification
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FOOD ITEMS (nutrition database — must exist before menu_items FK)
-- ============================================
CREATE TABLE food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hindi TEXT,
  category TEXT,                     -- grain, dal, vegetable, fruit, dairy, etc.
  default_serving_unit TEXT,         -- katori, piece, glass, plate
  default_grams REAL,               -- grams per default serving
  -- Per 100g values
  calories_per_100g REAL,
  protein_per_100g REAL,
  carbs_per_100g REAL,
  fat_per_100g REAL,
  fiber_per_100g REAL,
  iron_per_100g REAL,
  calcium_per_100g REAL,
  -- Source
  source TEXT,                       -- 'IFCT2017', 'USDA', 'custom'
  source_id TEXT,                    -- ID in source database
  is_mess_specific BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  bhawan_id UUID REFERENCES bhawans(id), -- Nullable initially for OAuth signups before bhawan selection
  avatar_url TEXT,
  -- Nutrition profile fields
  age INTEGER,
  height_cm REAL,
  weight_kg REAL,
  activity_level TEXT,               -- sedentary, moderate, active, very_active
  goal TEXT,                         -- maintain, gain_muscle, lose_weight, balanced
  diet_preference TEXT,              -- veg, non_veg, egg
  allergies TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- WEEKLY MENUS
-- ============================================
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bhawan_id UUID NOT NULL REFERENCES bhawans(id),
  week_start DATE NOT NULL,          -- Monday of the week
  week_end DATE NOT NULL,            -- Sunday of the week
  image_url TEXT,                    -- Original uploaded menu image
  status menu_status DEFAULT 'draft',
  uploaded_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bhawan_id, week_start)      -- One menu per bhawan per week
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  day day_of_week NOT NULL,
  meal meal_type NOT NULL,
  item_name TEXT NOT NULL,
  item_order INTEGER DEFAULT 0,      -- Display order within meal
  food_id UUID REFERENCES food_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BHAWAN CHAT (weekly, per-bhawan)
-- ============================================
CREATE TABLE chat_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bhawan_id UUID NOT NULL REFERENCES bhawans(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  menu_id UUID REFERENCES menus(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bhawan_id, week_start)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_week_id UUID NOT NULL REFERENCES chat_weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  image_url TEXT,                     -- Optional image attachment
  reply_to UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PLATE ANALYSIS & MEAL LOGS
-- ============================================
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  bhawan_id UUID NOT NULL REFERENCES bhawans(id),
  meal_type meal_type NOT NULL,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,                    -- Plate photo
  ai_raw_response JSONB,            -- Raw Gemini response (for debugging)
  user_confirmed BOOLEAN DEFAULT false,
  total_calories REAL,
  total_protein REAL,
  total_carbs REAL,
  total_fat REAL,
  total_fiber REAL,
  confidence TEXT,                   -- low, moderate, high
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meal_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  food_id UUID REFERENCES food_items(id),
  portion portion_size DEFAULT 'medium',
  estimated_grams REAL,
  calories REAL,
  protein REAL,
  carbs REAL,
  fat REAL,
  fiber REAL,
  ai_detected BOOLEAN DEFAULT true,
  user_corrected BOOLEAN DEFAULT false
);

-- ============================================
-- COMPLAINTS
-- ============================================
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bhawan_id UUID NOT NULL REFERENCES bhawans(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  category complaint_category NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status complaint_status DEFAULT 'open',
  secretary_response TEXT,
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AI CHAT HISTORY
-- ============================================
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                -- 'user' or 'assistant'
  content TEXT NOT NULL,
  metadata JSONB,                    -- Context used (menu, logs, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_bhawan ON profiles(bhawan_id);
CREATE INDEX idx_menus_bhawan_week ON menus(bhawan_id, week_start);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_chat_messages_week ON chat_messages(chat_week_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, meal_date);
CREATE INDEX idx_complaints_bhawan ON complaints(bhawan_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_food_items_name ON food_items(name);
CREATE INDEX idx_food_items_category ON food_items(category);
