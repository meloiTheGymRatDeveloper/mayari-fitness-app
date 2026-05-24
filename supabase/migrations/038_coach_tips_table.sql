CREATE TABLE IF NOT EXISTS public.coach_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  tip_type text NOT NULL CHECK (tip_type IN ('nutrition','workout','streak','pr','general')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tips" ON public.coach_tips FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_coach_tips_user_created ON public.coach_tips(user_id, created_at DESC);
