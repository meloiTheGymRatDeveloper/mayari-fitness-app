-- supabase/migrations/011_coach_messages.sql
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text        NOT NULL,
  message_type text        NOT NULL DEFAULT 'chat'
                           CHECK (message_type IN ('chat', 'plan_generation', 'photo_analysis')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_messages_select_own" ON public.coach_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coach_messages_insert_own" ON public.coach_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE INDEX coach_messages_user_created_idx
  ON public.coach_messages (user_id, created_at);
