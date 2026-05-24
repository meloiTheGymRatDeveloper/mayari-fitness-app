-- form_gif_url was added in 039_form_gif_url.sql
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS instructions jsonb;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS workoutx_target text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS workoutx_equipment text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS workoutx_difficulty text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS workoutx_body_part text;
