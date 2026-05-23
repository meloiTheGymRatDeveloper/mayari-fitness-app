-- 032_food_submissions.sql

-- Add is_admin to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create food_submissions table
CREATE TABLE public.food_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_fil text,
  brand text,
  barcode text,
  calories_per_100g decimal,
  protein_per_100g decimal,
  carbs_per_100g decimal,
  fat_per_100g decimal,
  fiber_per_100g decimal,
  is_ph_local boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.food_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_submissions" ON public.food_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "users_read_own_submissions" ON public.food_submissions
  FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "admins_all_submissions" ON public.food_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Add 'community' to food_items source constraint
ALTER TABLE public.food_items DROP CONSTRAINT IF EXISTS food_items_source_check;
ALTER TABLE public.food_items ADD CONSTRAINT food_items_source_check
  CHECK (source IN ('custom', 'open_food_facts', 'ph_seed', 'usda', 'community'));

-- Add updated_at column
ALTER TABLE public.food_submissions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Fix admin policy to include explicit WITH CHECK
DROP POLICY IF EXISTS "admins_all_submissions" ON public.food_submissions;
CREATE POLICY "admins_all_submissions" ON public.food_submissions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Add performance indexes
CREATE INDEX IF NOT EXISTS food_submissions_submitted_by_idx ON public.food_submissions (submitted_by);
CREATE INDEX IF NOT EXISTS food_submissions_status_idx ON public.food_submissions (status);
