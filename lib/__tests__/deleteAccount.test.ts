import { isValidDeleteConfirmation, buildDeletionSteps } from '../deleteAccountValidation';

describe('isValidDeleteConfirmation', () => {
  it('accepts exact DELETE', () => {
    expect(isValidDeleteConfirmation('DELETE')).toBe(true);
  });

  it('accepts DELETE with surrounding whitespace', () => {
    expect(isValidDeleteConfirmation('  DELETE  ')).toBe(true);
  });

  it('rejects lowercase delete', () => {
    expect(isValidDeleteConfirmation('delete')).toBe(false);
  });

  it('rejects mixed case', () => {
    expect(isValidDeleteConfirmation('Delete')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDeleteConfirmation('')).toBe(false);
  });

  it('rejects partial match', () => {
    expect(isValidDeleteConfirmation('DELET')).toBe(false);
  });
});

describe('buildDeletionSteps', () => {
  it('deletes workout_sets before workout_sessions', () => {
    const steps = buildDeletionSteps('user-123');
    const setsIdx = steps.findIndex(s => s.table === 'workout_sets');
    const sessionsIdx = steps.findIndex(s => s.table === 'workout_sessions');
    expect(setsIdx).toBeLessThan(sessionsIdx);
  });

  it('deletes workout_sessions before workout_plans', () => {
    const steps = buildDeletionSteps('user-123');
    const sessionsIdx = steps.findIndex(s => s.table === 'workout_sessions');
    const plansIdx = steps.findIndex(s => s.table === 'workout_plans');
    expect(sessionsIdx).toBeLessThan(plansIdx);
  });

  it('deletes users row last among DB tables', () => {
    const steps = buildDeletionSteps('user-123');
    const usersIdx = steps.findIndex(s => s.table === 'users');
    const otherIdxs = steps
      .map((_s: unknown, i: number) => i)
      .filter((i: number) => steps[i].table !== 'users');
    expect(usersIdx).toBeGreaterThan(Math.max(...otherIdxs));
  });

  it('every step targets the correct user_id', () => {
    const steps = buildDeletionSteps('user-abc');
    steps.forEach((step: { table: string; userId: string }) => {
      expect(step.userId).toBe('user-abc');
    });
  });
});
