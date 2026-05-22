import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  MealPlan, MealPlanData, MealPlanDayData, PlannedMealItem,
  WeekDay, MealSlot, GroceryList, GroceryItem, GroceryCategory,
} from '../types/database';

const WEEK_DAYS: WeekDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
export { WEEK_DAYS };

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function weekDayToDateStr(weekStartDate: string, day: WeekDay): string {
  return addDaysToDateStr(weekStartDate, WEEK_DAYS.indexOf(day));
}

function emptyDayData(): MealPlanDayData {
  return { almusal: [], tanghalian: [], merienda: [], hapunan: [] };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMealPlan(weekStartDate: string) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['meal_plan', userId, weekStartDate],
    queryFn: async (): Promise<MealPlan | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .eq('is_template', false)
        .maybeSingle();
      if (error) throw error;
      return data as MealPlan | null;
    },
    enabled: !!userId,
  });
}

export function useMealPlanTemplates() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['meal_plan_templates', userId],
    queryFn: async (): Promise<MealPlan[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_template', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MealPlan[];
    },
    enabled: !!userId,
  });
}

export function useLatestGroceryList() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['grocery_list', userId],
    queryFn: async (): Promise<GroceryList | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as GroceryList | null;
    },
    enabled: !!userId,
  });
}

// ─── Internal helper: upsert a plan's plan_data ───────────────────────────────

async function upsertPlanData(
  userId: string,
  weekStartDate: string,
  planData: MealPlanData,
  name?: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .eq('is_template', false)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ plan_data: planData, updated_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        name: name ?? 'My Meal Plan',
        week_start_date: weekStartDate,
        plan_data: planData,
        is_template: false,
      });
    if (error) throw error;
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAddFoodToPlan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      weekStartDate, planDay, mealSlot, item,
    }: {
      weekStartDate: string;
      planDay: WeekDay;
      mealSlot: MealSlot;
      item: PlannedMealItem;
    }) => {
      if (!userId) throw new Error('Not logged in');
      const { data: existing } = await supabase
        .from('meal_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .eq('is_template', false)
        .maybeSingle();
      const planData: MealPlanData = (existing as MealPlan | null)?.plan_data ?? {};
      const dayData = planData[planDay] ?? emptyDayData();
      const updated: MealPlanData = {
        ...planData,
        [planDay]: { ...dayData, [mealSlot]: [...(dayData[mealSlot] ?? []), item] },
      };
      await upsertPlanData(userId, weekStartDate, updated);
    },
    onSuccess: (_data, { weekStartDate }) => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan', userId, weekStartDate] });
    },
  });
}

export function useRemoveFoodFromPlan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      weekStartDate, planDay, mealSlot, itemIndex, currentPlanData,
    }: {
      weekStartDate: string;
      planDay: WeekDay;
      mealSlot: MealSlot;
      itemIndex: number;
      currentPlanData: MealPlanData;
    }) => {
      if (!userId) throw new Error('Not logged in');
      const dayData = currentPlanData[planDay] ?? emptyDayData();
      const newSlot = (dayData[mealSlot] ?? []).filter((_, i) => i !== itemIndex);
      const updated: MealPlanData = {
        ...currentPlanData,
        [planDay]: { ...dayData, [mealSlot]: newSlot },
      };
      await upsertPlanData(userId, weekStartDate, updated);
    },
    onSuccess: (_data, { weekStartDate }) => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan', userId, weekStartDate] });
    },
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      name, planData,
    }: { name: string; planData: MealPlanData }) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userId,
          name,
          week_start_date: '2000-01-01',
          plan_data: planData,
          is_template: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan_templates', userId] });
    },
  });
}

export function useLoadTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      weekStartDate, templatePlanData,
    }: { weekStartDate: string; templatePlanData: MealPlanData }) => {
      if (!userId) throw new Error('Not logged in');
      await upsertPlanData(userId, weekStartDate, templatePlanData);
    },
    onSuccess: (_data, { weekStartDate }) => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan', userId, weekStartDate] });
    },
  });
}

export function useApplyDayToDiary() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      dayData, dateStr,
    }: { dayData: MealPlanDayData; dateStr: string }) => {
      if (!userId) throw new Error('Not logged in');
      const SLOT_HOURS: Record<MealSlot, number> = {
        almusal: 7, tanghalian: 12, merienda: 15, hapunan: 19,
      };
      const rows: {
        user_id: string; food_item_id: string; meal_slot: MealSlot;
        quantity_g: number; logged_at: string;
      }[] = [];
      for (const slot of ['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]) {
        for (const item of dayData[slot] ?? []) {
          const dt = new Date(`${dateStr}T${String(SLOT_HOURS[slot]).padStart(2, '0')}:00:00Z`);
          rows.push({
            user_id: userId,
            food_item_id: item.food_item_id,
            meal_slot: slot,
            quantity_g: item.quantity_g,
            logged_at: dt.toISOString(),
          });
        }
      }
      if (rows.length === 0) return;
      const { error } = await supabase.from('food_logs').insert(rows);
      if (error) throw error;
    },
  });
}

export function useApplyWeekToDiary() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      planData, weekStartDate,
    }: { planData: MealPlanData; weekStartDate: string }) => {
      if (!userId) throw new Error('Not logged in');
      const SLOT_HOURS: Record<MealSlot, number> = {
        almusal: 7, tanghalian: 12, merienda: 15, hapunan: 19,
      };
      const rows: {
        user_id: string; food_item_id: string; meal_slot: MealSlot;
        quantity_g: number; logged_at: string;
      }[] = [];
      for (let i = 0; i < WEEK_DAYS.length; i++) {
        const day = WEEK_DAYS[i];
        const dayData = planData[day];
        if (!dayData) continue;
        const dateStr = addDaysToDateStr(weekStartDate, i);
        for (const slot of ['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]) {
          for (const item of dayData[slot] ?? []) {
            const dt = new Date(`${dateStr}T${String(SLOT_HOURS[slot]).padStart(2, '0')}:00:00Z`);
            rows.push({
              user_id: userId,
              food_item_id: item.food_item_id,
              meal_slot: slot,
              quantity_g: item.quantity_g,
              logged_at: dt.toISOString(),
            });
          }
        }
      }
      if (rows.length === 0) return;
      const { error } = await supabase.from('food_logs').insert(rows);
      if (error) throw error;
    },
  });
}

export function useUpsertGroceryList() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      groceryId, mealPlanId, name, items,
    }: {
      groceryId: string | null;
      mealPlanId: string | null;
      name: string | null;
      items: GroceryItem[];
    }) => {
      if (!userId) throw new Error('Not logged in');
      if (groceryId) {
        const { error } = await supabase
          .from('grocery_lists')
          .update({ items, name })
          .eq('id', groceryId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grocery_lists')
          .insert({ user_id: userId, meal_plan_id: mealPlanId, name, items });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery_list', userId] });
    },
  });
}

// ─── Grocery helpers ──────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  proteins: ['manok', 'baboy', 'baka', 'isda', 'tilapia', 'bangus', 'sardinas', 'tuna', 'spam', 'itlog', 'tokwa', 'tofu', 'hipon', 'chicken', 'pork', 'beef', 'fish', 'egg', 'shrimp'],
  carbs: ['kanin', 'bigas', 'rice', 'tinapay', 'bread', 'pasta', 'noodles', 'kamote', 'potato', 'oats', 'pancit', 'corn', 'mais'],
  vegetables: ['kangkong', 'sitaw', 'talong', 'ampalaya', 'okra', 'pechay', 'gulay', 'kamatis', 'sibuyas', 'bawang', 'carrot', 'karot', 'broccoli', 'spinach', 'salad'],
  pantry: ['toyo', 'suka', 'asin', 'asukal', 'mantika', 'oil', 'sauce', 'seasoning', 'canned', 'de lata', 'vinegar', 'soy', 'salt', 'sugar'],
  dairy: ['gatas', 'milk', 'keso', 'cheese', 'butter', 'margarine', 'yogurt'],
};

export function categorizeItem(name: string): GroceryCategory {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return cat as GroceryCategory;
    }
  }
  return 'others';
}

export function generateGroceryItems(planData: MealPlanData): GroceryItem[] {
  const totals = new Map<string, { quantity_g: number; category: GroceryCategory }>();
  for (const day of WEEK_DAYS) {
    const dayData = planData[day];
    if (!dayData) continue;
    for (const slot of ['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]) {
      for (const item of dayData[slot] ?? []) {
        const key = item.name.toLowerCase().trim();
        const existing = totals.get(key);
        if (existing) {
          existing.quantity_g += item.quantity_g;
        } else {
          totals.set(key, {
            quantity_g: item.quantity_g,
            category: categorizeItem(item.name),
          });
        }
      }
    }
  }

  const PIECE_KEYWORDS = ['itlog', 'egg', 'banana', 'saging'];
  const PIECE_WEIGHT_G = 50;

  return Array.from(totals.entries()).map(([name, { quantity_g, category }]) => {
    const isPiece = PIECE_KEYWORDS.some(k => name.includes(k));
    let quantity: number;
    let unit: GroceryItem['unit'];
    if (isPiece) {
      quantity = Math.max(1, Math.round(quantity_g / PIECE_WEIGHT_G));
      unit = 'pcs';
    } else if (quantity_g >= 1000) {
      quantity = Math.round((quantity_g / 1000) * 10) / 10;
      unit = 'kg';
    } else {
      quantity = Math.round(quantity_g);
      unit = 'g';
    }
    return {
      id: Math.random().toString(36).slice(2),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity,
      unit,
      category,
      checked: false,
    };
  });
}

// ─── Fetch single plan by ID ─────────────────────────────────────────────────

export function useMealPlanById(planId: string | null) {
  return useQuery<Pick<MealPlan, 'id' | 'plan_data'> | null>({
    queryKey: ['meal_plan_by_id', planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from('meal_plans')
        .select('plan_data, id')
        .eq('id', planId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
    staleTime: 300_000,
  });
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

export function useDebounce(fn: (...args: unknown[]) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: unknown[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  };
}
