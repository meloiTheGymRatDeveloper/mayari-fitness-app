// Maps exerciseId → { easier, harder } variant exercise IDs
// exerciseId values must match entries in the exercises table / constants/exercises.ts

export interface ExerciseVariantChain {
  easier: string;
  harder: string;
}

export const homeExerciseVariants: Record<string, ExerciseVariantChain> = {
  // Push variants
  'push_up': { easier: 'knee_push_up', harder: 'archer_push_up' },
  'knee_push_up': { easier: 'wall_push_up', harder: 'push_up' },
  'archer_push_up': { easier: 'push_up', harder: 'one_arm_push_up' },
  'pike_push_up': { easier: 'push_up', harder: 'handstand_push_up' },
  'diamond_push_up': { easier: 'push_up', harder: 'archer_push_up' },
  'dip_chair': { easier: 'bench_dip', harder: 'weighted_dip' },

  // Pull variants
  'pull_up': { easier: 'band_pull_up', harder: 'archer_pull_up' },
  'band_pull_up': { easier: 'inverted_row', harder: 'pull_up' },
  'inverted_row': { easier: 'band_row', harder: 'band_pull_up' },
  'chin_up': { easier: 'band_chin_up', harder: 'archer_chin_up' },

  // Legs variants
  'squat_bodyweight': { easier: 'assisted_squat', harder: 'bulgarian_split_squat' },
  'bulgarian_split_squat': { easier: 'squat_bodyweight', harder: 'pistol_squat' },
  'pistol_squat': { easier: 'bulgarian_split_squat', harder: 'shrimp_squat' },
  'lunge': { easier: 'reverse_lunge', harder: 'walking_lunge' },
  'glute_bridge': { easier: 'supine_hip_lift', harder: 'single_leg_glute_bridge' },
  'nordic_hamstring': { easier: 'glute_bridge', harder: 'single_leg_nordic' },

  // Core variants
  'plank': { easier: 'knee_plank', harder: 'plank_shoulder_tap' },
  'plank_shoulder_tap': { easier: 'plank', harder: 'rk_plank' },
  'hollow_body': { easier: 'dead_bug', harder: 'l_sit' },
  'dead_bug': { easier: 'hollow_body_hold', harder: 'hollow_body' },
  'mountain_climber': { easier: 'slow_mountain_climber', harder: 'cross_mountain_climber' },
};
