import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  AISuggestedMeal, AIBuildResult, AIWeeklyPlanResult,
  MealSlot, WeekDay, MealPlanData, MealPlanDayData, PlannedMealItem,
} from '../types/database';

const WEEK_DAYS: WeekDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const MEAL_SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];
const SLOT_HOURS: Record<MealSlot, number> = {
  almusal: 7, tanghalian: 12, merienda: 15, hapunan: 19,
};

async function createAIFoodItem(meal: AISuggestedMeal): Promise<string> {
  const { data, error } = await supabase
    .from('food_items')
    .insert({
      name: meal.meal_name,
      calories_per_100g: meal.macros.calories,
      protein_per_100g: meal.macros.protein_g,
      carbs_per_100g: meal.macros.carbs_g,
      fat_per_100g: meal.macros.fat_g,
      fiber_per_100g: meal.macros.fiber_g,
      source: 'custom',
      is_ph_local: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export function useSuggestMeal() {
  return useMutation({
    mutationFn: async (params: {
      meal_slot: string;
      remaining_calories: number;
      remaining_protein_g: number;
      remaining_carbs_g: number;
      remaining_fat_g: number;
      preferences?: string;
    }): Promise<AISuggestedMeal> => {
      const { data, error } = await supabase.functions.invoke('ai-meal-builder', {
        body: { mode: 'suggest', context: params },
      });
      if (error) throw error;
      if ((data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? 'Generation failed');
      }
      return data as AISuggestedMeal;
    },
  });
}

export function useBuildMeals() {
  return useMutation({
    mutationFn: async (params: {
      ingredients: string[];
      calorie_goal: number;
      protein_goal_g: number;
    }): Promise<AIBuildResult> => {
      const { data, error } = await supabase.functions.invoke('ai-meal-builder', {
        body: { mode: 'build', context: params },
      });
      if (error) throw error;
      if ((data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? 'Generation failed');
      }
      return data as AIBuildResult;
    },
  });
}

export function useGenerateWeeklyPlan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      weekStartDate,
      calorie_goal,
      protein_goal_g,
      avoid,
      preferences,
    }: {
      weekStartDate: string;
      calorie_goal: number;
      protein_goal_g: number;
      avoid?: string;
      preferences?: string;
    }): Promise<void> => {
      if (!userId) throw new Error('Not logged in');

      const { data, error } = await supabase.functions.invoke('ai-meal-builder', {
        body: { mode: 'weekly_plan', context: { calorie_goal, protein_goal_g, avoid, preferences } },
      });
      if (error) throw error;
      if ((data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? 'Generation failed');
      }
      const aiResult = data as AIWeeklyPlanResult;

      type SlotRef = { day: WeekDay; slot: MealSlot; meal: AISuggestedMeal };
      const slotRefs: SlotRef[] = [];
      for (const day of WEEK_DAYS) {
        for (const slot of MEAL_SLOTS) {
          const meal = aiResult.plan[day]?.[slot];
          if (meal) slotRefs.push({ day, slot, meal });
        }
      }

      const foodItemIds = await Promise.all(
        slotRefs.map(({ meal }) => createAIFoodItem(meal))
      );

      const planData: MealPlanData = {};
      slotRefs.forEach(({ day, slot, meal }, i) => {
        if (!planData[day]) {
          planData[day] = { almusal: [], tanghalian: [], merienda: [], hapunan: [] };
        }
        const item: PlannedMealItem = {
          food_item_id: foodItemIds[i],
          name: meal.meal_name,
          quantity_g: 100,
          calories: meal.macros.calories,
          protein_g: meal.macros.protein_g,
          carbs_g: meal.macros.carbs_g,
          fat_g: meal.macros.fat_g,
        };
        (planData[day] as MealPlanDayData)[slot] = [item];
      });

      const { data: existing } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .eq('is_template', false)
        .maybeSingle();

      if (existing) {
        const { error: upErr } = await supabase
          .from('meal_plans')
          .update({ plan_data: planData, updated_at: new Date().toISOString() })
          .eq('id', (existing as { id: string }).id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userId,
            name: 'AI Meal Plan',
            week_start_date: weekStartDate,
            plan_data: planData,
            is_template: false,
          });
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, { weekStartDate }) => {
      const freshUserId = useAuthStore.getState().session?.user.id;
      queryClient.invalidateQueries({ queryKey: ['meal_plan', freshUserId, weekStartDate] });
    },
  });
}

export function useAddAIMealToDiary() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      meal, slot, date,
    }: {
      meal: AISuggestedMeal;
      slot: MealSlot;
      date: string;
    }): Promise<void> => {
      if (!userId) throw new Error('Not logged in');
      const foodItemId = await createAIFoodItem(meal);
      const logged_at = new Date(
        `${date}T${String(SLOT_HOURS[slot]).padStart(2, '0')}:00:00Z`
      ).toISOString();
      const { error } = await supabase.from('food_logs').insert({
        user_id: userId,
        food_item_id: foodItemId,
        meal_slot: slot,
        quantity_g: 100,
        logged_at,
        ai_estimated: true,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { date }) => {
      const freshUserId = useAuthStore.getState().session?.user.id;
      queryClient.invalidateQueries({ queryKey: ['food_logs', freshUserId, date] });
    },
  });
}

export function useAddAIMealToPlan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      meal, weekStartDate, planDay, mealSlot,
    }: {
      meal: AISuggestedMeal;
      weekStartDate: string;
      planDay: WeekDay;
      mealSlot: MealSlot;
    }): Promise<void> => {
      if (!userId) throw new Error('Not logged in');
      const foodItemId = await createAIFoodItem(meal);
      const item: PlannedMealItem = {
        food_item_id: foodItemId,
        name: meal.meal_name,
        quantity_g: 100,
        calories: meal.macros.calories,
        protein_g: meal.macros.protein_g,
        carbs_g: meal.macros.carbs_g,
        fat_g: meal.macros.fat_g,
      };

      const { data: existing } = await supabase
        .from('meal_plans')
        .select('id, plan_data')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .eq('is_template', false)
        .maybeSingle();

      const existingPlan = existing as { id: string; plan_data: MealPlanData } | null;
      const planData: MealPlanData = existingPlan?.plan_data ?? {};
      const dayData: MealPlanDayData = planData[planDay] ?? { almusal: [], tanghalian: [], merienda: [], hapunan: [] };
      const updated: MealPlanData = {
        ...planData,
        [planDay]: { ...dayData, [mealSlot]: [...(dayData[mealSlot] ?? []), item] },
      };

      if (existingPlan) {
        const { error } = await supabase
          .from('meal_plans')
          .update({ plan_data: updated, updated_at: new Date().toISOString() })
          .eq('id', existingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userId,
            name: 'My Meal Plan',
            week_start_date: weekStartDate,
            plan_data: updated,
            is_template: false,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_data, { weekStartDate }) => {
      const freshUserId = useAuthStore.getState().session?.user.id;
      queryClient.invalidateQueries({ queryKey: ['meal_plan', freshUserId, weekStartDate] });
    },
  });
}
