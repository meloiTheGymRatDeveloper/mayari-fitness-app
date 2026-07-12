import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { DAILY_TIP_PROMPT } from '../lib/coachChat';
import type { CoachMessage, MessageType } from '../types/database';

export function useCoachMessages() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['coach_messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CoachMessage[];
    },
    enabled: !!userId,
  });
}

export function useTodayMessageCount() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['coach_messages_today', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const today = new Date().toISOString().substring(0, 10);
      const { count, error } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useSendMessage(messageType: MessageType = 'chat') {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (message: string): Promise<{ response: string }> => {
      if (!userId) throw new Error('Not logged in');
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: { message, messageType },
      });
      if (error) throw error;
      return data as { response: string };
    },
    onSuccess: () => {
      const freshUserId = useAuthStore.getState().session?.user.id;
      queryClient.invalidateQueries({ queryKey: ['coach_messages', freshUserId] });
      queryClient.invalidateQueries({ queryKey: ['coach_messages_today', freshUserId] });
    },
  });
}

export function useDailyTip() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['daily_tip', userId],
    queryFn: async (): Promise<string> => {
      if (!userId) return '';
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: DAILY_TIP_PROMPT,
          messageType: 'chat',
        },
      });
      if (error) throw error;
      return (data as { response: string }).response;
    },
    enabled: !!userId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
