import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { useMyReferrals, calcReferralDiscount } from '../../../hooks/useReferrals';

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);
  const referralCode = profile?.referral_code ?? '--------';
  const { data: referrals } = useMyReferrals();

  const activeCount = (referrals ?? []).filter(r => r.status === 'active').length;
  const discountPesos = calcReferralDiscount(referrals);

  async function copyCode() {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard 📋');
  }

  async function shareLink() {
    await Share.share({
      message: `Subukan mo ang Mayari — ang best fitness app para sa Pilipino! Gamitin ang code ko: ${referralCode} para sa ₱20 off your first month 🌙`,
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
          <Text style={styles.heroTitle}>You both save! 🎁</Text>
          <Text style={styles.heroSub}>
            You get <Text style={styles.heroHighlight}>₱20 off</Text> every month while your friend stays active{'\n'}
            — and they get <Text style={styles.heroHighlight}>₱20 off</Text> their first month
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
            <Text style={[styles.statValue, styles.statValueAccent]}>₱{discountPesos}</Text>
            <Text style={styles.statLabel}>Off your bill</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₱20</Text>
            <Text style={styles.statLabel}>Friend's welcome gift</Text>
          </View>
        </View>

        {/* How it works note */}
        <View style={styles.betaNote}>
          <Text style={styles.betaNoteTitle}>ℹ️ How it works</Text>
          <Text style={styles.betaNoteBody}>
            You earn ₱20 off your monthly bill while at least one referred friend stays subscribed (max 1 discount per month, applied automatically every billing cycle). Your friend gets ₱20 off their first month when they sign up with your code.
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
  back: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.medium, width: 60 },
  title: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  content: { padding: spacing.lg, gap: spacing.md },
  heroCard: {
    backgroundColor: colors.bg.elevated, borderRadius: 14, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.brand.primary, alignItems: 'center', gap: spacing.xs,
  },
  heroEmoji: { fontSize: 36, marginBottom: spacing.xs },
  heroTitle: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold, textAlign: 'center' },
  heroSub: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 20 },
  heroHighlight: { color: colors.brand.gold, fontFamily: fonts.bold },
  codeCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  codeLabel: {
    ...labelStyle,
  },
  codeRow: { flexDirection: 'row', gap: spacing.sm },
  codeChip: {
    flex: 1, backgroundColor: colors.bg.elevated, borderRadius: 10,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  codeText: { color: colors.brand.gold, fontSize: typography['2xl'], fontFamily: fonts.extrabold, letterSpacing: 3 },
  copyBtn: {
    backgroundColor: colors.brand.gold, borderRadius: 10,
    paddingHorizontal: spacing.lg, justifyContent: 'center',
  },
  copyBtnText: { color: colors.bg.primary, fontSize: typography.sm, fontFamily: fonts.bold },
  shareBtn: {
    backgroundColor: colors.bg.elevated, borderRadius: 10, paddingVertical: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { color: colors.brand.secondary, fontSize: typography.sm, fontFamily: fonts.semibold },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statCardAccent: { borderColor: colors.warning },
  statValue: { color: colors.brand.gold, fontSize: typography['2xl'], fontFamily: fonts.extrabold },
  statValueAccent: { color: colors.warning },
  statLabel: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.regular, marginTop: 2, textAlign: 'center' },
  progressCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardLabel: {
    ...labelStyle,
  },
  progressTrack: {
    backgroundColor: colors.bg.elevated, borderRadius: 4, height: 8,
  },
  progressFill: {
    backgroundColor: colors.brand.primary, borderRadius: 4, height: 8,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelLeft: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.regular },
  progressLabelMid: { color: colors.warning, fontSize: 10, fontFamily: fonts.semibold },
  progressLabelRight: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.regular },
  betaNote: {
    backgroundColor: colors.bg.elevated, borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  betaNoteTitle: { color: colors.brand.gold, fontSize: typography.xs, fontFamily: fonts.bold },
  betaNoteBody: { color: colors.text.secondary, fontSize: typography.xs, fontFamily: fonts.regular, lineHeight: 18 },
});
