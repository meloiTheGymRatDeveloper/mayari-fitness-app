CREATE TABLE IF NOT EXISTS public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
  meal_slot text NOT NULL CHECK (meal_slot IN ('almusal','tanghalian','merienda','hapunan')),
  quantity_g decimal NOT NULL DEFAULT 100,
  logged_at timestamptz DEFAULT now(),
  photo_url text,
  ai_estimated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own food logs only" ON public.food_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX food_logs_user_date_idx ON public.food_logs (user_id, logged_at);
