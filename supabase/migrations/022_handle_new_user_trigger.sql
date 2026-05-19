CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_referral_code text;
  v_referred_by   uuid;
  v_referrer_code text;
BEGIN
  -- Generate a unique 8-char referral code
  LOOP
    v_referral_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = v_referral_code);
  END LOOP;

  -- Resolve referred_by from signup metadata
  v_referrer_code := NEW.raw_user_meta_data->>'referred_by_code';
  IF v_referrer_code IS NOT NULL AND v_referrer_code <> '' THEN
    SELECT id INTO v_referred_by
    FROM public.users
    WHERE referral_code = upper(trim(v_referrer_code))
    LIMIT 1;
  END IF;

  INSERT INTO public.users (id, referral_code, referred_by)
  VALUES (NEW.id, v_referral_code, v_referred_by);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
