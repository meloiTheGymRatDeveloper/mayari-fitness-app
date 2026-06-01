import type { Exercise, HomeEquipmentTier, ExperienceLevel } from '../types/database';
import { buildWorkoutPlan, type BuildResult } from './workoutGenerator';
import { fallbackExercises } from '../constants/exercises';

export const HOME_EQUIPMENT_FILTER: Record<HomeEquipmentTier, string[]> = {
  bodyweight: ['none', 'Gym mat', 'Pull-up bar'],
  minimal:    ['none', 'Gym mat', 'Pull-up bar', 'Resistance band', 'Dumbbell'],
  home_gym:   ['none', 'Gym mat', 'Pull-up bar', 'Resistance band', 'Dumbbell', 'Bench'],
};

export interface HomeWorkoutInput {
  daysPerWeek: number;
  sessionDurationMin: number;
  experienceLevel: ExperienceLevel;
  tier: HomeEquipmentTier;
  exercises?: Exercise[];
}

export function generateHomeWorkoutPlan(input: HomeWorkoutInput): BuildResult {
  const allExercises: Exercise[] = input.exercises?.length ? input.exercises : fallbackExercises;
  const allowed = HOME_EQUIPMENT_FILTER[input.tier];

  const filtered = allExercises.filter(ex =>
    ex.equipment.length === 0 ||
    ex.equipment.some(eq => allowed.includes(eq))
  );

  const exercisesForPlan = filtered.length >= 8 ? filtered : allExercises;

  return buildWorkoutPlan({
    daysPerWeek: input.daysPerWeek,
    sessionDurationMin: input.sessionDurationMin,
    experienceLevel: input.experienceLevel,
    equipmentType: 'bodyweight',
    exercises: exercisesForPlan,
  });
}
