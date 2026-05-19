-- exercises: seeded from Wger, publicly readable, admin-only writes
CREATE TABLE IF NOT EXISTS public.exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  muscle_group text NOT NULL CHECK (muscle_group IN ('push','pull','legs','core')),
  muscles_primary text[] NOT NULL DEFAULT '{}',
  muscles_secondary text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises are publicly readable" ON public.exercises
  FOR SELECT USING (true);

-- workout_plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  split_type text NOT NULL,
  days_per_week int NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  generated_by text NOT NULL DEFAULT 'client',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own plans only" ON public.workout_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- workout_sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_volume_kg decimal NOT NULL DEFAULT 0,
  notes text,
  xp_earned int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own sessions only" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id);

-- workout_sets (access controlled via session ownership)
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  weight_kg decimal NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  is_warmup boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sets" ON public.workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- personal_records (one row per user+exercise, upserted on new bests)
CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  weight_kg decimal NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own PRs only" ON public.personal_records
  FOR ALL USING (auth.uid() = user_id);
