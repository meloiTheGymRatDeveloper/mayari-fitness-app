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

function calcSetsPerSession(sessionDurationMin: number): number {
  return Math.max(2, Math.floor(sessionDurationMin / 5.5) - 2);
}

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
  const { daysPerWeek, sessionDurationMin, equipmentType } = input;
  const sets = calcSetsPerSession(sessionDurationMin);
  const daysCount = daysPerWeek || 3;

  const allExercises: Exercise[] = fallbackExercises;
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
  // 1. Fetch inactive plans ordered by created_at DESC
  const { data: inactivePlans, error: fetchError } = await supabase
    .from('workout_plans')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (fetchError) throw new Error(fetchError.message);

  // 2. If count >= 2, delete all but the most recent one (keep 1 before adding new)
  if (inactivePlans && inactivePlans.length >= 2) {
    const idsToDelete = inactivePlans.slice(1).map((p: { id: string }) => p.id);
    const { error: deleteError } = await supabase
      .from('workout_plans')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) throw new Error(deleteError.message);
  }

  // 3. Deactivate current active plan
  const { error: deactivateError } = await supabase
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (deactivateError) throw new Error(deactivateError.message);

  // 4. Insert new plan as active
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

  // 5. Return new plan
  return data as WorkoutPlan;
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
  const sets = calcSetsPerSession(profile.session_duration_min);
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

  const result: BuildResult = {
    splitType,
    splitLabel: SPLIT_LABELS[splitType] ?? splitType,
    daysPerWeek: daysCount,
    planData: { days },
  };

  return saveWorkoutPlan(supabase, userId, result, daysCount);
}
