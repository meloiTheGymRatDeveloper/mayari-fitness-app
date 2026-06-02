import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import { useSubscription, useCreatePaymentLink, useCancelSubscription } from '../../../hooks/useSubscription';
import { useMyReferrals, calcReferralDiscount } from '../../../hooks/useReferrals';

const BETA_PRICE = 50;
const MONTHLY_PRICE = 89;
const YEARLY_PRICE = 799;
const CONSISTENCY_DISCOUNT_PCT = 0.1;

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const PRO_FEATURES = [
  'Coach Mayari — personalised AI tips',
  'Photo calorie estimation',
  'Voice food logging (Tagalog/English)',
  'AI food lookup',
  'Intermittent fasting timer',
  'Advanced analytics dashboard',
  'Unlimited buddy connections + chat',
  'Push notifications',
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sub, isLoading, refetch } = useSubscription();
  const { data: referrals } = useMyReferrals();
  const createPaymentLink = useCreatePaymentLink();
  const cancelSub = useCancelSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'beta' | 'monthly' | 'yearly'>('beta');
  const [opening, setOpening] = useState(false);

  const isActive = sub?.tier === 'beta' || sub?.tier === 'active' || sub?.tier === 'achiever';
  const paymentFailed =
    sub?.tier === 'free' &&
    sub?.current_period_end != null &&
    new Date(sub.current_period_end) < new Date();

  const referralDiscount = calcReferralDiscount(referrals);
  const consistencyDiscount = sub?.consistency_discount_pct
    ? Math.round(MONTHLY_PRICE * CONSISTENCY_DISCOUNT_PCT)
    : 0;

  const monthlyFinal = Math.max(1, MONTHLY_PRICE - consistencyDiscount - referralDiscount);
  const displayedPrice = selectedPlan === 'yearly' ? YEARLY_PRICE : selectedPlan === 'beta' ? BETA_PRICE : monthlyFinal;
  const yearlySaving = MONTHLY_PRICE * 12 - YEARLY_PRICE;

  async function handleSubscribe() {
    try {
      setOpening(true);
      const result = await createPaymentLink.mutateAsync(selectedPlan);
      await WebBrowser.openBrowserAsync(result.checkout_url);
      await refetch();
    } catch (err: unknown) {
      Alert.alert('Payment Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setOpening(false);
    }
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Subscription',
      `Your access continues until ${formatDate(sub?.current_period_end ?? null)}. Cancel anyway?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await cancelSub.mutateAsync();
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel. Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Subscription</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {paymentFailed && (
            <View style={styles.paymentFailedCard}>
              <Text style={styles.paymentFailedTitle}>⚠️  Payment failed</Text>
              <Text style={styles.paymentFailedBody}>
                Your last payment didn't go through. Resubscribe to restore access.
              </Text>
              <TouchableOpacity
                style={[styles.paymentFailedBtn, (opening || createPaymentLink.isPending) && styles.disabled]}
                onPress={handleSubscribe}
                disabled={opening || createPaymentLink.isPending}
              >
                <Text style={styles.paymentFailedBtnText}>Resubscribe</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Current plan */}
          <View style={[styles.planCard, isActive && styles.planCardActive]}>
            <Text style={styles.planLabel}>CURRENT PLAN</Text>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planTier}>{isActive ? 'Pro' : 'Free'}</Text>
                {isActive && sub?.current_period_end ? (
                  <Text style={styles.planSub}>Renews {formatDate(sub.current_period_end)}</Text>
                ) : (
                  <Text style={styles.planSub}>Limited features</Text>
                )}
              </View>
              <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeFree]}>
                <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextFree]}>
                  {isActive ? 'ACTIVE' : 'FREE'}
                </Text>
              </View>
            </View>
          </View>

          {/* Pro plan offer (free users only) */}
          {!isActive && (
            <View style={styles.offerCard}>
              <Text style={styles.offerLabel}>🌙 MAYARI PRO</Text>

              {/* Plan toggle */}
              <View style={styles.planToggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, selectedPlan === 'beta' && styles.toggleBtnActive]}
                  onPress={() => setSelectedPlan('beta')}
                >
                  <Text style={[styles.toggleBtnText, selectedPlan === 'beta' && styles.toggleBtnTextActive]}>
                    Early Access
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, selectedPlan === 'monthly' && styles.toggleBtnActive]}
                  onPress={() => setSelectedPlan('monthly')}
                >
                  <Text style={[styles.toggleBtnText, selectedPlan === 'monthly' && styles.toggleBtnTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, selectedPlan === 'yearly' && styles.toggleBtnActive]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <Text style={[styles.toggleBtnText, selectedPlan === 'yearly' && styles.toggleBtnTextActive]}>
                    Yearly
                  </Text>
                  {yearlySaving > 0 && (
                    <Text style={styles.savingsBadge}>Save ₱{yearlySaving}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Beta banner */}
              {selectedPlan === 'beta' && (
                <View style={styles.betaBanner}>
                  <Text style={styles.betaBannerText}>
                    💜 Early Access rate — renews at ₱{MONTHLY_PRICE}/month after launch
                  </Text>
                </View>
              )}

              {/* Price display */}
              <View style={styles.offerPriceRow}>
                <Text style={styles.offerPrice}>₱{displayedPrice}</Text>
                <Text style={styles.offerPriceSub}>
                  {selectedPlan === 'yearly' ? '/year' : '/month'}
                </Text>
              </View>

              {/* Discount breakdown (monthly only) */}
              {selectedPlan === 'monthly' && (consistencyDiscount > 0 || referralDiscount > 0) && (
                <View style={styles.discountBreakdown}>
                  <Text style={styles.discountLine}>Regular price: ₱{MONTHLY_PRICE}/month</Text>
                  {consistencyDiscount > 0 && (
                    <Text style={styles.discountLine}>Consistency discount: −₱{consistencyDiscount}</Text>
                  )}
                  {referralDiscount > 0 && (
                    <Text style={styles.discountLine}>Referral discount: −₱{referralDiscount}</Text>
                  )}
                </View>
              )}

              {PRO_FEATURES.map(f => (
                <Text key={f} style={styles.offerFeature}>✓ {f}</Text>
              ))}

              <TouchableOpacity
                style={[styles.subscribeBtn, (opening || createPaymentLink.isPending) && styles.disabled]}
                onPress={handleSubscribe}
                disabled={opening || createPaymentLink.isPending}
              >
                <Text style={styles.subscribeBtnText}>
                  {opening || createPaymentLink.isPending
                    ? 'Opening...'
                    : `Subscribe · ₱${displayedPrice}${selectedPlan === 'yearly' ? '/year' : '/month'}`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Referral discount card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>REFERRAL DISCOUNT</Text>
            {referralDiscount > 0 ? (
              <Text style={styles.referralDiscountActive}>
                ₱{referralDiscount}/month off applied ✓
              </Text>
            ) : (
              <Text style={styles.discountNote}>
                Refer a friend and get ₱20/month off while they stay subscribed.
              </Text>
            )}
          </View>

          {/* Referral link */}
          <TouchableOpacity
            style={styles.referralRow}
            onPress={() => router.push('/(tabs)/profile/referral' as never)}
          >
            <Text style={styles.referralEmoji}>🎁</Text>
            <View style={styles.referralText}>
              <Text style={styles.referralTitle}>Refer friends, save ₱20/month</Text>
              <Text style={styles.referralSub}>1 active referral = ₱20 off every billing cycle</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Cancel (active users only) */}
          {isActive && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelSub.isPending && styles.disabled]}
              onPress={handleCancel}
              disabled={cancelSub.isPending}
            >
              <Text style={styles.cancelBtnText}>
                {cancelSub.isPending ? 'Cancelling...' : 'Cancel Subscription'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footnote}>
            Payment processed by PayMongo. GCash, Maya, Visa/Mastercard accepted.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.medium, width: 60 },
  title: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  content: { padding: spacing.lg, gap: spacing.md },
  planCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  planCardActive: { borderColor: colors.success },
  planLabel: {
    ...labelStyle,
    marginBottom: spacing.sm,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTier: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  planSub: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  badgeActive: { backgroundColor: `${colors.success}22`, borderColor: colors.success },
  badgeFree: { backgroundColor: colors.bg.elevated, borderColor: colors.border },
  badgeText: { fontSize: typography.xs, fontFamily: fonts.semibold },
  badgeTextActive: { color: colors.success },
  badgeTextFree: { color: colors.text.muted },
  offerCard: {
    backgroundColor: colors.bg.elevated, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.brand.primary, gap: spacing.xs,
  },
  offerLabel: {
    ...labelStyle,
    color: colors.brand.secondary,
  },
  planToggle: {
    flexDirection: 'row', backgroundColor: colors.bg.secondary,
    borderRadius: 10, padding: 3, marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  toggleBtn: {
    flex: 1, paddingVertical: spacing.xs, alignItems: 'center',
    borderRadius: 8, position: 'relative',
  },
  toggleBtnActive: { backgroundColor: colors.brand.primary },
  toggleBtnText: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.semibold },
  toggleBtnTextActive: { color: colors.white },
  savingsBadge: {
    position: 'absolute', top: -8, right: 4,
    backgroundColor: colors.success, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
    color: '#fff', fontFamily: fonts.bold, fontSize: 9,
  } as never,
  offerPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: spacing.xs },
  offerPrice: { color: colors.brand.gold, fontSize: 28, fontFamily: fonts.extrabold },
  offerPriceSub: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.regular, marginBottom: 4 },
  betaBanner: {
    backgroundColor: `${colors.brand.secondary}22`,
    borderRadius: 8, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.brand.secondary,
  },
  betaBannerText: {
    color: colors.brand.secondary, fontSize: typography.xs, fontFamily: fonts.regular,
    textAlign: 'center',
  },
  discountBreakdown: {
    backgroundColor: colors.bg.secondary, borderRadius: 8,
    padding: spacing.sm, gap: 2, marginBottom: spacing.xs,
  },
  discountLine: { color: colors.text.secondary, fontSize: typography.xs, fontFamily: fonts.regular },
  offerFeature: { color: colors.text.primary, fontSize: typography.xs, fontFamily: fonts.regular },
  subscribeBtn: {
    backgroundColor: colors.brand.gold, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  subscribeBtnText: { color: colors.bg.primary, fontSize: typography.base, fontFamily: fonts.bold },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: {
    ...labelStyle,
    marginBottom: spacing.sm,
  },
  referralDiscountActive: {
    color: colors.success, fontSize: typography.sm, fontFamily: fonts.semibold,
  },
  discountNote: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular },
  referralRow: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  referralEmoji: { fontSize: 20 },
  referralText: { flex: 1 },
  referralTitle: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  referralSub: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular, marginTop: 2 },
  chevron: { color: colors.text.muted, fontSize: 20 },
  cancelBtn: {
    borderRadius: 14, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.error, fontSize: typography.base, fontFamily: fonts.semibold },
  footnote: {
    color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular,
    textAlign: 'center', marginTop: spacing.xs,
  },
  paymentFailedCard: {
    backgroundColor: colors.warning + '18',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.warning,
    padding: spacing.md,
  },
  paymentFailedTitle: {
    color: colors.warning,
    fontSize: typography.base,
    fontFamily: fonts.bold,
    marginBottom: spacing.xs,
  },
  paymentFailedBody: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  paymentFailedBtn: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  paymentFailedBtnText: {
    color: '#000',
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
});
