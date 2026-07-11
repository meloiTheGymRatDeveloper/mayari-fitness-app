// hooks/useCoachChat.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { CoachMessage } from '../types/database';

export const DAILY_CHAT_LIMIT = 5;

export function useCoachChatHistory() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery<CoachMessage[]>({
    queryKey: ['coach_chat', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', userId!)
        .eq('message_type', 'chat')
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Count of chat messages the user sent today (Manila) — drives the "X left" pill. */
export function useChatRemaining() {
  const { data: messages = [] } = useCoachChatHistory();
  const manilaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' });
  const dayStartUtc = new Date(`${manilaDate}T00:00:00+08:00`).getTime();
  const usedToday = messages.filter(
    m => m.role === 'user' && new Date(m.created_at).getTime() >= dayStartUtc,
  ).length;
  return Math.max(0, DAILY_CHAT_LIMIT - usedToday);
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  const [limitHit, setLimitHit] = useState(false);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: { message, messageType: 'chat' },
      });
      if (error) {
        // supabase-js surfaces non-2xx as FunctionsHttpError with response context
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 429) {
          setLimitHit(true);
          throw new Error('daily_limit');
        }
        throw error;
      }
      return data as { response: string; remaining: number };
    },
    onMutate: async (message: string) => {
      // Optimistic append so the user's bubble shows instantly
      await queryClient.cancelQueries({ queryKey: ['coach_chat', userId] });
      const optimistic: CoachMessage = {
        id: `optimistic-${Date.now()}`,
        user_id: userId ?? '',
        role: 'user',
        content: message,
        message_type: 'chat',
        created_at: new Date().toISOString(),
      } as CoachMessage;
      queryClient.setQueryData<CoachMessage[]>(['coach_chat', userId], (old = []) => [...old, optimistic]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_chat', userId] });
    },
  });

  return { ...mutation, limitHit };
}
