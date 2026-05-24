import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { CoachTip, TipType } from '../types/database';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function useCoachTips() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery<CoachTip[]>({
    queryKey: ['coach_tips', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_tips')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnreadTipCount() {
  const { data: tips = [] } = useCoachTips();
  return tips.filter(t => t.read_at === null).length;
}

export function useLatestTip() {
  const { data: tips = [] } = useCoachTips();
  return tips[0] ?? null;
}

export function useLatestTipByType(type: TipType) {
  const { data: tips = [] } = useCoachTips();
  return tips.find(t => t.tip_type === type) ?? null;
}

export function useMarkAllTipsRead() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('coach_tips')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_tips', userId] });
    },
  });
}

export function useRequestTip() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  const lastTipRequestAt = useAuthStore(s => s.lastTipRequestAt);
  const setLastTipRequestAt = useAuthStore(s => s.setLastTipRequestAt);

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const now = Date.now();
      if (lastTipRequestAt && now - lastTipRequestAt < SIX_HOURS_MS) {
        return; // throttled
      }
      setLastTipRequestAt(now);
      const { error } = await supabase.functions.invoke('coach-tips');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_tips', userId] });
    },
  });
}
