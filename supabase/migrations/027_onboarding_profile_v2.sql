-- 027_onboarding_profile_v2.sql
-- Adds gender, activity_level, body_fat_pct to users table for
-- onboarding v2 (8-step wizard with TDEE computation).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('male','female','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS activity_level text
    CHECK (activity_level IN (
      'sedentary','lightly_active','moderately_active',
      'very_active','extremely_active'
    )),
  ADD COLUMN IF NOT EXISTS body_fat_pct decimal;
