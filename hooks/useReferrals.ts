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

// Returns flat ₱20 off if user has at least one active referral (max 1 discount/month)
export function calcReferralDiscount(referrals: ReferralWithUser[] | undefined): number {
  const hasActive = (referrals ?? []).some(r => r.status === 'active');
  return hasActive ? 20 : 0;
}
