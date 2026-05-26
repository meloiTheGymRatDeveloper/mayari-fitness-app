import type { PlanData, PlannedExercise } from '../types/database';

function ex(
  exercise_id: string,
  exercise_name: string,
  muscle_group: PlannedExercise['muscle_group'],
  sets: number,
  reps_low: number,
  reps_high: number,
  rest_seconds: number,
): PlannedExercise {
  return { exercise_id, exercise_name, muscle_group, sets, reps_low, reps_high, rest_seconds };
}

// ─── 2x / Week ────────────────────────────────────────────────────────────────

const plan_2x30: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',      'Barbell Squat',      'legs', 2, 5,  8,  180),
        ex('bench-press',        'Bench Press',         'push', 2, 5,  8,  180),
        ex('seated-cable-row',   'Seated Cable Row',    'pull', 2, 8,  12, 150),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift',  'Romanian Deadlift',   'legs', 2, 6,  10, 180),
        ex('overhead-press',     'Overhead Press',      'push', 2, 6,  10, 180),
        ex('lat-pulldown',       'Lat Pulldown',        'pull', 2, 8,  12, 150),
      ],
    },
  ],
};

const plan_2x45: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',            'Barbell Squat',          'legs', 3, 5,  8,  180),
        ex('bench-press',              'Bench Press',             'push', 3, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 2, 12, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift',        'Romanian Deadlift',       'legs', 3, 6,  10, 180),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('lat-pulldown',             'Lat Pulldown',            'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',            'Dumbbell Curl',           'pull', 2, 10, 15, 90),
      ],
    },
  ],
};

const plan_2x60: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',            'Barbell Squat',          'legs', 3, 5,  8,  180),
        ex('bench-press',              'Bench Press',             'push', 3, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 3, 8,  12, 150),
        ex('leg-curl-machine',         'Leg Curl Machine',        'legs', 2, 10, 15, 90),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 3, 12, 15, 90),
        ex('tricep-pushdown',          'Tricep Pushdown',         'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift',        'Romanian Deadlift',       'legs', 3, 6,  10, 180),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('lat-pulldown',             'Lat Pulldown',            'pull', 3, 8,  12, 150),
        ex('leg-press',                'Leg Press',               'legs', 2, 10, 15, 150),
        ex('rear-delt-fly-machine',    'Rear Delt Fly Machine',   'pull', 3, 12, 15, 90),
        ex('dumbbell-curl',            'Dumbbell Curl',           'pull', 2, 10, 15, 90),
      ],
    },
  ],
};

const plan_2x75: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',            'Barbell Squat',          'legs', 4, 5,  8,  180),
        ex('bench-press',              'Bench Press',             'push', 4, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 4, 8,  12, 150),
        ex('leg-curl-machine',         'Leg Curl Machine',        'legs', 3, 10, 15, 90),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 3, 12, 15, 90),
        ex('tricep-pushdown',          'Tricep Pushdown',         'push', 3, 10, 15, 90),
        ex('standing-calf-raise',      'Standing Calf Raise',     'legs', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift',        'Romanian Deadlift',       'legs', 4, 6,  10, 180),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 4, 8,  12, 150),
        ex('lat-pulldown',             'Lat Pulldown',            'pull', 4, 8,  12, 150),
        ex('leg-press',                'Leg Press',               'legs', 3, 10, 15, 150),
        ex('chest-supported-row',      'Chest Supported Row',     'pull', 3, 8,  12, 150),
        ex('rear-delt-fly-machine',    'Rear Delt Fly Machine',   'pull', 3, 12, 15, 90),
        ex('dumbbell-curl',            'Dumbbell Curl',           'pull', 3, 10, 15, 90),
        ex('seated-calf-raise',        'Seated Calf Raise',       'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_2x90: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',            'Barbell Squat',          'legs', 4, 5,  8,  180),
        ex('bench-press',              'Bench Press',             'push', 4, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 4, 8,  12, 150),
        ex('leg-curl-machine',         'Leg Curl Machine',        'legs', 3, 10, 15, 90),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 4, 12, 15, 90),
        ex('pec-deck-machine',         'Pec Deck Machine',        'push', 3, 10, 15, 90),
        ex('tricep-pushdown',          'Tricep Pushdown',         'push', 3, 10, 15, 90),
        ex('standing-calf-raise',      'Standing Calf Raise',     'legs', 4, 10, 15, 90),
        ex('cable-crunch',             'Cable Crunch',            'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift',          'Romanian Deadlift',        'legs', 4, 6,  10, 180),
        ex('incline-dumbbell-press',     'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('lat-pulldown',               'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('leg-press',                  'Leg Press',                'legs', 4, 10, 15, 150),
        ex('chest-supported-row',        'Chest Supported Row',      'pull', 3, 8,  12, 150),
        ex('rear-delt-fly-machine',      'Rear Delt Fly Machine',    'pull', 4, 12, 15, 90),
        ex('dumbbell-curl',              'Dumbbell Curl',            'pull', 3, 10, 15, 90),
        ex('overhead-tricep-extension',  'Overhead Tricep Extension','push', 3, 10, 15, 90),
        ex('seated-calf-raise',          'Seated Calf Raise',        'legs', 4, 10, 15, 90),
        ex('hanging-leg-raise',          'Hanging Leg Raise',        'core', 3, 10, 15, 90),
      ],
    },
  ],
};

// ─── 3x / Week ────────────────────────────────────────────────────────────────

const plan_3x30: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',    'Barbell Squat',    'legs', 2, 5, 8,  180),
        ex('bench-press',      'Bench Press',       'push', 2, 5, 8,  180),
        ex('seated-cable-row', 'Seated Cable Row',  'pull', 2, 8, 12, 150),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift', 'Romanian Deadlift', 'legs', 2, 6, 10, 180),
        ex('overhead-press',    'Overhead Press',    'push', 2, 6, 10, 180),
        ex('lat-pulldown',      'Lat Pulldown',      'pull', 2, 8, 12, 150),
      ],
    },
    {
      day_label: 'Full Body 3',
      exercises: [
        ex('leg-press',              'Leg Press',              'legs', 2, 10, 15, 150),
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 2, 8,  12, 150),
        ex('chest-supported-row',    'Chest Supported Row',    'pull', 2, 8,  12, 150),
      ],
    },
  ],
};

const plan_3x45: PlanData = {
  days: [
    {
      day_label: 'Full Body 1',
      exercises: [
        ex('barbell-squat',          'Barbell Squat',          'legs', 3, 5,  8,  180),
        ex('bench-press',            'Bench Press',             'push', 3, 5,  8,  180),
        ex('seated-cable-row',       'Seated Cable Row',        'pull', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise',  'push', 2, 12, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 2',
      exercises: [
        ex('romanian-deadlift', 'Romanian Deadlift', 'legs', 3, 6,  10, 180),
        ex('overhead-press',    'Overhead Press',    'push', 3, 6,  10, 180),
        ex('lat-pulldown',      'Lat Pulldown',      'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',     'Dumbbell Curl',     'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Full Body 3',
      exercises: [
        ex('leg-press',              'Leg Press',              'legs', 3, 10, 15, 150),
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('chest-supported-row',    'Chest Supported Row',    'pull', 3, 8,  12, 150),
        ex('tricep-pushdown',        'Tricep Pushdown',        'push', 2, 10, 15, 90),
      ],
    },
  ],
};

const plan_3x60: PlanData = {
  days: [
    {
      day_label: 'Upper Body',
      exercises: [
        ex('bench-press',              'Bench Press',             'push', 3, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 3, 8,  12, 150),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('lat-pulldown',             'Lat Pulldown',            'pull', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 3, 12, 15, 90),
        ex('dumbbell-curl',            'Dumbbell Curl',           'pull', 2, 10, 15, 90),
        ex('tricep-pushdown',          'Tricep Pushdown',         'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('barbell-squat',       'Barbell Squat',       'legs', 4, 5,  8,  180),
        ex('romanian-deadlift',   'Romanian Deadlift',   'legs', 3, 6,  10, 180),
        ex('leg-press',           'Leg Press',           'legs', 3, 10, 15, 150),
        ex('leg-curl-machine',    'Leg Curl Machine',    'legs', 3, 10, 15, 90),
        ex('standing-calf-raise', 'Standing Calf Raise', 'legs', 3, 10, 15, 90),
        ex('cable-crunch',        'Cable Crunch',        'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Full Body',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 3, 8,  12, 150),
        ex('chest-supported-row',       'Chest Supported Row',      'pull', 3, 8,  12, 150),
        ex('bulgarian-split-squat',     'Bulgarian Split Squat',    'legs', 3, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 3, 8,  12, 150),
        ex('rear-delt-fly-machine',     'Rear Delt Fly Machine',    'pull', 3, 12, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 2, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 2, 10, 15, 90),
      ],
    },
  ],
};

const plan_3x75: PlanData = {
  days: [
    {
      day_label: 'Upper Body',
      exercises: [
        ex('bench-press',              'Bench Press',             'push', 4, 5,  8,  180),
        ex('seated-cable-row',         'Seated Cable Row',        'pull', 4, 8,  12, 150),
        ex('incline-dumbbell-press',   'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('lat-pulldown',             'Lat Pulldown',            'pull', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',  'Dumbbell Shoulder Press', 'push', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  'push', 4, 12, 15, 90),
        ex('dumbbell-curl',            'Dumbbell Curl',           'pull', 3, 10, 15, 90),
        ex('tricep-pushdown',          'Tricep Pushdown',         'push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 4, 5,  8,  180),
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 3, 10, 15, 90),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Full Body',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('chest-supported-row',       'Chest Supported Row',      'pull', 4, 8,  12, 150),
        ex('hack-squat-machine',        'Hack Squat Machine',       'legs', 3, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 3, 8,  12, 150),
        ex('rear-delt-fly-machine',     'Rear Delt Fly Machine',    'pull', 4, 12, 15, 90),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
        ex('seated-calf-raise',         'Seated Calf Raise',        'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_3x90: PlanData = {
  days: [
    {
      day_label: 'Push',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 4, 5,  8,  180),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('romanian-deadlift',      'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('lat-pulldown',           'Lat Pulldown',         'pull', 4, 8,  12, 150),
        ex('chest-supported-row',    'Chest Supported Row',  'pull', 4, 8,  12, 150),
        ex('seated-cable-row',       'Seated Cable Row',     'pull', 3, 10, 12, 150),
        ex('rear-delt-fly-machine',  'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',          'Dumbbell Curl',        'pull', 3, 10, 15, 90),
        ex('hammer-curl',            'Hammer Curl',          'pull', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 4, 5,  8,  180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 3, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 3, 12, 15, 90),
      ],
    },
  ],
};

// ─── 4x / Week ────────────────────────────────────────────────────────────────

const plan_4x30: PlanData = {
  days: [
    {
      day_label: 'Upper Body 1',
      exercises: [
        ex('bench-press',      'Bench Press',      'push', 2, 5, 8,  180),
        ex('seated-cable-row', 'Seated Cable Row',  'pull', 2, 8, 12, 150),
        ex('overhead-press',   'Overhead Press',   'push', 2, 6, 10, 180),
      ],
    },
    {
      day_label: 'Lower Body 1',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 3, 5,  8,  180),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body 2',
      exercises: [
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 2, 8, 12, 150),
        ex('lat-pulldown',           'Lat Pulldown',           'pull', 2, 8, 12, 150),
        ex('chest-supported-row',    'Chest Supported Row',    'pull', 2, 8, 12, 150),
      ],
    },
    {
      day_label: 'Lower Body 2',
      exercises: [
        ex('romanian-deadlift', 'Romanian Deadlift', 'legs', 3, 6,  10, 180),
        ex('leg-press',         'Leg Press',         'legs', 2, 10, 15, 150),
      ],
    },
  ],
};

const plan_4x45: PlanData = {
  days: [
    {
      day_label: 'Upper Body 1',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 3, 5,  8,  180),
        ex('seated-cable-row',       'Seated Cable Row',       'pull', 3, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 2, 12, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 1',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 4, 5,  8,  180),
        ex('leg-press',       'Leg Press',       'legs', 3, 10, 15, 150),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body 2',
      exercises: [
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('lat-pulldown',           'Lat Pulldown',           'pull', 3, 8,  12, 150),
        ex('chest-supported-row',    'Chest Supported Row',    'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',          'Dumbbell Curl',          'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_4x60: PlanData = {
  days: [
    {
      day_label: 'Upper Body 1',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 4, 5,  8,  180),
        ex('seated-cable-row',       'Seated Cable Row',       'pull', 4, 8,  12, 150),
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('lat-pulldown',           'Lat Pulldown',           'pull', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 3, 12, 15, 90),
        ex('tricep-pushdown',        'Tricep Pushdown',        'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 1',
      exercises: [
        ex('barbell-squat',       'Barbell Squat',       'legs', 4, 5,  8,  180),
        ex('romanian-deadlift',   'Romanian Deadlift',   'legs', 3, 6,  10, 180),
        ex('leg-press',           'Leg Press',           'legs', 3, 10, 15, 150),
        ex('leg-curl-machine',    'Leg Curl Machine',    'legs', 3, 10, 15, 90),
        ex('standing-calf-raise', 'Standing Calf Raise', 'legs', 3, 10, 15, 90),
        ex('cable-crunch',        'Cable Crunch',        'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body 2',
      exercises: [
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 4, 8,  12, 150),
        ex('chest-supported-row',    'Chest Supported Row',    'pull', 4, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('lat-pulldown',           'Lat Pulldown',           'pull', 3, 8,  12, 150),
        ex('rear-delt-fly-machine',  'Rear Delt Fly Machine',  'pull', 3, 12, 15, 90),
        ex('dumbbell-curl',          'Dumbbell Curl',          'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 3, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 3, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_4x75: PlanData = {
  days: [
    {
      day_label: 'Upper Body 1',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 4, 5,  8,  180),
        ex('seated-cable-row',          'Seated Cable Row',         'pull', 4, 8,  12, 150),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 1',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 4, 5,  8,  180),
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body 2',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('chest-supported-row',       'Chest Supported Row',      'pull', 4, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('rear-delt-fly-machine',     'Rear Delt Fly Machine',    'pull', 4, 12, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 3, 10, 15, 90),
        ex('hammer-curl',               'Hammer Curl',              'pull', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 2',
      exercises: [
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('walking-lunges',       'Walking Lunges',       'legs', 3, 10, 12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 4, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 12, 15, 90),
        ex('back-extension',       'Back Extension',       'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_4x90: PlanData = {
  days: [
    {
      day_label: 'Upper Body 1',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 4, 5,  8,  180),
        ex('seated-cable-row',          'Seated Cable Row',         'pull', 4, 8,  12, 150),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 1',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 5, 5,  8,  180),
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 4, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body 2',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('chest-supported-row',       'Chest Supported Row',      'pull', 4, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('rear-delt-fly-machine',     'Rear Delt Fly Machine',    'pull', 4, 12, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 4, 10, 15, 90),
        ex('hammer-curl',               'Hammer Curl',              'pull', 3, 10, 15, 90),
        ex('face-pull',                 'Face Pull',                'pull', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body 2',
      exercises: [
        ex('hack-squat-machine', 'Hack Squat Machine', 'legs', 5, 8,  12, 150),
        ex('romanian-deadlift',  'Romanian Deadlift',  'legs', 4, 6,  10, 180),
        ex('walking-lunges',     'Walking Lunges',     'legs', 3, 10, 12, 150),
        ex('leg-curl-machine',   'Leg Curl Machine',   'legs', 4, 10, 15, 90),
        ex('back-extension',     'Back Extension',     'legs', 3, 10, 15, 90),
        ex('seated-calf-raise',  'Seated Calf Raise',  'legs', 4, 10, 15, 90),
        ex('hanging-leg-raise',  'Hanging Leg Raise',  'core', 4, 12, 15, 90),
      ],
    },
  ],
};

// ─── 5x / Week ────────────────────────────────────────────────────────────────

const plan_5x30: PlanData = {
  days: [
    {
      day_label: 'Upper Body',
      exercises: [
        ex('bench-press',      'Bench Press',      'push', 3, 5, 8,  180),
        ex('seated-cable-row', 'Seated Cable Row',  'pull', 3, 8, 12, 150),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 3, 5,  8,  180),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Push',
      exercises: [
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('lat-pulldown',        'Lat Pulldown',        'pull', 3, 8, 12, 150),
        ex('chest-supported-row', 'Chest Supported Row', 'pull', 3, 8, 12, 150),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('romanian-deadlift', 'Romanian Deadlift', 'legs', 3, 6,  10, 180),
        ex('leg-press',         'Leg Press',         'legs', 2, 10, 15, 150),
      ],
    },
  ],
};

const plan_5x45: PlanData = {
  days: [
    {
      day_label: 'Upper Body',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 3, 5,  8,  180),
        ex('seated-cable-row',       'Seated Cable Row',       'pull', 3, 8,  12, 150),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 2, 12, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 4, 5,  8,  180),
        ex('leg-press',       'Leg Press',       'legs', 3, 10, 15, 150),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Push',
      exercises: [
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('tricep-pushdown',        'Tricep Pushdown',        'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('lat-pulldown',        'Lat Pulldown',        'pull', 3, 8,  12, 150),
        ex('chest-supported-row', 'Chest Supported Row', 'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',       'Dumbbell Curl',       'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_5x60: PlanData = {
  days: [
    {
      day_label: 'Push',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 4, 5,  8,  180),
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 3, 12, 15, 90),
        ex('tricep-pushdown',        'Tricep Pushdown',        'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',   'legs', 4, 6,  10, 180),
        ex('lat-pulldown',         'Lat Pulldown',        'pull', 4, 8,  12, 150),
        ex('chest-supported-row',  'Chest Supported Row', 'pull', 4, 8,  12, 150),
        ex('rear-delt-fly-machine','Rear Delt Fly Machine','pull',3, 12, 15, 90),
        ex('dumbbell-curl',        'Dumbbell Curl',       'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('barbell-squat',       'Barbell Squat',       'legs', 4, 5,  8,  180),
        ex('leg-press',           'Leg Press',           'legs', 4, 10, 15, 150),
        ex('leg-curl-machine',    'Leg Curl Machine',    'legs', 3, 10, 15, 90),
        ex('standing-calf-raise', 'Standing Calf Raise', 'legs', 3, 10, 15, 90),
        ex('cable-crunch',        'Cable Crunch',        'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 3, 8,  12, 150),
        ex('seated-cable-row',          'Seated Cable Row',         'pull', 3, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 3, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 3, 8,  12, 150),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 2, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 3, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 3, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 12, 15, 90),
      ],
    },
  ],
};

const plan_5x75: PlanData = {
  days: [
    {
      day_label: 'Push',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 4, 5,  8,  180),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('romanian-deadlift',     'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 4, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 4, 8,  12, 150),
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 3, 10, 12, 150),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 3, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 4, 5,  8,  180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('seated-cable-row',          'Seated Cable Row',         'pull', 4, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 3, 12, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('walking-lunges',       'Walking Lunges',       'legs', 3, 10, 12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 4, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 12, 15, 90),
        ex('back-extension',       'Back Extension',       'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_5x90: PlanData = {
  days: [
    {
      day_label: 'Push',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 5, 5,  8,  180),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 4, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull',
      exercises: [
        ex('romanian-deadlift',     'Romanian Deadlift',    'legs', 5, 6,  10, 180),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 5, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 5, 8,  12, 150),
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 4, 10, 12, 150),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 4, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 3, 10, 15, 90),
        ex('face-pull',             'Face Pull',            'pull', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Legs',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 5, 5,  8,  180),
        ex('leg-press',            'Leg Press',            'legs', 5, 10, 15, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 4, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 5, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 4, 12, 15, 90),
      ],
    },
    {
      day_label: 'Upper Body',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 5, 8,  12, 150),
        ex('seated-cable-row',          'Seated Cable Row',         'pull', 5, 8,  12, 150),
        ex('lat-pulldown',              'Lat Pulldown',             'pull', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('dumbbell-curl',             'Dumbbell Curl',            'pull', 4, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 4, 10, 15, 90),
      ],
    },
    {
      day_label: 'Lower Body',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 5, 8,  12, 150),
        ex('walking-lunges',       'Walking Lunges',       'legs', 4, 10, 12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('back-extension',       'Back Extension',       'legs', 3, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 5, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 4, 12, 15, 90),
      ],
    },
  ],
};

// ─── 6x / Week ────────────────────────────────────────────────────────────────

const plan_6x30: PlanData = {
  days: [
    {
      day_label: 'Push 1',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 3, 5, 8,  180),
        ex('overhead-press',         'Overhead Press',         'push', 2, 6, 10, 180),
      ],
    },
    {
      day_label: 'Pull 1',
      exercises: [
        ex('lat-pulldown',        'Lat Pulldown',        'pull', 3, 8, 12, 150),
        ex('chest-supported-row', 'Chest Supported Row', 'pull', 2, 8, 12, 150),
      ],
    },
    {
      day_label: 'Legs 1',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 3, 5,  8,  180),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Push 2',
      exercises: [
        ex('incline-dumbbell-press',  'Incline Dumbbell Press',  'push', 3, 8, 12, 150),
        ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'push', 2, 8, 12, 150),
      ],
    },
    {
      day_label: 'Pull 2',
      exercises: [
        ex('seated-cable-row', 'Seated Cable Row', 'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',    'Dumbbell Curl',    'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 2',
      exercises: [
        ex('romanian-deadlift', 'Romanian Deadlift', 'legs', 3, 6,  10, 180),
        ex('leg-press',         'Leg Press',         'legs', 2, 10, 15, 150),
      ],
    },
  ],
};

const plan_6x45: PlanData = {
  days: [
    {
      day_label: 'Push 1',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 3, 5,  8,  180),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 2, 12, 15, 90),
      ],
    },
    {
      day_label: 'Pull 1',
      exercises: [
        ex('lat-pulldown',        'Lat Pulldown',        'pull', 3, 8,  12, 150),
        ex('chest-supported-row', 'Chest Supported Row', 'pull', 3, 8,  12, 150),
        ex('dumbbell-curl',       'Dumbbell Curl',       'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 1',
      exercises: [
        ex('barbell-squat',   'Barbell Squat',   'legs', 4, 5,  8,  180),
        ex('leg-press',       'Leg Press',       'legs', 3, 10, 15, 150),
        ex('leg-curl-machine','Leg Curl Machine', 'legs', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Push 2',
      exercises: [
        ex('incline-dumbbell-press',  'Incline Dumbbell Press',  'push', 3, 8,  12, 150),
        ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'push', 3, 8,  12, 150),
        ex('tricep-pushdown',         'Tricep Pushdown',         'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 2',
      exercises: [
        ex('seated-cable-row', 'Seated Cable Row', 'pull', 3, 8,  12, 150),
        ex('lat-pulldown',     'Lat Pulldown',     'pull', 3, 8,  12, 150),
        ex('hammer-curl',      'Hammer Curl',      'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_6x60: PlanData = {
  days: [
    {
      day_label: 'Push 1',
      exercises: [
        ex('bench-press',            'Bench Press',            'push', 4, 5,  8,  180),
        ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 3, 8,  12, 150),
        ex('overhead-press',         'Overhead Press',         'push', 3, 6,  10, 180),
        ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'push', 3, 12, 15, 90),
        ex('tricep-pushdown',        'Tricep Pushdown',        'push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 1',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',   'legs', 4, 6,  10, 180),
        ex('lat-pulldown',         'Lat Pulldown',        'pull', 4, 8,  12, 150),
        ex('chest-supported-row',  'Chest Supported Row', 'pull', 4, 8,  12, 150),
        ex('rear-delt-fly-machine','Rear Delt Fly Machine','pull',3, 12, 15, 90),
        ex('dumbbell-curl',        'Dumbbell Curl',       'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 1',
      exercises: [
        ex('barbell-squat',       'Barbell Squat',       'legs', 4, 5,  8,  180),
        ex('leg-press',           'Leg Press',           'legs', 4, 10, 15, 150),
        ex('leg-curl-machine',    'Leg Curl Machine',    'legs', 3, 10, 15, 90),
        ex('standing-calf-raise', 'Standing Calf Raise', 'legs', 3, 10, 15, 90),
        ex('cable-crunch',        'Cable Crunch',        'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Push 2',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 3, 12, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 2',
      exercises: [
        ex('seated-cable-row',    'Seated Cable Row',    'pull', 4, 8,  12, 150),
        ex('lat-pulldown',        'Lat Pulldown',        'pull', 4, 8,  12, 150),
        ex('chest-supported-row', 'Chest Supported Row', 'pull', 3, 8,  12, 150),
        ex('face-pull',           'Face Pull',           'pull', 3, 12, 15, 90),
        ex('hammer-curl',         'Hammer Curl',         'pull', 2, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 3, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 12, 15, 90),
      ],
    },
  ],
};

const plan_6x75: PlanData = {
  days: [
    {
      day_label: 'Push 1',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 4, 5,  8,  180),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 3, 10, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 1',
      exercises: [
        ex('romanian-deadlift',     'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 4, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 4, 8,  12, 150),
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 3, 10, 12, 150),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 3, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 1',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 4, 5,  8,  180),
        ex('leg-press',            'Leg Press',            'legs', 4, 10, 15, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 3, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 4, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 3, 12, 15, 90),
      ],
    },
    {
      day_label: 'Push 2',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 4, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 4, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('cable-fly',                 'Cable Fly',                'push', 3, 12, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 4, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 3, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 2',
      exercises: [
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 4, 8,  12, 150),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 4, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 4, 8,  12, 150),
        ex('face-pull',             'Face Pull',            'pull', 4, 12, 15, 90),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 3, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 3, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 3, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 4, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 4, 8,  12, 150),
        ex('walking-lunges',       'Walking Lunges',       'legs', 3, 10, 12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 4, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 3, 12, 15, 90),
        ex('back-extension',       'Back Extension',       'legs', 3, 10, 15, 90),
      ],
    },
  ],
};

const plan_6x90: PlanData = {
  days: [
    {
      day_label: 'Push 1',
      exercises: [
        ex('bench-press',               'Bench Press',              'push', 5, 5,  8,  180),
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 5, 8,  12, 150),
        ex('overhead-press',            'Overhead Press',           'push', 4, 6,  10, 180),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('cable-fly',                 'Cable Fly',                'push', 4, 12, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 5, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 4, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 4, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 1',
      exercises: [
        ex('romanian-deadlift',     'Romanian Deadlift',    'legs', 5, 6,  10, 180),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 5, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 5, 8,  12, 150),
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 4, 10, 12, 150),
        ex('face-pull',             'Face Pull',            'pull', 4, 12, 15, 90),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 4, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 4, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 1',
      exercises: [
        ex('barbell-squat',        'Barbell Squat',        'legs', 5, 5,  8,  180),
        ex('leg-press',            'Leg Press',            'legs', 5, 10, 15, 150),
        ex('bulgarian-split-squat','Bulgarian Split Squat','legs', 4, 8,  12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('standing-calf-raise',  'Standing Calf Raise',  'legs', 5, 10, 15, 90),
        ex('cable-crunch',         'Cable Crunch',         'core', 4, 12, 15, 90),
      ],
    },
    {
      day_label: 'Push 2',
      exercises: [
        ex('incline-dumbbell-press',    'Incline Dumbbell Press',   'push', 5, 8,  12, 150),
        ex('dumbbell-shoulder-press',   'Dumbbell Shoulder Press',  'push', 5, 8,  12, 150),
        ex('pec-deck-machine',          'Pec Deck Machine',         'push', 4, 10, 15, 90),
        ex('cable-fly',                 'Cable Fly',                'push', 4, 12, 15, 90),
        ex('dumbbell-lateral-raise',    'Dumbbell Lateral Raise',   'push', 5, 12, 15, 90),
        ex('tricep-pushdown',           'Tricep Pushdown',          'push', 4, 10, 15, 90),
        ex('overhead-tricep-extension', 'Overhead Tricep Extension','push', 4, 10, 15, 90),
      ],
    },
    {
      day_label: 'Pull 2',
      exercises: [
        ex('seated-cable-row',      'Seated Cable Row',     'pull', 5, 8,  12, 150),
        ex('lat-pulldown',          'Lat Pulldown',         'pull', 5, 8,  12, 150),
        ex('chest-supported-row',   'Chest Supported Row',  'pull', 5, 8,  12, 150),
        ex('face-pull',             'Face Pull',            'pull', 4, 12, 15, 90),
        ex('rear-delt-fly-machine', 'Rear Delt Fly Machine','pull', 4, 12, 15, 90),
        ex('dumbbell-curl',         'Dumbbell Curl',        'pull', 4, 10, 15, 90),
        ex('hammer-curl',           'Hammer Curl',          'pull', 4, 10, 15, 90),
      ],
    },
    {
      day_label: 'Legs 2',
      exercises: [
        ex('romanian-deadlift',    'Romanian Deadlift',    'legs', 5, 6,  10, 180),
        ex('hack-squat-machine',   'Hack Squat Machine',   'legs', 5, 8,  12, 150),
        ex('walking-lunges',       'Walking Lunges',       'legs', 4, 10, 12, 150),
        ex('leg-curl-machine',     'Leg Curl Machine',     'legs', 4, 10, 15, 90),
        ex('seated-calf-raise',    'Seated Calf Raise',    'legs', 5, 10, 15, 90),
        ex('hanging-leg-raise',    'Hanging Leg Raise',    'core', 4, 12, 15, 90),
        ex('back-extension',       'Back Extension',       'legs', 4, 10, 15, 90),
      ],
    },
  ],
};

// ─── Lookup table + exported function ─────────────────────────────────────────

const ALGORITHM_PLANS: Record<string, PlanData> = {
  '2x30': plan_2x30, '2x45': plan_2x45, '2x60': plan_2x60,
  '2x75': plan_2x75, '2x90': plan_2x90,
  '3x30': plan_3x30, '3x45': plan_3x45, '3x60': plan_3x60,
  '3x75': plan_3x75, '3x90': plan_3x90,
  '4x30': plan_4x30, '4x45': plan_4x45, '4x60': plan_4x60,
  '4x75': plan_4x75, '4x90': plan_4x90,
  '5x30': plan_5x30, '5x45': plan_5x45, '5x60': plan_5x60,
  '5x75': plan_5x75, '5x90': plan_5x90,
  '6x30': plan_6x30, '6x45': plan_6x45, '6x60': plan_6x60,
  '6x75': plan_6x75, '6x90': plan_6x90,
};

const VALID_DURATIONS = [30, 45, 60, 75, 90];

export function getAlgorithmPlan(frequency: number, durationMin: number): PlanData {
  const freq = Math.min(Math.max(Math.round(frequency), 2), 6);
  const dur = VALID_DURATIONS.includes(durationMin) ? durationMin : 60;
  return ALGORITHM_PLANS[`${freq}x${dur}`];
}
