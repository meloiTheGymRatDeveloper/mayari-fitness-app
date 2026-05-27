-- 043_mayari_trigger_system.sql

-- 1. Add trigger_event column (nullable — existing tips have none)
ALTER TABLE public.coach_tips
  ADD COLUMN IF NOT EXISTS trigger_event text;

-- 2. Drop old CHECK and replace with expanded set
ALTER TABLE public.coach_tips
  DROP CONSTRAINT IF EXISTS coach_tips_tip_type_check;

ALTER TABLE public.coach_tips
  ADD CONSTRAINT coach_tips_tip_type_check CHECK (
    tip_type IN (
      'nutrition','workout','streak','pr','general',
      'insight','risk','achievement'
    )
  );

-- 3. Index for deduplication queries by trigger_event
CREATE INDEX IF NOT EXISTS idx_coach_tips_trigger_event
  ON public.coach_tips(user_id, trigger_event, created_at DESC)
  WHERE trigger_event IS NOT NULL;
