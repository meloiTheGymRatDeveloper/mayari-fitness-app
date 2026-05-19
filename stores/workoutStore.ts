import { create } from 'zustand';
import type { WorkoutSet, DayPlan } from '../types/database';

type ActiveSet = Omit<WorkoutSet, 'id' | 'completed_at'>;

interface WorkoutState {
  sessionId: string | null;
  planId: string | null;
  todayPlan: DayPlan | null;
  sets: ActiveSet[];
  isResting: boolean;
  restSecondsLeft: number;
  elapsedSeconds: number;
  startSession: (sessionId: string, planId: string | null, plan: DayPlan) => void;
  addSet: (set: ActiveSet) => void;
  setRest: (seconds: number) => void;
  skipRest: () => void;
  tickRest: () => void;
  tickElapsed: () => void;
  endSession: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  sessionId: null,
  planId: null,
  todayPlan: null,
  sets: [],
  isResting: false,
  restSecondsLeft: 0,
  elapsedSeconds: 0,
  startSession: (sessionId, planId, plan) =>
    set({ sessionId, planId, todayPlan: plan, sets: [], elapsedSeconds: 0 }),
  addSet: (newSet) => set(s => ({ sets: [...s.sets, newSet] })),
  setRest: (seconds) => set({ isResting: true, restSecondsLeft: seconds }),
  skipRest: () => set({ isResting: false, restSecondsLeft: 0 }),
  tickRest: () =>
    set(s => ({
      restSecondsLeft: Math.max(0, s.restSecondsLeft - 1),
      isResting: s.restSecondsLeft > 1,
    })),
  tickElapsed: () => set(s => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  endSession: () =>
    set({ sessionId: null, planId: null, todayPlan: null, sets: [], isResting: false, restSecondsLeft: 0, elapsedSeconds: 0 }),
}));
