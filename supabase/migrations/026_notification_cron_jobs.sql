CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper called by pg_cron to invoke an Edge Function with service-role auth
CREATE OR REPLACE FUNCTION public.call_edge_function(fn_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url  text := current_setting('app.supabase_url',     true);
  v_key  text := current_setting('app.service_role_key', true);
BEGIN
  IF fn_name !~ '^[a-z0-9][a-z0-9-]*$' THEN
    RAISE EXCEPTION 'call_edge_function: invalid fn_name %', fn_name;
  END IF;
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'call_edge_function: app.supabase_url or app.service_role_key not configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.call_edge_function(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.call_edge_function(text) TO postgres;

-- Remove existing jobs before (re-)scheduling so this migration is idempotent
SELECT cron.unschedule(jobname)
FROM   cron.job
WHERE  jobname IN ('workout-reminder', 'streak-alert', 'weekly-summary');

SELECT cron.schedule('workout-reminder', '0 * * * *',  $$SELECT public.call_edge_function('notify-workout-reminder')$$);
SELECT cron.schedule('streak-alert',     '0 15 * * *', $$SELECT public.call_edge_function('notify-streak-alert')$$);
SELECT cron.schedule('weekly-summary',   '0 12 * * 0', $$SELECT public.call_edge_function('notify-weekly-summary')$$);
