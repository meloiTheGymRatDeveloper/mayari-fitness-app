// Alternatives are grouped by movement pattern equivalence, not just muscle group.
// Bench press ↔ fly/pec-deck: same primary mover (pec major), different load angle.
// Incline bench is NOT an equivalent to flat bench — it biases upper pec.
export const EXERCISE_ALTERNATIVES: Record<string, string[]> = {
  // Push — chest compounds (flat pec emphasis)
  'bench-press':     ['dumbbell-press', 'dumbbell-fly', 'pec-deck', 'dip'],
  'dumbbell-press':  ['bench-press', 'dumbbell-fly', 'pec-deck'],
  'dumbbell-fly':    ['bench-press', 'dumbbell-press', 'pec-deck'],
  'pec-deck':        ['dumbbell-fly', 'dumbbell-press', 'bench-press'],

  // Push — upper chest (incline emphasis)
  'incline-bench':   ['dumbbell-press', 'dip'],

  // Push — shoulder compound
  'overhead-press':  ['dip', 'incline-bench'],

  // Push — tricep isolation
  'tricep-pushdown': ['dip', 'overhead-press'],

  // Push — bodyweight
  'dip':             ['bench-press', 'dumbbell-press', 'overhead-press'],

  // Pull — back compounds (horizontal)
  'barbell-row':     ['cable-row', 'lat-pulldown', 'pull-up'],
  'cable-row':       ['barbell-row', 'lat-pulldown', 'face-pull'],

  // Pull — back compounds (vertical)
  'lat-pulldown':    ['pull-up', 'barbell-row', 'cable-row'],
  'pull-up':         ['lat-pulldown', 'cable-row'],

  // Pull — rear delt / shoulder health
  'face-pull':       ['cable-row', 'barbell-row'],

  // Pull — hip hinge (lower body pull pattern)
  'deadlift':        ['romanian-deadlift', 'barbell-row'],

  // Pull — bicep isolation
  'barbell-curl':    ['dumbbell-curl'],
  'dumbbell-curl':   ['barbell-curl'],

  // Legs — quad dominant
  'squat':           ['leg-press', 'lunge'],
  'leg-press':       ['squat', 'lunge'],
  'lunge':           ['squat', 'leg-press'],

  // Legs — hamstring dominant
  'romanian-deadlift': ['leg-curl', 'deadlift'],
  'leg-curl':          ['romanian-deadlift'],

  // Legs — calf
  'calf-raise': [],

  // Core
  'plank': [],
};
