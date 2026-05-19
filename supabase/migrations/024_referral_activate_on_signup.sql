-- Fix referral signup trigger: activate immediately on signup, update referrer discount_pct
-- Replaces the function body from 021_referral_signup_trigger.sql in place (no trigger DDL change needed).
-- Business rule: referral discount is credited at signup completion — there is no separate activation workflow.
-- The INSERT branch seeds 10 because this trigger fires once per referred-user row; each subsequent
-- referral for the same referrer goes through the DO UPDATE path (+10, capped at 50).

CREATE OR REPLACE FUNCTION public.create_referral_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    -- Silently abort if referrer doesn't exist (invalid code)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.referred_by) THEN
      RAISE WARNING 'create_referral_on_signup: referred_by % does not exist for new user %', NEW.referred_by, NEW.id;
      RETURN NEW;
    END IF;

    -- Insert referral as active immediately (not pending)
    INSERT INTO public.referrals (referrer_id, referred_user_id, status, activated_at)
    VALUES (NEW.referred_by, NEW.id, 'active', NOW())
    ON CONFLICT (referred_user_id) DO NOTHING;

    -- Upsert referrer's subscription row and increment discount (cap at 50)
    INSERT INTO public.subscriptions (user_id, referral_discount_pct)
    VALUES (NEW.referred_by, 10)
    ON CONFLICT (user_id) DO UPDATE
      SET referral_discount_pct = LEAST(
            public.subscriptions.referral_discount_pct + 10,
            50
          ),
          updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
