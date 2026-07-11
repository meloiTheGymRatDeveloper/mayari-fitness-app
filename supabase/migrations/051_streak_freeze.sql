-- 051_streak_freeze.sql — "Pahinga Pass": auto-save a streak across a single
-- missed day, max 1 per rolling week per streak type.
-- Rule: user logs today, last log was exactly 2 days ago (one missed day), and
-- no freeze was consumed in the past 7 days for that streak type → streak
-- continues (+1) and the freeze is recorded on the missed day.
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS workout_freeze_used_on date;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS nutrition_freeze_used_on date;

CREATE OR REPLACE FUNCTION public.update_workout_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_current int;
  use_freeze  boolean := false;
BEGIN
  -- Only count completed sessions (ended_at IS NOT NULL means session was completed)
  IF NEW.ended_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN last_workout_date = CURRENT_DATE - 1 THEN workout_current + 1
    WHEN last_workout_date = CURRENT_DATE     THEN workout_current
    WHEN last_workout_date = CURRENT_DATE - 2
         AND (workout_freeze_used_on IS NULL OR workout_freeze_used_on < CURRENT_DATE - 7)
      THEN workout_current + 1
    ELSE 1
  END,
  (last_workout_date = CURRENT_DATE - 2
   AND (workout_freeze_used_on IS NULL OR workout_freeze_used_on < CURRENT_DATE - 7))
  INTO new_current, use_freeze
  FROM public.streaks
  WHERE user_id = NEW.user_id;

  -- If no row exists yet, new_current will be NULL → default to 1
  new_current := COALESCE(new_current, 1);
  use_freeze  := COALESCE(use_freeze, false);

  INSERT INTO public.streaks (user_id, workout_current, workout_longest, last_workout_date)
  VALUES (NEW.user_id, new_current, new_current, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    workout_current        = new_current,
    workout_longest        = GREATEST(streaks.workout_longest, new_current),
    last_workout_date      = CURRENT_DATE,
    workout_freeze_used_on = CASE WHEN use_freeze THEN CURRENT_DATE - 1 ELSE streaks.workout_freeze_used_on END,
    updated_at             = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_nutrition_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  meal_count  int;
  new_current int;
  use_freeze  boolean := false;
  manila_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
  SELECT COUNT(DISTINCT meal_slot) INTO meal_count
  FROM public.food_logs
  WHERE user_id = NEW.user_id
    AND (logged_at AT TIME ZONE 'Asia/Manila')::date = manila_today;

  IF meal_count >= 3 THEN
    SELECT CASE
      WHEN last_nutrition_date = manila_today - 1 THEN nutrition_current + 1
      WHEN last_nutrition_date = manila_today     THEN nutrition_current
      WHEN last_nutrition_date = manila_today - 2
           AND (nutrition_freeze_used_on IS NULL OR nutrition_freeze_used_on < manila_today - 7)
        THEN nutrition_current + 1
      ELSE 1
    END,
    (last_nutrition_date = manila_today - 2
     AND (nutrition_freeze_used_on IS NULL OR nutrition_freeze_used_on < manila_today - 7))
    INTO new_current, use_freeze
    FROM public.streaks
    WHERE user_id = NEW.user_id;

    new_current := COALESCE(new_current, 1);
    use_freeze  := COALESCE(use_freeze, false);

    INSERT INTO public.streaks (user_id, nutrition_current, nutrition_longest, last_nutrition_date)
    VALUES (NEW.user_id, new_current, new_current, manila_today)
    ON CONFLICT (user_id) DO UPDATE SET
      nutrition_current        = new_current,
      nutrition_longest        = GREATEST(streaks.nutrition_longest, new_current),
      last_nutrition_date      = manila_today,
      nutrition_freeze_used_on = CASE WHEN use_freeze THEN manila_today - 1 ELSE streaks.nutrition_freeze_used_on END,
      updated_at               = now();
  END IF;
  RETURN NEW;
END;
$$;

-- SQL test cases (run manually in the SQL editor against a test user):
-- Setup: streaks row with workout_current=10, last_workout_date=CURRENT_DATE-2, workout_freeze_used_on=NULL
-- Case 1 (freeze fires): insert completed workout_session today → workout_current=11, freeze_used_on=CURRENT_DATE-1
-- Case 2 (freeze on cooldown): freeze_used_on=CURRENT_DATE-5, last=CURRENT_DATE-2 → reset to 1
-- Case 3 (2-day gap): last_workout_date=CURRENT_DATE-3 → reset to 1
-- Case 4 (normal consecutive): last=CURRENT_DATE-1 → +1, freeze_used_on unchanged
