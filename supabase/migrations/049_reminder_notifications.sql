-- 049_reminder_notifications.sql
-- Nutrition logging reminder, win-back, weigh-in reminder: user prefs + cron jobs.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_nutrition_enabled boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_winback_enabled boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notif_weighin text DEFAULT 'weekly'
  CHECK (notif_weighin IN ('off','weekly','monthly'));

-- Idempotent re-scheduling
SELECT cron.unschedule(jobname)
FROM   cron.job
WHERE  jobname IN ('nutrition-reminder-lunch','nutrition-reminder-evening','winback-daily','weighin-daily');

-- 11:00 / 19:00 Manila = 03:00 / 11:00 UTC. Function infers lunch/evening from Manila hour.
SELECT cron.schedule('nutrition-reminder-lunch',   '0 3 * * *',  $$SELECT public.call_edge_function('notify-nutrition-reminder')$$);
SELECT cron.schedule('nutrition-reminder-evening', '0 11 * * *', $$SELECT public.call_edge_function('notify-nutrition-reminder')$$);
-- 12:00 Manila daily
SELECT cron.schedule('winback-daily', '0 4 * * *', $$SELECT public.call_edge_function('notify-winback')$$);
-- 08:00 Manila daily (function itself gates on Sunday / 1st of month)
SELECT cron.schedule('weighin-daily', '0 0 * * *', $$SELECT public.call_edge_function('notify-weighin-reminder')$$);
