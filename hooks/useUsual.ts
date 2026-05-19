import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { MealSlot } from '../types/database';

export interface UsualFood {
  food_item_id: string;
  name: string;
  typical_qty_g: number;
  calories: number;
}

export function useUsualFoods() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const pinned = useQuery({
    queryKey: ['food_pins', userId],
    queryFn: async (): Promise<UsualFood[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('food_pins')
        .select('food_item_id, food_items(name, calories_per_100g)')
        .eq('user_id', userId)
        .order('pinned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => {
        const item = (p.food_items as unknown) as { name: string; calories_per_100g: number | null } | null;
        return {
          food_item_id: p.food_item_id,
          name: item?.name ?? '',
          typical_qty_g: 100,
          calories: item?.calories_per_100g ?? 0,
        };
      });
    },
    enabled: !!userId,
  });

  const frequent = useQuery({
    queryKey: ['frequent_foods', userId],
    queryFn: async (): Promise<UsualFood[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('food_logs')
        .select('food_item_id, quantity_g, food_items(name, calories_per_100g)')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const counts = new Map<
        string,
        { count: number; totalQty: number; name: string; calPer100: number }
      >();
      for (const log of data ?? []) {
        const id = log.food_item_id;
        const item = (log.food_items as unknown) as { name: string; calories_per_100g: number | null } | null;
        if (!id || !item) continue;
        const e = counts.get(id) ?? {
          count: 0,
          totalQty: 0,
          name: item.name,
          calPer100: item.calories_per_100g ?? 0,
        };
        counts.set(id, {
          count: e.count + 1,
          totalQty: e.totalQty + (log.quantity_g ?? 100),
          name: e.name,
          calPer100: e.calPer100,
        });
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, v]) => {
          const qty = Math.round(v.totalQty / v.count);
          return {
            food_item_id: id,
            name: v.name,
            typical_qty_g: qty,
            calories: (v.calPer100 * qty) / 100,
          };
        });
    },
    enabled: !!userId,
  });

  return { pinned: pinned.data ?? [], frequent: frequent.data ?? [] };
}

export function usePinFood() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (foodItemId: string) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase
        .from('food_pins')
        .insert({ user_id: userId, food_item_id: foodItemId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food_pins', userId] }),
  });
}

export function useUnpinFood() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (foodItemId: string) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase
        .from('food_pins')
        .delete()
        .eq('user_id', userId)
        .eq('food_item_id', foodItemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food_pins', userId] }),
  });
}

export function useLogUsualFood() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      foodItemId,
      quantityG,
      mealSlot,
      date,
    }: {
      foodItemId: string;
      quantityG: number;
      mealSlot: MealSlot;
      date: string;
    }) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase.from('food_logs').insert({
        user_id: userId,
        food_item_id: foodItemId,
        quantity_g: quantityG,
        meal_slot: mealSlot,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, { date }) =>
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, date] }),
  });
}
