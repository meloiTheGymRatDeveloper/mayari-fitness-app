-- 050_referral_welcome_discount.sql
-- Referred users get ₱20 off their FIRST successful monthly/beta payment.
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS welcome_discount_status text DEFAULT 'available'
  CHECK (welcome_discount_status IN ('available','redeemed'));

-- Backfill: referred users who have already paid don't get the welcome discount retroactively.
UPDATE public.referrals r
SET    welcome_discount_status = 'redeemed'
WHERE  EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE  s.user_id = r.referred_user_id
    AND  s.price_paid_cents IS NOT NULL
    AND  s.price_paid_cents > 0
);
