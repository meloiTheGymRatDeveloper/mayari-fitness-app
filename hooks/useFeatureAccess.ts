import { useAuthStore } from '../stores/authStore';
import type { SubscriptionStatus } from '../types/database';

export type ProFeature =
  | 'coachTips'
  | 'photoCalorie'
  | 'voiceLog'
  | 'aiFoodLookup'
  | 'intermittentFasting'
  | 'advancedAnalytics'
  | 'unlimitedBuddies';

export const PRO_STATUSES: SubscriptionStatus[] = ['beta', 'active', 'achiever'];

export const FREE_BUDDY_LIMIT = 3;

export function useFeatureAccess() {
  const status = useAuthStore((s) => s.profile?.subscription_status ?? 'free');
  const isPro = PRO_STATUSES.includes(status);
  // All Pro features require the same subscription — per-feature logic can be added here if needed
  const canUse = (_feature: ProFeature): boolean => isPro;
  return { isPro, canUse, status };
}
