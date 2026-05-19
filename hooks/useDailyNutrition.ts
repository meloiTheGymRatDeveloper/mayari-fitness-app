import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFoodLogs } from './useNutrition';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import type { FoodLogWithItem, MealSlot } from '../types/database';

const MEAL_SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];

const RDA = { vitaminC: 90, iron: 18, calcium: 1000 };

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitaminC: number;
  iron: number;
  calcium: number;
}

function calcTotals(logs: FoodLogWithItem[]): Totals {
  return logs.reduce(
    (acc, log) => {
      const r = (log.quantity_g ?? 0) / 100;
      const item = log.food_item;
      return {
        calories: acc.calories + (item?.calories_per_100g ?? 0) * r,
        protein: acc.protein + (item?.protein_per_100g ?? 0) * r,
        carbs: acc.carbs + (item?.carbs_per_100g ?? 0) * r,
        fat: acc.fat + (item?.fat_per_100g ?? 0) * r,
        vitaminC: acc.vitaminC + (item?.vitamin_c_mg_per_100g ?? 0) * r,
        iron: acc.iron + (item?.iron_mg_per_100g ?? 0) * r,
        calcium: acc.calcium + (item?.calcium_mg_per_100g ?? 0) * r,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, vitaminC: 0, iron: 0, calcium: 0 }
  );
}

export function useDailyNutrition(date: string) {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: logs = [], isLoading } = useFoodLogs(date);

  const { data: caloriesBurned = 0 } = useQuery({
    queryKey: ['workout_burned', userId, date],
    queryFn: async () => {
      if (!userId) return 0;
      const gte = new Date(date + 'T00:00:00Z').toISOString();
      const lte = new Date(date + 'T23:59:59Z').toISOString();
      const { data } = await supabase
        .from('workout_sessions')
        .select('started_at, ended_at')
        .eq('user_id', userId)
        .gte('started_at', gte)
        .lte('started_at', lte)
        .not('ended_at', 'is', null);
      const bodyKg = profile?.body_weight_kg ?? 70;
      return Math.round(
        (data ?? []).reduce((sum, s) => {
          const mins =
            (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000;
          return sum + (mins * 6 * bodyKg) / 60;
        }, 0)
      );
    },
    enabled: !!userId,
  });

  const totals = useMemo(() => calcTotals(logs), [logs]);

  const slotTotals = useMemo(() => {
    const map = Object.fromEntries(
      MEAL_SLOTS.map((s) => [s, { calories: 0, itemCount: 0, logs: [] as FoodLogWithItem[] }])
    ) as Record<MealSlot, { calories: number; itemCount: number; logs: FoodLogWithItem[] }>;

    for (const log of logs) {
      const slot = log.meal_slot as MealSlot;
      if (!map[slot]) continue;
      const r = (log.quantity_g ?? 0) / 100;
      map[slot].calories += (log.food_item?.calories_per_100g ?? 0) * r;
      map[slot].itemCount += 1;
      map[slot].logs.push(log);
    }
    return map;
  }, [logs]);

  return {
    isLoading,
    logs,
    totals,
    slotTotals,
    calorieGoal: profile?.calorie_goal ?? 2000,
    proteinGoal: profile?.protein_goal_g ?? 150,
    carbsGoal: profile?.carbs_goal_g ?? 200,
    fatGoal: profile?.fat_goal_g ?? 65,
    caloriesBurned,
    micros: {
      vitaminC: { consumed: totals.vitaminC, rda: RDA.vitaminC },
      iron: { consumed: totals.iron, rda: RDA.iron },
      calcium: { consumed: totals.calcium, rda: RDA.calcium },
    },
  };
}
