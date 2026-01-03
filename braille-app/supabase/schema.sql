-- =============================================
-- Braillito Database Schema for Supabase
-- =============================================
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/avomkyofstiqxxhwrscw/sql
-- =============================================

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================
-- Extends Supabase auth.users with app-specific data

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    age_range TEXT CHECK (age_range IN ('child', 'teen', 'adult')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- 2. USER PROGRESS TABLE
-- =============================================
-- Stores learning progress, XP, streaks

CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_played_at TIMESTAMPTZ,
    levels_completed TEXT[] DEFAULT '{}',  -- Array of level IDs
    level_stars JSONB DEFAULT '{}',        -- {level_id: stars}
    letters_learned TEXT[] DEFAULT '{}',   -- Array of letters
    achievements TEXT[] DEFAULT '{}',      -- Array of achievement IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)  -- One progress record per user
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own progress
CREATE POLICY "Users can view own progress"
    ON public.user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON public.user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON public.user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- 3. USER SETTINGS TABLE
-- =============================================
-- Accessibility and preference settings

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screen_reader BOOLEAN DEFAULT FALSE,
    haptic_feedback BOOLEAN DEFAULT TRUE,
    high_contrast BOOLEAN DEFAULT FALSE,
    font_size TEXT DEFAULT 'large' CHECK (font_size IN ('normal', 'large', 'extra-large')),
    audio_speed REAL DEFAULT 1.0,
    timed_challenges BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- 4. PET STATE TABLE (Optional - for Braillito mascot)
-- =============================================

CREATE TABLE IF NOT EXISTS public.pet_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_type TEXT DEFAULT 'puppy',
    pet_name TEXT DEFAULT 'Braillito',
    pet_level INTEGER DEFAULT 1,
    pet_xp INTEGER DEFAULT 0,
    happiness INTEGER DEFAULT 100,
    stage INTEGER DEFAULT 1,
    last_interaction TIMESTAMPTZ,
    total_identify INTEGER DEFAULT 0,
    total_challenge_success INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.pet_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet"
    ON public.pet_state FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pet"
    ON public.pet_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet"
    ON public.pet_state FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- 5. TRIGGER: Auto-create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    -- Create empty progress record
    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.id);
    
    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    -- Create pet state
    INSERT INTO public.pet_state (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 6. INDEXES for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_state_user_id ON public.pet_state(user_id);
