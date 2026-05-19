CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paymongo_customer_id text,
  paymongo_subscription_id text,
  tier text DEFAULT 'free',
  price_paid_cents int,
  current_period_start timestamptz,
  current_period_end timestamptz,
  referral_discount_pct int DEFAULT 0,
  consistency_discount_pct int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own subscription only" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
