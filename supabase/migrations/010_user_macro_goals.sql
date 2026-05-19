ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS calorie_goal int,
  ADD COLUMN IF NOT EXISTS protein_goal_g decimal,
  ADD COLUMN IF NOT EXISTS carbs_goal_g decimal,
  ADD COLUMN IF NOT EXISTS fat_goal_g decimal;
