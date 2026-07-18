-- 052: Auto-expire beta (tester) Pro grants.
-- Manual beta grants set subscription_expires_at but nothing downgrades the
-- status when it passes — paying tiers are downgraded by payment webhooks,
-- beta grants have no webhook. Daily job flips lapsed betas back to free.
-- Runs at 00:15 UTC (08:15 PH), before mayari-analyze's morning pass.

SELECT cron.schedule(
  'expire-beta-subscriptions',
  '15 0 * * *',
  $$
  UPDATE public.users
  SET subscription_status = 'free'
  WHERE subscription_status = 'beta'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < now()
  $$
);
