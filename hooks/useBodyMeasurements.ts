import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { BodyMeasurement } from '../types/database';

export function useMeasurements() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<BodyMeasurement[]>({
    queryKey: ['measurements', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as BodyMeasurement[];
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}

export function useAddMeasurement() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<BodyMeasurement, 'id' | 'user_id'>) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('body_measurements')
        .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,measured_at' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['measurements', userId] }),
  });
}
