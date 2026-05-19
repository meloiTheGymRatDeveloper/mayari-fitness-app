import { create } from 'zustand';
import type { MealSlot } from '../types/database';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return 'almusal';
  if (h < 14) return 'tanghalian';
  if (h < 18) return 'merienda';
  return 'hapunan';
}

interface UIState {
  language: 'en' | 'fil';
  mealTimeStyle: 'filipino' | 'generic';
  setLanguage: (lang: UIState['language']) => void;
  setMealTimeStyle: (style: UIState['mealTimeStyle']) => void;
  logModalOpen: boolean;
  logModalMealSlot: MealSlot;
  logModalDate: string;
  openLogModal: (mealSlot?: MealSlot, date?: string) => void;
  closeLogModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  mealTimeStyle: 'filipino',
  setLanguage: (language) => set({ language }),
  setMealTimeStyle: (mealTimeStyle) => set({ mealTimeStyle }),
  logModalOpen: false,
  logModalMealSlot: 'almusal',
  logModalDate: todayStr(),
  openLogModal: (mealSlot, date) =>
    set({
      logModalOpen: true,
      logModalMealSlot: mealSlot ?? defaultSlot(),
      logModalDate: date ?? todayStr(),
    }),
  closeLogModal: () => set({ logModalOpen: false }),
}));
