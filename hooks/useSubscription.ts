import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Subscription } from '../types/database';

export function useSubscription() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!userId,
  });
}

interface PaymentLinkResult {
  checkout_url: string;
  amount_pesos: number;
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<PaymentLinkResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('create-payment-link', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as PaymentLinkResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ checkout_url: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('paymongo-billing', {
        headers: { Authorization: `Bearer ${token}` },
        body: { action: 'create_subscription' },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as { checkout_url: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('paymongo-billing', {
        headers: { Authorization: `Bearer ${token}` },
        body: { action: 'cancel_subscription' },
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });
}
