import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { useMyReferrals, calcReferralDiscount } from '../../../hooks/useReferrals';

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);
  const referralCode = profile?.referral_code ?? '--------';
  const { data: referrals } = useMyReferrals();

  const activeCount = (referrals ?? []).filter(r => r.status === 'active').length;
  const discountPct = calcReferralDiscount(referrals);
  const untilMax = Math.max(0, 5 - activeCount);
  const progressWidth = `${Math.round((discountPct / 50) * 100)}%` as `${number}%`;

  async function copyCode() {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard 📋');
  }

  async function shareLink() {
    await Share.share({
      message: `Subukan mo ang Mayari — ang best fitness app para sa Pilipino! Gamitin ang code ko: ${referralCode} para sa discounted subscription 🌙`,
    });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Referrals</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>Refer friends, earn discounts</Text>
          <Text style={styles.heroSub}>
            Each friend who signs up gives you{'\n'}
            <Text style={styles.heroHighlight}>10% off</Text> when beta ends · max 50%
          </Text>
        </View>

        {/* Referral code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <View style={styles.codeRow}>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={shareLink}>
            <Text style={styles.shareBtnText}>📤 Share Link</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Friends referred</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, styles.statValueAccent]}>{discountPct}%</Text>
            <Text style={styles.statLabel}>Discount earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{untilMax}</Text>
            <Text style={styles.statLabel}>Until max</Text>
          </View>
        </View>

        {/* Progress to max */}
        <View style={styles.progressCard}>
          <Text style={styles.cardLabel}>PROGRESS TO 50% MAX DISCOUNT</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelLeft}>0%</Text>
            <Text style={styles.progressLabelMid}>{discountPct}% · {activeCount} referral{activeCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.progressLabelRight}>50%</Text>
          </View>
        </View>

        {/* Beta note */}
        <View style={styles.betaNote}>
          <Text style={styles.betaNoteTitle}>⏳ Activates when beta ends</Text>
          <Text style={styles.betaNoteBody}>
            Your {discountPct > 0 ? `${discountPct}%` : ''} discount is locked in. It applies automatically when Mayari moves to ₱50/month.
          </Text>
        </View>

      </ScrollView>
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
  heroCard: {
    backgroundColor: colors.bg.elevated, borderRadius: 14, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.brand.primary, alignItems: 'center', gap: spacing.xs,
  },
  heroEmoji: { fontSize: 36, marginBottom: spacing.xs },
  heroTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700', textAlign: 'center' },
  heroSub: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
  heroHighlight: { color: colors.brand.secondary, fontWeight: '700' },
  codeCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  codeLabel: {
    color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', letterSpacing: 1,
  },
  codeRow: { flexDirection: 'row', gap: spacing.sm },
  codeChip: {
    flex: 1, backgroundColor: colors.bg.elevated, borderRadius: 10,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  codeText: { color: colors.brand.primary, fontSize: typography['2xl'], fontWeight: '800', letterSpacing: 3 },
  copyBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 10,
    paddingHorizontal: spacing.lg, justifyContent: 'center',
  },
  copyBtnText: { color: colors.white, fontSize: typography.sm, fontWeight: '700' },
  shareBtn: {
    backgroundColor: colors.bg.elevated, borderRadius: 10, paddingVertical: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statCardAccent: { borderColor: colors.warning },
  statValue: { color: colors.brand.primary, fontSize: typography['2xl'], fontWeight: '800' },
  statValueAccent: { color: colors.warning },
  statLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  progressCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardLabel: {
    color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', letterSpacing: 1,
  },
  progressTrack: {
    backgroundColor: colors.bg.elevated, borderRadius: 4, height: 8,
  },
  progressFill: {
    backgroundColor: colors.brand.primary, borderRadius: 4, height: 8,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelLeft: { color: colors.text.muted, fontSize: 10 },
  progressLabelMid: { color: colors.warning, fontSize: 10, fontWeight: '600' },
  progressLabelRight: { color: colors.text.muted, fontSize: 10 },
  betaNote: {
    backgroundColor: colors.bg.elevated, borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.warning, gap: spacing.xs,
  },
  betaNoteTitle: { color: colors.warning, fontSize: typography.xs, fontWeight: '700' },
  betaNoteBody: { color: colors.text.secondary, fontSize: typography.xs, lineHeight: 18 },
});
