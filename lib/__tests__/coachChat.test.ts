import { mergeThread, buildSuggestionChips, type ThreadItem } from '../coachChat';
import type { CoachMessage, CoachTip } from '../../types/database';

const msg = (id: string, created_at: string, role: 'user' | 'assistant' = 'user'): CoachMessage =>
  ({ id, user_id: 'u1', role, content: `m${id}`, message_type: 'chat', created_at } as CoachMessage);
const tip = (id: string, created_at: string): CoachTip =>
  ({ id, user_id: 'u1', content: `t${id}`, tip_type: 'general', trigger_event: null, read_at: null, created_at } as CoachTip);

describe('mergeThread', () => {
  it('interleaves messages and tips sorted ascending by created_at', () => {
    const result = mergeThread(
      [msg('m2', '2026-07-12T10:00:00Z'), msg('m1', '2026-07-12T08:00:00Z')],
      [tip('t1', '2026-07-12T09:00:00Z')],
    );
    expect(result.map((r: ThreadItem) => r.kind)).toEqual(['message', 'tip', 'message']);
    expect(result.map((r: ThreadItem) => r.item.id)).toEqual(['m1', 't1', 'm2']);
  });

  it('handles empty inputs', () => {
    expect(mergeThread([], [])).toEqual([]);
  });
});

describe('buildSuggestionChips', () => {
  const base = {
    proteinGoalG: 140, proteinConsumedG: 95,
    calorieGoal: 2200, caloriesConsumed: 1400,
    manilaHour: 10, isWorkoutDay: false, hasWorkoutToday: false,
  };

  it('always includes the tips chip first', () => {
    expect(buildSuggestionChips(base)[0]).toBe('Give me some tips 💡');
  });

  it('includes remaining protein chip when protein goal not met', () => {
    expect(buildSuggestionChips(base)).toContain(
      'Paano ko ma-hit yung natitirang 45g protein ko today?');
  });

  it('omits protein chip when goal met or missing', () => {
    expect(buildSuggestionChips({ ...base, proteinConsumedG: 150 }).join()).not.toContain('protein');
    expect(buildSuggestionChips({ ...base, proteinGoalG: null }).join()).not.toContain('protein');
  });

  it('includes dinner chip only after 15:00 Manila with calories remaining', () => {
    expect(buildSuggestionChips({ ...base, manilaHour: 18 })).toContain(
      'Anong healthy na hapunan sa natitirang 800 kcal ko?');
    expect(buildSuggestionChips(base).join()).not.toContain('hapunan');
  });

  it('includes workout chip on workout days without a session yet', () => {
    expect(buildSuggestionChips({ ...base, isWorkoutDay: true })).toContain(
      'Ano ang focus ko sa workout ngayon?');
    expect(buildSuggestionChips({ ...base, isWorkoutDay: true, hasWorkoutToday: true }).join())
      .not.toContain('workout ngayon');
  });
});
