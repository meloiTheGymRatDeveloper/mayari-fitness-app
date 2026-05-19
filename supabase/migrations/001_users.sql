CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  birthdate date,
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal text CHECK (primary_goal IN ('build_muscle', 'lose_fat', 'maintain', 'improve_fitness')),
  equipment_type text CHECK (equipment_type IN ('full_gym', 'dumbbells', 'barbell', 'bodyweight')),
  workout_days int[],
  session_duration_min int,
  body_weight_kg decimal,
  height_cm decimal,
  target_weight_kg decimal,
  language_pref text DEFAULT 'en' CHECK (language_pref IN ('en', 'fil')),
  meal_time_style text DEFAULT 'filipino' CHECK (meal_time_style IN ('filipino', 'generic')),
  location_lat decimal,
  location_lng decimal,
  location_precision text DEFAULT 'approx' CHECK (location_precision IN ('exact', 'approx', 'hidden')),
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'beta', 'active', 'achiever')),
  subscription_expires_at timestamptz,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own row" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
