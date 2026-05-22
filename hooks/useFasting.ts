import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { FastingLog } from '../types/database';

export function useActiveFast() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<FastingLog | null>({
    queryKey: ['active_fast', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('fasting_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as FastingLog | null;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnMount: true,
  });
}

export function useStartFast() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (windowHours: number) => {
      if (!userId) throw new Error('Not authenticated');
      const fastingStart = new Date();
      const eatingWindowStart = new Date(fastingStart.getTime() + windowHours * 3_600_000);
      const eatingWindowEnd = new Date(eatingWindowStart.getTime() + (24 - windowHours) * 3_600_000);
      const { data, error } = await supabase
        .from('fasting_logs')
        .insert({
          user_id: userId,
          target_window_hours: windowHours,
          fasting_start: fastingStart.toISOString(),
          eating_window_start: eatingWindowStart.toISOString(),
          eating_window_end: eatingWindowEnd.toISOString(),
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return data as FastingLog;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active_fast', userId] }),
  });
}

export function useEndFast() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fastId, status }: { fastId: string; status: 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('fasting_logs')
        .update({ status, fasting_end: new Date().toISOString() })
        .eq('id', fastId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active_fast', userId] }),
  });
}
