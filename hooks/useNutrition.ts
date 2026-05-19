import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { FoodLogWithItem, WaterLog, MealSlot, FoodItem } from '../types/database';

function dayRange(date: string): { gte: string; lte: string } {
  const gte = new Date(date + 'T00:00:00Z').toISOString();
  const lte = new Date(date + 'T23:59:59Z').toISOString();
  return { gte, lte };
}

export function useFoodLogs(date: string) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['food_logs', userId, date],
    queryFn: async () => {
      if (!userId) return [];
      const { gte, lte } = dayRange(date);
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, food_item:food_items(*)')
        .eq('user_id', userId)
        .gte('logged_at', gte)
        .lte('logged_at', lte)
        .order('logged_at');
      if (error) throw error;
      return (data ?? []) as FoodLogWithItem[];
    },
    enabled: !!userId,
  });
}

export function useWaterLogs(date: string) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['water_logs', userId, date],
    queryFn: async () => {
      if (!userId) return [];
      const { gte, lte } = dayRange(date);
      const { data, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', gte)
        .lte('logged_at', lte)
        .order('logged_at');
      if (error) throw error;
      return (data ?? []) as WaterLog[];
    },
    enabled: !!userId,
  });
}

export function useAddWater() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (date: string) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase.from('water_logs').insert({
        user_id: userId,
        amount_ml: 250,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, date) => {
      queryClient.invalidateQueries({ queryKey: ['water_logs', userId, date] });
    },
  });
}

export function useRemoveWater() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({ date, lastId }: { date: string; lastId: string }) => {
      const { error } = await supabase.from('water_logs').delete().eq('id', lastId);
      if (error) throw error;
    },
    onSuccess: (_data, { date }) => {
      queryClient.invalidateQueries({ queryKey: ['water_logs', userId, date] });
    },
  });
}

export function useLogFood() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({
      foodItemId, mealSlot, quantityG, date,
    }: { foodItemId: string; mealSlot: MealSlot; quantityG: number; date: string }) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase.from('food_logs').insert({
        user_id: userId,
        food_item_id: foodItemId,
        meal_slot: mealSlot,
        quantity_g: quantityG,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, { date }) => {
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, date] });
    },
  });
}

export function useDeleteFoodLog() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({ logId, date }: { logId: string; date: string }) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: (_data, { date }) => {
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, date] });
    },
  });
}

export function useRecentFoods() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['food_logs', 'recent', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('food_logs')
        .select('food_item:food_items(*)')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const seen = new Set<string>();
      const unique: FoodItem[] = [];
      for (const row of (data ?? []) as unknown as { food_item: FoodItem }[]) {
        if (row.food_item && !seen.has(row.food_item.id)) {
          seen.add(row.food_item.id);
          unique.push(row.food_item);
          if (unique.length >= 10) break;
        }
      }
      return unique;
    },
    enabled: !!userId,
  });
}
