import { create } from 'zustand';
import type { PlanData, DayPlan, PlannedExercise } from '../types/database';

interface PlanEditorState {
  plan: PlanData | null;
  source: string;
  planName: string;
  frequency: number;
  duration: number;
  setPlan: (
    plan: PlanData,
    opts: { source: string; planName: string; frequency: number; duration: number },
  ) => void;
  updateExercise: (dayIdx: number, exIdx: number, ex: PlannedExercise) => void;
  addExercise: (dayIdx: number, ex: PlannedExercise) => void;
  deleteExercise: (dayIdx: number, exIdx: number) => void;
  clear: () => void;
}

export const usePlanEditorStore = create<PlanEditorState>((set) => ({
  plan: null,
  source: 'algorithm',
  planName: '',
  frequency: 3,
  duration: 60,

  setPlan: (plan, opts) => set({ plan, ...opts }),

  updateExercise: (dayIdx, exIdx, ex) =>
    set(state => {
      if (!state.plan) return state;
      const days = state.plan.days.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          exercises: d.exercises.map((e, ei) => (ei === exIdx ? ex : e)),
        }
      );
      return { plan: { days } };
    }),

  addExercise: (dayIdx, ex) =>
    set(state => {
      if (!state.plan) return state;
      const days = state.plan.days.map((d, di) =>
        di !== dayIdx ? d : { ...d, exercises: [...d.exercises, ex] }
      );
      return { plan: { days } };
    }),

  deleteExercise: (dayIdx, exIdx) =>
    set(state => {
      if (!state.plan) return state;
      const days = state.plan.days.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          exercises: d.exercises.filter((_, ei) => ei !== exIdx),
        }
      );
      return { plan: { days } };
    }),

  clear: () => set({ plan: null }),
}));
