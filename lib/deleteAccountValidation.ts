export type DeletionStep = { table: string; userId: string };

export function isValidDeleteConfirmation(input: string): boolean {
  return input.trim() === 'DELETE';
}

// Returns deletion steps in FK-safe order (children before parents).
export function buildDeletionSteps(userId: string): DeletionStep[] {
  const tables = [
    'workout_sets',
    'workout_sessions',
    'workout_plans',
    'personal_records',
    'food_logs',
    'body_measurements',
    'coach_messages',
    'streaks',
    'fasting_logs',
    'cardio_metrics',
    'cardio_plan_enrollments',
    'strava_connections',
    'referrals',
    'subscriptions',
    'users',
  ];
  return tables.map(table => ({ table, userId }));
}
