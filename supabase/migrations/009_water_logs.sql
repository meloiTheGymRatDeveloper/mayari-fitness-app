CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_ml int NOT NULL DEFAULT 250,
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own water logs only" ON public.water_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX water_logs_user_date_idx ON public.water_logs (user_id, logged_at);
