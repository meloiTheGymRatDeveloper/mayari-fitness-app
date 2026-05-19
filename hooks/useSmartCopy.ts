import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { MealSlot } from '../types/database';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function useYesterdaySlotHasData(slot: MealSlot, date: string) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['yesterday_slot', userId, slot, date],
    queryFn: async () => {
      if (!userId) return false;
      const yesterday = addDays(date, -1);
      const gte = new Date(yesterday + 'T00:00:00Z').toISOString();
      const lte = new Date(yesterday + 'T23:59:59Z').toISOString();
      const { count } = await supabase
        .from('food_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('meal_slot', slot)
        .gte('logged_at', gte)
        .lte('logged_at', lte);
      return (count ?? 0) > 0;
    },
    enabled: !!userId,
  });
}

export function useSmartCopy() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slot, targetDate }: { slot: MealSlot; targetDate: string }) => {
      if (!userId) throw new Error('Not logged in');
      const yesterday = addDays(targetDate, -1);
      const gte = new Date(yesterday + 'T00:00:00Z').toISOString();
      const lte = new Date(yesterday + 'T23:59:59Z').toISOString();
      const { data: logs, error: fetchErr } = await supabase
        .from('food_logs')
        .select('food_item_id, quantity_g')
        .eq('user_id', userId)
        .eq('meal_slot', slot)
        .gte('logged_at', gte)
        .lte('logged_at', lte);
      if (fetchErr) throw fetchErr;
      if (!logs?.length) return;
      const now = new Date().toISOString();
      const { error } = await supabase.from('food_logs').insert(
        logs.map((l) => ({
          user_id: userId,
          food_item_id: l.food_item_id,
          quantity_g: l.quantity_g,
          meal_slot: slot,
          logged_at: now,
        }))
      );
      if (error) throw error;
    },
    onSuccess: (_data, { targetDate }) => {
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, targetDate] });
    },
  });
}
