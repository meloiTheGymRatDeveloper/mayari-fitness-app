import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/theme';
import { subDays, toDateStr, shortDate, getMonday } from '../lib/analyticsHelpers';

interface DayNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  slots: Set<string>;
}

function buildWeeklyMacros(
  daily: Record<string, DayNutrition>,
  numWeeks: number,
): { label: string; stackData: { value: number; color: string }[] }[] {
  const now = new Date();
  const weeks: {
    key: string;
    label: string;
    protein: number;
    carbs: number;
    fat: number;
    count: number;
  }[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = getMonday(subDays(now, i * 7));
    weeks.push({
      key: toDateStr(start),
      label: shortDate(toDateStr(start)),
      protein: 0,
      carbs: 0,
      fat: 0,
      count: 0,
    });
  }

  Object.entries(daily).forEach(([date, d]) => {
    const weekKey = toDateStr(getMonday(new Date(date + 'T12:00:00Z')));
    const week = weeks.find(w => w.key === weekKey);
    if (week) {
      week.protein += d.protein;
      week.carbs += d.carbs;
      week.fat += d.fat;
      week.count++;
    }
  });

  return weeks.map(w => ({
    label: w.label,
    stackData: [
      {
        value: w.count > 0 ? Math.round(w.protein / w.count) : 0,
        color: colors.brand.primary,
      },
      {
        value: w.count > 0 ? Math.round(w.carbs / w.count) : 0,
        color: colors.brand.secondary,
      },
      {
        value: w.count > 0 ? Math.round(w.fat / w.count) : 0,
        color: colors.brand.accent,
      },
    ],
  }));
}

export interface NutritionAnalytics {
  calLineData: { value: number; dataPointColor?: string }[];
  weeklyMacroStack: { label: string; stackData: { value: number; color: string }[] }[];
  netCarbsData: { value: number }[];
  showNetCarbs: boolean;
  calorieGoal: number;
  bestNutritionDay: string | null;
  worstNutritionDay: string | null;
  hasData: boolean;
  nutritionDays: number;
}

export function useNutritionAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<NutritionAnalytics>({
    queryKey: ['nutrition_analytics', userId],
    queryFn: async (): Promise<NutritionAnalytics> => {
      if (!userId) return {
        calLineData: [],
        weeklyMacroStack: [],
        netCarbsData: [],
        showNetCarbs: false,
        calorieGoal: 2000,
        bestNutritionDay: null,
        worstNutritionDay: null,
        hasData: false,
        nutritionDays: 0,
      };

      const now = new Date();
      const d30 = subDays(now, 30);
      const d56 = subDays(now, 56);

      const cGoal = profile?.calorie_goal ?? 2000;
      const showNetCarbs = profile?.net_carbs_display ?? true;

      const { data: foodLogs, error } = await supabase
        .from('food_logs')
        .select(
          'logged_at, meal_slot, quantity_g, food_item:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)',
        )
        .eq('user_id', userId)
        .gte('logged_at', d56.toISOString());

      if (error) throw error;

      const daily: Record<string, DayNutrition> = {};

      (foodLogs ?? []).forEach(log => {
        const date = log.logged_at.split('T')[0];
        const fi = log.food_item as unknown as {
          calories_per_100g: number | null;
          protein_per_100g: number | null;
          carbs_per_100g: number | null;
          fat_per_100g: number | null;
          fiber_per_100g: number | null;
        } | null;
        if (!fi) return;
        const q = log.quantity_g / 100;
        if (!daily[date]) {
          daily[date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            slots: new Set(),
          };
        }
        daily[date].calories += (fi.calories_per_100g ?? 0) * q;
        daily[date].protein += (fi.protein_per_100g ?? 0) * q;
        daily[date].carbs += (fi.carbs_per_100g ?? 0) * q;
        daily[date].fat += (fi.fat_per_100g ?? 0) * q;
        daily[date].fiber += (fi.fiber_per_100g ?? 0) * q;
        daily[date].slots.add(log.meal_slot);
      });

      const last30Dates: string[] = [];
      for (let i = 29; i >= 0; i--) last30Dates.push(toDateStr(subDays(now, i)));

      const calLineData = last30Dates.map(date => ({
        value: Math.round(daily[date]?.calories ?? 0),
        dataPointColor:
          (daily[date]?.calories ?? 0) > 0
            ? (daily[date]?.calories ?? 0) <= cGoal
              ? colors.success
              : colors.error
            : colors.bg.elevated,
      }));

      const weeklyMacroStack = buildWeeklyMacros(daily, 8);

      const netCarbsData = last30Dates.map(date => ({
        value: Math.max(
          0,
          Math.round((daily[date]?.carbs ?? 0) - (daily[date]?.fiber ?? 0)),
        ),
      }));

      const last30LoggedDays = Object.entries(daily).filter(
        ([d]) => d >= toDateStr(d30),
      );

      const nutritionDays = Object.entries(daily).filter(
        ([d, nd]) => d >= toDateStr(d30) && nd.slots.size >= 3,
      ).length;

      let bestNutritionDay: string | null = null;
      let worstNutritionDay: string | null = null;

      if (last30LoggedDays.length >= 3) {
        const bestDay = last30LoggedDays
          .filter(([, d]) => d.calories <= cGoal)
          .sort((a, b) => b[1].protein - a[1].protein)[0];
        bestNutritionDay = bestDay ? shortDate(bestDay[0]) : null;

        const worstDay = last30LoggedDays.sort(
          (a, b) => b[1].calories - cGoal - (a[1].calories - cGoal),
        )[0];
        worstNutritionDay =
          worstDay && worstDay[1].calories > cGoal
            ? shortDate(worstDay[0])
            : null;
      }

      return {
        calLineData,
        weeklyMacroStack,
        netCarbsData,
        showNetCarbs,
        calorieGoal: cGoal,
        bestNutritionDay,
        worstNutritionDay,
        hasData: last30LoggedDays.length >= 3,
        nutritionDays,
      };
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}
