-- 035_food_submissions_sodium.sql
ALTER TABLE public.food_submissions
  ADD COLUMN IF NOT EXISTS sodium_mg_per_100g decimal;
