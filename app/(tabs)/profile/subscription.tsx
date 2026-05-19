import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../constants/theme';
import { useSubscription, useCreateSubscription, useCancelSubscription } from '../../../hooks/useSubscription';
import { useMyReferrals, calcReferralDiscount } from '../../../hooks/useReferrals';

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const FEATURES = [
  'Unlimited food logging + AI photo scan',
  'AI meal planning + meal builder',
  'Coach Mayari full access',
  'Analytics + progress charts',
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sub, isLoading, refetch } = useSubscription();
  const { data: referrals } = useMyReferrals();
  const createSub = useCreateSubscription();
  const cancelSub = useCancelSubscription();
  const [opening, setOpening] = useState(false);

  const isActive = sub?.tier === 'beta' || sub?.tier === 'active' || sub?.tier === 'achiever';
  const paymentFailed =
    sub?.tier === 'free' &&
    sub?.current_period_end != null &&
    new Date(sub.current_period_end) < new Date();
  const referralCount = (referrals ?? []).filter(r => r.status === 'active').length;
  const discountPct = calcReferralDiscount(referrals);
  const untilMax = Math.max(0, 5 - referralCount);
  const progressWidth = `${Math.round((discountPct / 50) * 100)}%` as `${number}%`;

  async function handleSubscribe() {
    try {
      setOpening(true);
      const result = await createSub.mutateAsync();
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
                style={[styles.paymentFailedBtn, (opening || createSub.isPending) && styles.disabled]}
                onPress={handleSubscribe}
                disabled={opening || createSub.isPending}
              >
                <Text style={styles.paymentFailedBtnText}>Resubscribe · ₱10/month</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Current plan */}
          <View style={[styles.planCard, isActive && styles.planCardActive]}>
            <Text style={styles.planLabel}>CURRENT PLAN</Text>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planTier}>{isActive ? 'Beta' : 'Free'}</Text>
                {isActive && sub?.current_period_end ? (
                  <Text style={styles.planSub}>Renews {formatDate(sub.current_period_end)} · ₱10</Text>
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

          {/* Beta offer (free users only) */}
          {!isActive && (
            <View style={styles.offerCard}>
              <Text style={styles.offerLabel}>🌙 BETA OFFER</Text>
              <View style={styles.offerPriceRow}>
                <Text style={styles.offerPrice}>₱10</Text>
                <Text style={styles.offerPriceSub}>/month</Text>
              </View>
              <Text style={styles.offerSubtitle}>Unlimited access during beta · cancel anytime</Text>
              {FEATURES.map(f => (
                <Text key={f} style={styles.offerFeature}>✓ {f}</Text>
              ))}
              <TouchableOpacity
                style={[styles.subscribeBtn, (opening || createSub.isPending) && styles.disabled]}
                onPress={handleSubscribe}
                disabled={opening || createSub.isPending}
              >
                <Text style={styles.subscribeBtnText}>
                  {opening || createSub.isPending ? 'Opening...' : 'Subscribe · ₱10/month'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Referral discount card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>REFERRAL DISCOUNT</Text>
            <View style={styles.discountRow}>
              <Text style={styles.discountLeft}>
                {referralCount} friend{referralCount !== 1 ? 's' : ''} referred
              </Text>
              <Text style={styles.discountRight}>{discountPct}% saved</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.discountNote}>
              {`Activates at ₱50/month when beta ends · ${untilMax} more for max discount`}
            </Text>
          </View>

          {/* Referral link */}
          <TouchableOpacity
            style={styles.referralRow}
            onPress={() => router.push('/(tabs)/profile/referral' as never)}
          >
            <Text style={styles.referralEmoji}>🎁</Text>
            <View style={styles.referralText}>
              <Text style={styles.referralTitle}>Refer friends, save later</Text>
              <Text style={styles.referralSub}>10% off per referral when beta ends · max 50%</Text>
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
  back: { color: colors.brand.primary, fontSize: typography.base, width: 60 },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md },
  planCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  planCardActive: { borderColor: colors.success },
  planLabel: {
    color: colors.text.muted, fontSize: typography.xs,
    fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTier: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  planSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  badgeActive: { backgroundColor: `${colors.success}22`, borderColor: colors.success },
  badgeFree: { backgroundColor: colors.bg.elevated, borderColor: colors.border },
  badgeText: { fontSize: typography.xs, fontWeight: '600' },
  badgeTextActive: { color: colors.success },
  badgeTextFree: { color: colors.text.muted },
  offerCard: {
    backgroundColor: colors.bg.elevated, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.brand.primary, gap: spacing.xs,
  },
  offerLabel: {
    color: colors.brand.secondary, fontSize: typography.xs,
    fontWeight: '700', letterSpacing: 1,
  },
  offerPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: spacing.xs },
  offerPrice: { color: colors.text.primary, fontSize: 28, fontWeight: '800' },
  offerPriceSub: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: 4 },
  offerSubtitle: { color: colors.text.secondary, fontSize: typography.xs, marginBottom: spacing.xs },
  offerFeature: { color: colors.text.primary, fontSize: typography.xs },
  subscribeBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  subscribeBtnText: { color: colors.white, fontSize: typography.base, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: {
    color: colors.text.muted, fontSize: typography.xs,
    fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm,
  },
  discountRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  discountLeft: { color: colors.text.secondary, fontSize: typography.sm },
  discountRight: { color: colors.warning, fontSize: typography.sm, fontWeight: '700' },
  progressTrack: {
    backgroundColor: colors.bg.elevated, borderRadius: 4,
    height: 6, marginBottom: spacing.xs,
  },
  progressFill: {
    backgroundColor: colors.brand.primary, borderRadius: 4, height: 6,
  },
  discountNote: { color: colors.text.muted, fontSize: typography.xs },
  referralRow: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  referralEmoji: { fontSize: 20 },
  referralText: { flex: 1 },
  referralTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  referralSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chevron: { color: colors.text.muted, fontSize: 20 },
  cancelBtn: {
    borderRadius: 14, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.error, fontSize: typography.base, fontWeight: '600' },
  footnote: {
    color: colors.text.muted, fontSize: typography.xs,
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
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  paymentFailedBody: {
    color: colors.text.secondary,
    fontSize: typography.sm,
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
    fontWeight: '700',
  },
});
