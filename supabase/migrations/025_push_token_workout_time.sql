-- push_token and notif_workout_time already exist from migration 020.
-- Only update the default reminder time to 6pm (Manila).
ALTER TABLE public.users
  ALTER COLUMN notif_workout_time SET DEFAULT '18:00';
