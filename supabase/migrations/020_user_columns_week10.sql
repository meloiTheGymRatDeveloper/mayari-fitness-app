ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS units_pref text DEFAULT 'metric'
  CHECK (units_pref IN ('metric', 'imperial'));

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_workout_enabled boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_workout_time text DEFAULT '07:00'
  CHECK (notif_workout_time ~ '^\d{2}:\d{2}$');
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_weekly_summary boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_streak_alert boolean DEFAULT true;
