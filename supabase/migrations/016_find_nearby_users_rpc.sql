-- 016_find_nearby_users_rpc.sql
CREATE OR REPLACE FUNCTION public.find_nearby_users(
  my_lat float8,
  my_lng float8,
  radius_m float8,
  my_user_id uuid,
  goal_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  primary_goal text,
  experience_level text,
  workout_days int[],
  location_precision text,
  distance_m float8
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id,
    u.display_name,
    u.avatar_url,
    u.primary_goal,
    u.experience_level,
    u.workout_days,
    u.location_precision,
    ST_Distance(u.location, ST_MakePoint(my_lng, my_lat)::geography) AS distance_m
  FROM public.users u
  WHERE
    u.location IS NOT NULL
    AND u.id != my_user_id
    AND u.location_precision != 'hidden'
    AND (goal_filter IS NULL OR u.primary_goal = goal_filter)
    AND ST_DWithin(u.location, ST_MakePoint(my_lng, my_lat)::geography, radius_m)
    AND u.id NOT IN (
      SELECT receiver_id FROM public.buddy_requests
      WHERE sender_id = my_user_id AND status IN ('pending', 'accepted')
    )
    AND u.id NOT IN (
      SELECT user_b_id FROM public.buddy_connections WHERE user_a_id = my_user_id
      UNION
      SELECT user_a_id FROM public.buddy_connections WHERE user_b_id = my_user_id
    )
  ORDER BY distance_m ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_users(float8, float8, float8, uuid, text) TO authenticated;
