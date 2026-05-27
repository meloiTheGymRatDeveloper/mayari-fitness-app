-- 044_mayari_cron_jobs.sql
-- Schedule mayari-analyze on multiple daily runs (PH time = UTC+8)
-- 08:00 PHT = 00:00 UTC, 15:00 PHT = 07:00 UTC, 20:00 PHT = 12:00 UTC

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('mayari-analyze-morning', 'mayari-analyze-afternoon', 'mayari-analyze-evening', 'mayari-analyze-weekly');

-- Morning run: post-weekend reset (Mondays), rest-day-tomorrow, weekly patterns
SELECT cron.schedule('mayari-analyze-morning',   '0 0 * * *', $$SELECT public.call_edge_function('mayari-analyze')$$);

-- Afternoon run: water reminder (checks if < 500ml by 3pm PHT), workout silence
SELECT cron.schedule('mayari-analyze-afternoon', '0 7 * * *', $$SELECT public.call_edge_function('mayari-analyze')$$);

-- Evening run: consecutive days check, subscription lapse
SELECT cron.schedule('mayari-analyze-evening',   '0 12 * * *', $$SELECT public.call_edge_function('mayari-analyze')$$);

-- Weekly deep analysis: plateau, food variety, protein on rest days, late workouts
-- Sunday 09:00 PHT = 01:00 UTC
SELECT cron.schedule('mayari-analyze-weekly', '0 1 * * 0', $$SELECT public.call_edge_function('mayari-analyze')$$);
