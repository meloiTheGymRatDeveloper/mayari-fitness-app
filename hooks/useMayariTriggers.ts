// hooks/useMayariTriggers.ts
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { TriggerEvent } from '../types/database';

export function useMayariTriggers() {
  const userId = useAuthStore(s => s.session?.user.id);
  const queryClient = useQueryClient();

  const fire = useCallback(async (
    triggerEvent: TriggerEvent,
    context: Record<string, unknown> = {},
    sendPush = false,
  ) => {
    if (!userId) return;
    try {
      await supabase.functions.invoke('mayari-triggers', {
        body: { trigger_event: triggerEvent, context, send_push: sendPush },
      });
      queryClient.invalidateQueries({ queryKey: ['coach_tips', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread_tip_count', userId] });
    } catch {
      // Tips are non-critical — silently ignore
    }
  }, [userId, queryClient]);

  return { fire };
}
