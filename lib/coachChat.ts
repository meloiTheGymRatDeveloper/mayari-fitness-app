// lib/coachChat.ts
// Pure logic for the Coach Mayari chat screen: merging the chat + tips thread,
// and building context-aware suggestion chips (computed client-side, zero API cost).
import type { CoachMessage, CoachTip } from '../types/database';

export type ThreadItem =
  | { kind: 'message'; item: CoachMessage }
  | { kind: 'tip'; item: CoachTip };

export function mergeThread(messages: CoachMessage[], tips: CoachTip[]): ThreadItem[] {
  const items: ThreadItem[] = [
    ...messages.map((m): ThreadItem => ({ kind: 'message', item: m })),
    ...tips.map((t): ThreadItem => ({ kind: 'tip', item: t })),
  ];
  return items.sort(
    (a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime(),
  );
}

export interface ChipContext {
  proteinGoalG: number | null;
  proteinConsumedG: number;
  calorieGoal: number | null;
  caloriesConsumed: number;
  manilaHour: number;
  isWorkoutDay: boolean;
  hasWorkoutToday: boolean;
}

export function buildSuggestionChips(ctx: ChipContext): string[] {
  const chips: string[] = ['Give me some tips 💡'];
  if (ctx.proteinGoalG !== null && ctx.proteinConsumedG < ctx.proteinGoalG) {
    const remaining = Math.round(ctx.proteinGoalG - ctx.proteinConsumedG);
    chips.push(`Paano ko ma-hit yung natitirang ${remaining}g protein ko today?`);
  }
  if (ctx.manilaHour >= 15 && ctx.calorieGoal !== null && ctx.caloriesConsumed < ctx.calorieGoal) {
    const remaining = Math.round(ctx.calorieGoal - ctx.caloriesConsumed);
    chips.push(`Anong healthy na hapunan sa natitirang ${remaining} kcal ko?`);
  }
  if (ctx.isWorkoutDay && !ctx.hasWorkoutToday) {
    chips.push('Ano ang focus ko sa workout ngayon?');
  }
  return chips;
}
