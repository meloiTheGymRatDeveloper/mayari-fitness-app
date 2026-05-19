-- evaluate_consistency: returns true if user's workout_current >= 80% of last 30 days
-- Uses a simple proxy: if the user has logged at least 24 workout sessions in last 30 days.
CREATE OR REPLACE FUNCTION public.evaluate_consistency(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    COUNT(DISTINCT started_at::date) >= 24
  FROM public.workout_sessions
  WHERE user_id = uid
    AND started_at >= now() - interval '30 days'
    AND ended_at IS NOT NULL;
$$;

-- calculate_referral_discount: counts active referrals, returns MIN(count*10, 50)
CREATE OR REPLACE FUNCTION public.calculate_referral_discount(uid uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT LEAST(COUNT(*) * 10, 50)::int
  FROM public.referrals
  WHERE referrer_id = uid
    AND status = 'active';
$$;
