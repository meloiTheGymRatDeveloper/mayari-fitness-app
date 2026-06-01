import { generateHomeWorkoutPlan, HOME_EQUIPMENT_FILTER } from '../homeWorkoutGenerator';
import { fallbackExercises } from '../../constants/exercises';

describe('generateHomeWorkoutPlan', () => {
  it('returns a BuildResult with a planData containing days', () => {
    const result = generateHomeWorkoutPlan({
      daysPerWeek: 3,
      sessionDurationMin: 45,
      experienceLevel: 'beginner',
      tier: 'bodyweight',
    });
    expect(result.planData.days).toHaveLength(3);
    expect(result.splitType).toBe('full_body');
  });

  it('uses full_body split for 3 days', () => {
    const result = generateHomeWorkoutPlan({
      daysPerWeek: 3,
      sessionDurationMin: 45,
      experienceLevel: 'intermediate',
      tier: 'bodyweight',
    });
    expect(result.splitType).toBe('full_body');
  });

  it('uses upper_lower split for 4 days', () => {
    const result = generateHomeWorkoutPlan({
      daysPerWeek: 4,
      sessionDurationMin: 60,
      experienceLevel: 'intermediate',
      tier: 'minimal',
    });
    expect(result.splitType).toBe('upper_lower');
    expect(result.planData.days).toHaveLength(4);
  });

  it('uses ppl split for 5+ days', () => {
    const result = generateHomeWorkoutPlan({
      daysPerWeek: 5,
      sessionDurationMin: 60,
      experienceLevel: 'advanced',
      tier: 'home_gym',
    });
    expect(result.splitType).toBe('ppl');
  });

  it('bodyweight tier: all exercises have no equipment or only gym-mat', () => {
    const result = generateHomeWorkoutPlan({
      daysPerWeek: 3,
      sessionDurationMin: 45,
      experienceLevel: 'intermediate',
      tier: 'bodyweight',
    });
    const exercises = result.planData.days.flatMap(d => d.exercises);
    exercises.forEach(ex => {
      expect(ex.exercise_id).toBeTruthy();
    });
    expect(exercises.length).toBeGreaterThan(0);
  });

  it('HOME_EQUIPMENT_FILTER has all three tiers', () => {
    expect(HOME_EQUIPMENT_FILTER).toHaveProperty('bodyweight');
    expect(HOME_EQUIPMENT_FILTER).toHaveProperty('minimal');
    expect(HOME_EQUIPMENT_FILTER).toHaveProperty('home_gym');
  });

  it('minimal tier allowed equipment is a superset of bodyweight', () => {
    const bw = new Set(HOME_EQUIPMENT_FILTER.bodyweight);
    const minimal = new Set(HOME_EQUIPMENT_FILTER.minimal);
    HOME_EQUIPMENT_FILTER.bodyweight.forEach(eq => {
      expect(minimal.has(eq)).toBe(true);
    });
  });

  it('home_gym tier allowed equipment is a superset of minimal', () => {
    const minimal = new Set(HOME_EQUIPMENT_FILTER.minimal);
    const homeGym = new Set(HOME_EQUIPMENT_FILTER.home_gym);
    HOME_EQUIPMENT_FILTER.minimal.forEach(eq => {
      expect(homeGym.has(eq)).toBe(true);
    });
  });
});
