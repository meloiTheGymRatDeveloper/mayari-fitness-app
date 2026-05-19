-- Trigger function: update workout streak after a session is inserted
CREATE OR REPLACE FUNCTION public.update_workout_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_current int;
BEGIN
  -- Only count completed sessions (ended_at IS NOT NULL means session was completed)
  -- During INSERT, ended_at may already be set if passed in; guard accordingly
  IF NEW.ended_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN last_workout_date = CURRENT_DATE - 1 THEN workout_current + 1
    WHEN last_workout_date = CURRENT_DATE     THEN workout_current
    ELSE 1
  END INTO new_current
  FROM public.streaks
  WHERE user_id = NEW.user_id;

  -- If no row exists yet, new_current will be NULL → default to 1
  new_current := COALESCE(new_current, 1);

  INSERT INTO public.streaks (user_id, workout_current, workout_longest, last_workout_date)
  VALUES (NEW.user_id, new_current, new_current, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    workout_current   = new_current,
    workout_longest   = GREATEST(streaks.workout_longest, new_current),
    last_workout_date = CURRENT_DATE,
    updated_at        = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_workout_streak
  AFTER INSERT ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workout_streak();

-- Trigger function: update nutrition streak after a food log is inserted
CREATE OR REPLACE FUNCTION public.update_nutrition_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  meal_count  int;
  new_current int;
BEGIN
  SELECT COUNT(DISTINCT meal_slot) INTO meal_count
  FROM public.food_logs
  WHERE user_id = NEW.user_id
    AND (logged_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date;

  IF meal_count >= 3 THEN
    SELECT CASE
      WHEN last_nutrition_date = (now() AT TIME ZONE 'Asia/Manila')::date - 1 THEN nutrition_current + 1
      WHEN last_nutrition_date = (now() AT TIME ZONE 'Asia/Manila')::date     THEN nutrition_current
      ELSE 1
    END INTO new_current
    FROM public.streaks
    WHERE user_id = NEW.user_id;

    new_current := COALESCE(new_current, 1);

    INSERT INTO public.streaks (user_id, nutrition_current, nutrition_longest, last_nutrition_date)
    VALUES (NEW.user_id, new_current, new_current, (now() AT TIME ZONE 'Asia/Manila')::date)
    ON CONFLICT (user_id) DO UPDATE SET
      nutrition_current   = new_current,
      nutrition_longest   = GREATEST(streaks.nutrition_longest, new_current),
      last_nutrition_date = (now() AT TIME ZONE 'Asia/Manila')::date,
      updated_at          = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_nutrition_streak
  AFTER INSERT ON public.food_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nutrition_streak();
