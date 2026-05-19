CREATE TABLE IF NOT EXISTS public.food_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_item_id)
);

ALTER TABLE public.food_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own food pins"
  ON public.food_pins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
