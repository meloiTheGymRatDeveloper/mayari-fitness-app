export const EXERCISE_ALTERNATIVES: Record<string, string[]> = {
  // Push — chest/shoulders/triceps
  'bench-press': ['incline-bench', 'dip'],
  'incline-bench': ['bench-press', 'dip'],
  'overhead-press': ['dip', 'incline-bench'],
  'dip': ['bench-press', 'incline-bench'],

  // Pull — back/biceps
  'barbell-row': ['cable-row', 'lat-pulldown', 'pull-up'],
  'cable-row': ['barbell-row', 'lat-pulldown'],
  'lat-pulldown': ['pull-up', 'barbell-row', 'cable-row'],
  'pull-up': ['lat-pulldown', 'cable-row'],
  'deadlift': ['romanian-deadlift', 'barbell-row', 'cable-row'],

  // Legs
  'squat': ['leg-press', 'lunge'],
  'leg-press': ['squat', 'lunge'],
  'lunge': ['squat', 'leg-press'],
  'romanian-deadlift': ['leg-curl', 'deadlift'],
  'leg-curl': ['romanian-deadlift'],
  'calf-raise': [],

  // Core
  'plank': [],
};
