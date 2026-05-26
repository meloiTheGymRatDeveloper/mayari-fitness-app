import { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Exercise, PlannedExercise, DayPlan, PlanData, WorkoutPlan, ExperienceLevel, EquipmentType } from '../types/database';
import { fallbackExercises } from '../constants/exercises';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full Body — trains every muscle each session',
  upper_lower: 'Upper/Lower (UL) — upper body one day, lower body the next',
  ppl: 'Push/Pull/Legs (PPL) — chest/shoulders/triceps → back/biceps → legs',
};

const BIG_COMPOUNDS = ['squat', 'deadlift', 'bench press', 'overhead press', 'barbell row'];

// Sets per exercise is always 3 (science-based minimum effective dose)
const SETS_PER_EXERCISE = 3;

// Average time cost per set: ~1 min lift + 4 min rest (middle of 3-5 min range)
const MINS_PER_SET = 5;

const EQUIPMENT_FILTER: Record<EquipmentType, string[]> = {
  bodyweight: ['none', 'Pull-up bar', 'Gym mat'],
  dumbbells: ['Dumbbell', 'none', 'Bench'],
  barbell: ['Barbell', 'Dumbbell', 'Bench', 'Pull-up bar'],
  full_gym: [],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildInput {
  daysPerWeek: number;
  sessionDurationMin: number;
  experienceLevel: ExperienceLevel;
  equipmentType: EquipmentType;
  exercises?: Exercise[];
}

export interface BuildResult {
  splitType: string;
  splitLabel: string;
  daysPerWeek: number;
  planData: PlanData;
}

// ---------------------------------------------------------------------------
// Pure helpers (no DB)
// ---------------------------------------------------------------------------

// Experience level scales exercise count, not sets per exercise.
// Beginner: 75% of base (focus on form, fewer movements)
// Intermediate: 100% of base
// Advanced: 125% of base (higher volume, more variety)
function calcExercisesPerSession(sessionDurationMin: number, level: ExperienceLevel): number {
  const base = Math.floor(sessionDurationMin / (SETS_PER_EXERCISE * MINS_PER_SET));
  const scaled =
    level === 'beginner' ? Math.floor(base * 0.75) :
    level === 'advanced'  ? Math.ceil(base  * 1.25) :
    base;
  return Math.max(2, scaled);
}

// Exported for generate-confirm preview (total sets = exercises × 3)
export function calcSetsPerSession(sessionDurationMin: number, level: ExperienceLevel): number {
  return calcExercisesPerSession(sessionDurationMin, level) * SETS_PER_EXERCISE;
}

function getRestSeconds(name: string): number {
  const lower = name.toLowerCase();
  return BIG_COMPOUNDS.some(c => lower.includes(c)) ? 180 : 90;
}

function toPlanned(ex: Exercise): PlannedExercise {
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    muscle_group: ex.muscle_group,
    sets: SETS_PER_EXERCISE,
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

// Full body: spread exercises evenly — 2 push, 2 pull, 1 legs, 1 core minimum.
// exerciseCount is the total exercises for the session.
function buildFullBody(push: Exercise[], pull: Exercise[], legs: Exercise[], core: Exercise[], exerciseCount: number): PlannedExercise[] {
  const pushCount = Math.ceil(exerciseCount / 3);
  const pullCount = Math.ceil(exerciseCount / 3);
  const legsCount = Math.max(1, Math.floor(exerciseCount / 4));
  const coreCount = Math.max(0, exerciseCount - pushCount - pullCount - legsCount);
  return [
    ...take(push, pushCount).map(toPlanned),
    ...take(pull, pullCount).map(toPlanned),
    ...take(legs, legsCount).map(toPlanned),
    ...take(core, coreCount).map(toPlanned),
  ];
}

// Upper: split exercises evenly between push and pull.
function buildUpper(push: Exercise[], pull: Exercise[], exerciseCount: number): PlannedExercise[] {
  const half = Math.ceil(exerciseCount / 2);
  return [
    ...take(push, half).map(toPlanned),
    ...take(pull, exerciseCount - half).map(toPlanned),
  ];
}

// Lower: mostly legs, some core.
function buildLower(legs: Exercise[], core: Exercise[], exerciseCount: number): PlannedExercise[] {
  const coreCount = Math.max(1, Math.floor(exerciseCount / 4));
  const legsCount = exerciseCount - coreCount;
  return [
    ...take(legs, legsCount).map(toPlanned),
    ...take(core, coreCount).map(toPlanned),
  ];
}

// Push: all push exercises up to exerciseCount.
function buildPush(push: Exercise[], exerciseCount: number): PlannedExercise[] {
  return take(push, exerciseCount).map(toPlanned);
}

// Pull: all pull exercises up to exerciseCount.
function buildPull(pull: Exercise[], exerciseCount: number): PlannedExercise[] {
  return take(pull, exerciseCount).map(toPlanned);
}

// Legs: mostly legs, some core.
function buildLegs(legs: Exercise[], core: Exercise[], exerciseCount: number): PlannedExercise[] {
  const coreCount = Math.max(1, Math.floor(exerciseCount / 4));
  const legsCount = exerciseCount - coreCount;
  return [
    ...take(legs, legsCount).map(toPlanned),
    ...take(core, coreCount).map(toPlanned),
  ];
}

function filterByEquipment(exercises: Exercise[], allowed: string[]): Exercise[] {
  if (allowed.length === 0) return exercises;
  return exercises.filter(e => e.equipment.length === 0 || e.equipment.some(eq => allowed.includes(eq)));
}

function byGroup(allExercises: Exercise[], group: Exercise['muscle_group'], allowed: string[]): Exercise[] {
  const filtered = filterByEquipment(allExercises.filter(e => e.muscle_group === group), allowed);
  if (filtered.length < 6) return allExercises.filter(e => e.muscle_group === group);
  return filtered;
}

// ---------------------------------------------------------------------------
// Pure build function (no DB calls)
// ---------------------------------------------------------------------------

export function buildWorkoutPlan(input: BuildInput): BuildResult {
  const { daysPerWeek, sessionDurationMin, equipmentType, experienceLevel } = input;
  const exCount = calcExercisesPerSession(sessionDurationMin, experienceLevel);
  const daysCount = daysPerWeek || 3;

  const allExercises: Exercise[] = input.exercises?.length ? input.exercises : fallbackExercises;
  const allowed = EQUIPMENT_FILTER[equipmentType];

  let push = byGroup(allExercises, 'push', allowed);
  let pull = byGroup(allExercises, 'pull', allowed);
  let legs = byGroup(allExercises, 'legs', allowed);
  let core = byGroup(allExercises, 'core', allowed);

  let splitType: string;
  const days: DayPlan[] = [];

  if (daysCount <= 3) {
    splitType = 'full_body';
    for (let i = 0; i < daysCount; i++) {
      const label = `Full Body ${String.fromCharCode(65 + i)}`;
      days.push({ day_label: label, exercises: buildFullBody(push, pull, legs, core, exCount) });
      push = rotate(push); pull = rotate(pull); legs = rotate(legs); core = rotate(core);
    }
  } else if (daysCount === 4) {
    splitType = 'upper_lower';
    days.push({ day_label: 'Upper A', exercises: buildUpper(push, pull, exCount) });
    days.push({ day_label: 'Lower A', exercises: buildLower(legs, core, exCount) });
    days.push({ day_label: 'Upper B', exercises: buildUpper(rotate(push), rotate(pull), exCount) });
    days.push({ day_label: 'Lower B', exercises: buildLower(rotate(legs), rotate(core), exCount) });
  } else {
    splitType = 'ppl';
    days.push({ day_label: 'Push A', exercises: buildPush(push, exCount) });
    days.push({ day_label: 'Pull A', exercises: buildPull(pull, exCount) });
    days.push({ day_label: 'Legs A', exercises: buildLegs(legs, core, exCount) });
    days.push({ day_label: 'Push B', exercises: buildPush(rotate(push), exCount) });
    days.push({ day_label: 'Pull B', exercises: buildPull(rotate(pull), exCount) });
    if (daysCount === 6) {
      days.push({ day_label: 'Legs B', exercises: buildLegs(rotate(legs), rotate(core), exCount) });
    }
  }

  return {
    splitType,
    splitLabel: SPLIT_LABELS[splitType] ?? splitType,
    daysPerWeek: daysCount,
    planData: { days },
  };
}

// ---------------------------------------------------------------------------
// DB save function
// ---------------------------------------------------------------------------

export async function saveWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  result: BuildResult,
  daysPerWeek: number,
): Promise<WorkoutPlan> {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      split_type: result.splitType,
      days_per_week: daysPerWeek,
      plan_data: result.planData satisfies PlanData,
      is_active: true,
      generated_by: 'client',
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save plan');
  return data as WorkoutPlan;
}

export async function deleteWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function updatePlanDayExercises(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  planData: PlanData,
): Promise<void> {
  const { error } = await supabase
    .from('workout_plans')
    .update({ plan_data: planData })
    .eq('id', planId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

export async function getPreviousPlans(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(2);

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutPlan[];
}

export async function restoreWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
): Promise<void> {
  // Activate the target plan first
  const { error: activateError } = await supabase
    .from('workout_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId);
  if (activateError) throw new Error(activateError.message);

  // Only deactivate other plans after successful activation
  const { error: deactivateError } = await supabase
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('id', planId);
  if (deactivateError) throw new Error(deactivateError.message);
}

// ---------------------------------------------------------------------------
// Legacy wrapper
// ---------------------------------------------------------------------------

export async function generateWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile,
): Promise<WorkoutPlan> {
  // Note: buildWorkoutPlan uses fallbackExercises only.
  // For DB-backed exercise selection, the original logic fetched from Supabase.
  // If you need live DB exercises, call the DB fetch separately and pass exercises
  // into a custom build path, or use the edge function instead.
  const { data: dbExercises } = await supabase.from('exercises').select('*').order('name');
  const allExercises: Exercise[] =
    dbExercises && dbExercises.length > 0 ? (dbExercises as Exercise[]) : fallbackExercises;

  const daysCount = profile.workout_days.length || 3;
  const exCount = calcExercisesPerSession(profile.session_duration_min, profile.experience_level);
  const allowed = EQUIPMENT_FILTER[profile.equipment_type];

  function filterEq(exs: Exercise[]): Exercise[] {
    if (allowed.length === 0) return exs;
    return exs.filter(e => e.equipment.length === 0 || e.equipment.some(eq => allowed.includes(eq)));
  }

  function byGroupLegacy(group: Exercise['muscle_group']): Exercise[] {
    const filtered = filterEq(allExercises.filter(e => e.muscle_group === group));
    if (filtered.length < 6) return allExercises.filter(e => e.muscle_group === group);
    return filtered;
  }

  let push = byGroupLegacy('push');
  let pull = byGroupLegacy('pull');
  let legs = byGroupLegacy('legs');
  let core = byGroupLegacy('core');

  let splitType: string;
  const days: DayPlan[] = [];

  if (daysCount <= 3) {
    splitType = 'full_body';
    for (let i = 0; i < daysCount; i++) {
      const label = `Full Body ${String.fromCharCode(65 + i)}`;
      days.push({ day_label: label, exercises: buildFullBody(push, pull, legs, core, exCount) });
      push = rotate(push); pull = rotate(pull); legs = rotate(legs); core = rotate(core);
    }
  } else if (daysCount === 4) {
    splitType = 'upper_lower';
    days.push({ day_label: 'Upper A', exercises: buildUpper(push, pull, exCount) });
    days.push({ day_label: 'Lower A', exercises: buildLower(legs, core, exCount) });
    days.push({ day_label: 'Upper B', exercises: buildUpper(rotate(push), rotate(pull), exCount) });
    days.push({ day_label: 'Lower B', exercises: buildLower(rotate(legs), rotate(core), exCount) });
  } else {
    splitType = 'ppl';
    days.push({ day_label: 'Push A', exercises: buildPush(push, exCount) });
    days.push({ day_label: 'Pull A', exercises: buildPull(pull, exCount) });
    days.push({ day_label: 'Legs A', exercises: buildLegs(legs, core, exCount) });
    days.push({ day_label: 'Push B', exercises: buildPush(rotate(push), exCount) });
    days.push({ day_label: 'Pull B', exercises: buildPull(rotate(pull), exCount) });
    if (daysCount === 6) {
      days.push({ day_label: 'Legs B', exercises: buildLegs(rotate(legs), rotate(core), exCount) });
    }
  }

  const result: BuildResult = {
    splitType,
    splitLabel: SPLIT_LABELS[splitType] ?? splitType,
    daysPerWeek: daysCount,
    planData: { days },
  };

  return saveWorkoutPlan(supabase, userId, result, daysCount);
}
