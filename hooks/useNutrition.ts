import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { FoodLogWithItem, WaterLog, MealSlot, FoodItem } from '../types/database';

function dayRange(date: string): { gte: string; lte: string } {
  // Use local midnight (no Z suffix) so the range matches the device's local date,
  // not UTC — important for PH timezone (UTC+8) users logging between midnight–8am.
  const gte = new Date(date + 'T00:00:00').toISOString();
  const lte = new Date(date + 'T23:59:59').toISOString();
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
  return useMutation({
    mutationFn: async ({ logId }: { logId: string; date: string }) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food_logs'] });
    },
  });
}

export function useUpdateFoodLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ logId, quantityG, mealSlot }: { logId: string; quantityG: number; mealSlot: MealSlot }) => {
      const { error } = await supabase
        .from('food_logs')
        .update({ quantity_g: quantityG, meal_slot: mealSlot })
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food_logs'] });
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

export interface FoodSubmission {
  id: string;
  submitted_by: string | null;
  name: string;
  name_fil: string | null;
  brand: string | null;
  barcode: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  is_ph_local: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export function useSubmitFood() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (data: {
      name: string;
      name_fil?: string | null;
      brand?: string | null;
      barcode?: string | null;
      calories_per_100g: number;
      protein_per_100g: number;
      carbs_per_100g: number;
      fat_per_100g: number;
      fiber_per_100g?: number | null;
      is_ph_local?: boolean;
    }) => {
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase
        .from('food_submissions')
        .insert({ ...data, submitted_by: userId, status: 'pending' });
      if (error) throw error;
    },
  });
}

export function useAdminSubmissions() {
  return useQuery({
    queryKey: ['food_submissions', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as FoodSubmission[];
    },
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (sub: FoodSubmission) => {
      const { error: insertErr } = await supabase.from('food_items').insert({
        name: sub.name,
        name_fil: sub.name_fil,
        brand: sub.brand,
        barcode: sub.barcode,
        calories_per_100g: sub.calories_per_100g,
        protein_per_100g: sub.protein_per_100g,
        carbs_per_100g: sub.carbs_per_100g,
        fat_per_100g: sub.fat_per_100g,
        fiber_per_100g: sub.fiber_per_100g,
        is_ph_local: sub.is_ph_local,
        source: 'custom' as const,
        source_id: null,
      });
      if (insertErr) throw insertErr;
      const { error: updateErr } = await supabase
        .from('food_submissions')
        .update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() })
        .eq('id', sub.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food_submissions'] }),
  });
}

export function useRejectSubmission() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('food_submissions')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          reject_reason: reason,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food_submissions'] }),
  });
}
