CREATE TABLE IF NOT EXISTS public.streaks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_current int DEFAULT 0,
  workout_longest int DEFAULT 0,
  nutrition_current int DEFAULT 0,
  nutrition_longest int DEFAULT 0,
  last_workout_date date,
  last_nutrition_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own streaks only" ON public.streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
