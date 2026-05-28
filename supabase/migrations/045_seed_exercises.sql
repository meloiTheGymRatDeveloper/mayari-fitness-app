-- Seed exercises table with the 23 core exercises from constants/exercises.ts.
-- IDs are slug-based (matching EXERCISE_ALTERNATIVES keys) so workout plans
-- can look them up and the exercise-form GIF cache (which searches by name) works.
-- ON CONFLICT DO NOTHING so re-running the migration is safe.

INSERT INTO public.exercises (id, name, muscle_group, muscles_primary, muscles_secondary, equipment, category, description)
VALUES
  ('bench-press',         'Bench Press',            'push', ARRAY['Pectoralis major'],                       ARRAY['Triceps brachii','Anterior deltoid'],       ARRAY['Barbell','Bench'],          'Chest',     'Compound chest press with barbell.'),
  ('squat',               'Squat',                  'legs', ARRAY['Quadriceps femoris'],                     ARRAY['Gluteus maximus','Biceps femoris'],          ARRAY['Barbell'],                  'Legs',      'Compound lower body barbell squat.'),
  ('deadlift',            'Deadlift',               'pull', ARRAY['Gluteus maximus','Biceps femoris'],       ARRAY['Latissimus dorsi','Trapezius'],              ARRAY['Barbell'],                  'Back',      'Hip-hinge compound pull.'),
  ('overhead-press',      'Overhead Press',         'push', ARRAY['Anterior deltoid'],                       ARRAY['Triceps brachii'],                          ARRAY['Barbell'],                  'Shoulders', 'Standing barbell shoulder press.'),
  ('barbell-row',         'Barbell Row',            'pull', ARRAY['Latissimus dorsi'],                       ARRAY['Biceps brachii','Trapezius'],               ARRAY['Barbell'],                  'Back',      'Bent-over barbell row.'),
  ('pull-up',             'Pull-up',                'pull', ARRAY['Latissimus dorsi'],                       ARRAY['Biceps brachii'],                          ARRAY['Pull-up bar'],              'Back',      'Bodyweight vertical pull.'),
  ('dip',                 'Dip',                    'push', ARRAY['Pectoralis major','Triceps brachii'],     ARRAY['Anterior deltoid'],                        ARRAY['Pull-up bar'],              'Chest',     'Bodyweight dip for chest and triceps.'),
  ('lunge',               'Lunge',                  'legs', ARRAY['Quadriceps femoris'],                     ARRAY['Gluteus maximus'],                         ARRAY['none'],                     'Legs',      'Unilateral leg exercise.'),
  ('leg-press',           'Leg Press',              'legs', ARRAY['Quadriceps femoris'],                     ARRAY['Gluteus maximus','Biceps femoris'],          ARRAY['Leg press machine'],        'Legs',      'Machine compound leg press.'),
  ('romanian-deadlift',   'Romanian Deadlift',      'legs', ARRAY['Biceps femoris'],                         ARRAY['Gluteus maximus'],                         ARRAY['Barbell'],                  'Legs',      'Hip-hinge hamstring focus.'),
  ('plank',               'Plank',                  'core', ARRAY['Rectus abdominis'],                       ARRAY['Obliquus externus abdominis'],              ARRAY['none'],                     'Abs',       'Static core stability hold.'),
  ('incline-bench',       'Incline Bench Press',    'push', ARRAY['Pectoralis major (upper)'],               ARRAY['Anterior deltoid','Triceps brachii'],       ARRAY['Barbell','Incline bench'],  'Chest',     'Upper chest focused bench press.'),
  ('cable-row',           'Cable Row',              'pull', ARRAY['Latissimus dorsi'],                       ARRAY['Biceps brachii'],                          ARRAY['Cable machine'],            'Back',      'Seated cable row for mid-back.'),
  ('lat-pulldown',        'Lat Pulldown',           'pull', ARRAY['Latissimus dorsi'],                       ARRAY['Biceps brachii'],                          ARRAY['Cable machine'],            'Back',      'Cable lat pulldown.'),
  ('leg-curl',            'Leg Curl',               'legs', ARRAY['Biceps femoris'],                         ARRAY[]::text[],                                  ARRAY['Leg curl machine'],         'Legs',      'Machine hamstring curl.'),
  ('calf-raise',          'Calf Raise',             'legs', ARRAY['Gastrocnemius'],                          ARRAY[]::text[],                                  ARRAY['none'],                     'Calves',    'Standing calf raise.'),
  ('dumbbell-fly',        'Dumbbell Fly',           'push', ARRAY['Pectoralis major'],                       ARRAY['Anterior deltoid'],                        ARRAY['Dumbbell','Bench'],         'Chest',     'Chest isolation fly with dumbbells. Same pec recruitment as bench press with less tricep involvement.'),
  ('pec-deck',            'Pec Deck',               'push', ARRAY['Pectoralis major'],                       ARRAY[]::text[],                                  ARRAY['Cable machine'],            'Chest',     'Machine chest fly. Direct pec isolation, equivalent movement pattern to bench press.'),
  ('dumbbell-press',      'Dumbbell Bench Press',   'push', ARRAY['Pectoralis major'],                       ARRAY['Triceps brachii','Anterior deltoid'],       ARRAY['Dumbbell','Bench'],         'Chest',     'Dumbbell variation of bench press. Greater range of motion than barbell.'),
  ('face-pull',           'Face Pull',              'pull', ARRAY['Posterior deltoid','Trapezius'],          ARRAY['Biceps brachii'],                          ARRAY['Cable machine'],            'Shoulders', 'Cable rear delt exercise. Balances pressing volume and improves shoulder health.'),
  ('barbell-curl',        'Barbell Curl',           'pull', ARRAY['Biceps brachii'],                         ARRAY['Brachialis'],                              ARRAY['Barbell'],                  'Arms',      'Barbell bicep curl.'),
  ('dumbbell-curl',       'Dumbbell Curl',          'pull', ARRAY['Biceps brachii'],                         ARRAY['Brachialis'],                              ARRAY['Dumbbell'],                 'Arms',      'Dumbbell bicep curl, unilateral.'),
  ('tricep-pushdown',     'Tricep Pushdown',        'push', ARRAY['Triceps brachii'],                        ARRAY[]::text[],                                  ARRAY['Cable machine'],            'Arms',      'Cable tricep isolation.')
ON CONFLICT (id) DO NOTHING;
