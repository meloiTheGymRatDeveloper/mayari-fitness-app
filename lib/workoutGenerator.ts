import { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Exercise, PlannedExercise, DayPlan, PlanData, WorkoutPlan } from '../types/database';
import { fallbackExercises } from '../constants/exercises';

const SETS_PER_LEVEL: Record<UserProfile['experience_level'], number> = {
  beginner: 3,
  intermediate: 4,
  advanced: 5,
};

const BIG_COMPOUNDS = ['squat', 'deadlift', 'bench press', 'overhead press', 'barbell row'];

function getRestSeconds(name: string): number {
  const lower = name.toLowerCase();
  return BIG_COMPOUNDS.some(c => lower.includes(c)) ? 180 : 90;
}

function toPlanned(ex: Exercise, sets: number): PlannedExercise {
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    muscle_group: ex.muscle_group,
    sets,
    reps_low: 8,
    reps_high: 12,
    rest_seconds: getRestSeconds(ex.name),
  };
}

function take(exercises: Exercise[], n: number): Exercise[] {
  return exercises.slice(0, n);
}

function rotate<T>(arr: T[]): T[] {
  if (arr.length <= 1) return arr;
  return [...arr.slice(1), arr[0]];
}

function buildFullBody(push: Exercise[], pull: Exercise[], legs: Exercise[], core: Exercise[], sets: number): PlannedExercise[] {
  return [
    ...take(push, 2).map(e => toPlanned(e, sets)),
    ...take(pull, 2).map(e => toPlanned(e, sets)),
    ...take(legs, 1).map(e => toPlanned(e, sets)),
    ...take(core, 1).map(e => toPlanned(e, sets)),
  ];
}

function buildUpper(push: Exercise[], pull: Exercise[], sets: number): PlannedExercise[] {
  return [
    ...take(push, 3).map(e => toPlanned(e, sets)),
    ...take(pull, 3).map(e => toPlanned(e, sets)),
  ];
}

function buildLower(legs: Exercise[], core: Exercise[], sets: number): PlannedExercise[] {
  return [
    ...take(legs, 4).map(e => toPlanned(e, sets)),
    ...take(core, 2).map(e => toPlanned(e, sets)),
  ];
}

function buildPush(push: Exercise[], sets: number): PlannedExercise[] {
  return take(push, 6).map(e => toPlanned(e, sets));
}

function buildPull(pull: Exercise[], sets: number): PlannedExercise[] {
  return take(pull, 6).map(e => toPlanned(e, sets));
}

function buildLegs(legs: Exercise[], core: Exercise[], sets: number): PlannedExercise[] {
  return [
    ...take(legs, 4).map(e => toPlanned(e, sets)),
    ...take(core, 2).map(e => toPlanned(e, sets)),
  ];
}

const EQUIPMENT_FILTER: Record<UserProfile['equipment_type'], string[]> = {
  bodyweight: ['none', 'Pull-up bar', 'Gym mat'],
  dumbbells: ['Dumbbell', 'none', 'Bench'],
  barbell: ['Barbell', 'Dumbbell', 'Bench', 'Pull-up bar'],
  full_gym: [],
};

export async function generateWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile,
): Promise<WorkoutPlan> {
  const sets = SETS_PER_LEVEL[profile.experience_level];
  const daysCount = profile.workout_days.length || 3;

  const { data: dbExercises } = await supabase.from('exercises').select('*').order('name');
  const allExercises: Exercise[] =
    dbExercises && dbExercises.length > 0 ? (dbExercises as Exercise[]) : fallbackExercises;

  const allowed = EQUIPMENT_FILTER[profile.equipment_type];

  function filterEq(exs: Exercise[]): Exercise[] {
    if (allowed.length === 0) return exs;
    return exs.filter(e => e.equipment.length === 0 || e.equipment.some(eq => allowed.includes(eq)));
  }

  function byGroup(group: Exercise['muscle_group']): Exercise[] {
    const filtered = filterEq(allExercises.filter(e => e.muscle_group === group));
    if (filtered.length < 6) return allExercises.filter(e => e.muscle_group === group);
    return filtered;
  }

  let push = byGroup('push');
  let pull = byGroup('pull');
  let legs = byGroup('legs');
  let core = byGroup('core');

  let splitType: string;
  const days: DayPlan[] = [];

  if (daysCount <= 3) {
    splitType = 'full_body';
    for (let i = 0; i < daysCount; i++) {
      const label = `Full Body ${String.fromCharCode(65 + i)}`;
      days.push({ day_label: label, exercises: buildFullBody(push, pull, legs, core, sets) });
      push = rotate(push); pull = rotate(pull); legs = rotate(legs); core = rotate(core);
    }
  } else if (daysCount === 4) {
    splitType = 'upper_lower';
    days.push({ day_label: 'Upper A', exercises: buildUpper(push, pull, sets) });
    days.push({ day_label: 'Lower A', exercises: buildLower(legs, core, sets) });
    days.push({ day_label: 'Upper B', exercises: buildUpper(rotate(push), rotate(pull), sets) });
    days.push({ day_label: 'Lower B', exercises: buildLower(rotate(legs), rotate(core), sets) });
  } else {
    splitType = 'ppl';
    days.push({ day_label: 'Push A', exercises: buildPush(push, sets) });
    days.push({ day_label: 'Pull A', exercises: buildPull(pull, sets) });
    days.push({ day_label: 'Legs A', exercises: buildLegs(legs, core, sets) });
    days.push({ day_label: 'Push B', exercises: buildPush(rotate(push), sets) });
    days.push({ day_label: 'Pull B', exercises: buildPull(rotate(pull), sets) });
    if (daysCount === 6) {
      days.push({ day_label: 'Legs B', exercises: buildLegs(rotate(legs), rotate(core), sets) });
    }
  }

  // Deactivate previous active plan
  const { error: deactivateError } = await supabase
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (deactivateError) throw new Error(deactivateError.message);

  const { data, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      split_type: splitType,
      days_per_week: daysCount,
      plan_data: { days } satisfies PlanData,
      is_active: true,
      generated_by: 'client',
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save plan');
  return data as WorkoutPlan;
}
