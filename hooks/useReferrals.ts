import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { ReferralWithUser } from '../types/database';

export function useMyReferrals() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['referrals', 'mine', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('referrals')
        .select('*, referred_user:users!referred_user_id(display_name, username)')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReferralWithUser[];
    },
    enabled: !!userId,
  });
}

export function calcReferralDiscount(referrals: ReferralWithUser[] | undefined): number {
  const activeCount = (referrals ?? []).filter(r => r.status === 'active').length;
  return Math.min(activeCount * 10, 50);
}
