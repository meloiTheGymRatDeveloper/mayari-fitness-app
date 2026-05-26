// app/(tabs)/coach/index.tsx
import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import {
  useCoachTips, useMarkAllTipsRead, useRequestTip,
} from '../../../hooks/useCoachTips';
import type { CoachTip } from '../../../types/database';
import Skeleton from '../../../components/ui/Skeleton';

// ── Icon mapping ──────────────────────────────────────────────────────────────
const TIP_ICONS: Record<string, string> = {
  nutrition: '🥗',
  workout: '💪',
  streak: '🔥',
  pr: '🏆',
  general: '🌙',
};

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}

// ── TipCard ───────────────────────────────────────────────────────────────────
function TipCard({ tip }: { tip: CoachTip }) {
  return (
    <View style={styles.tipCard}>
      <Text style={styles.tipIcon}>{TIP_ICONS[tip.tip_type] ?? '🌙'}</Text>
      <View style={styles.tipBody}>
        <Text style={styles.tipContent}>{tip.content}</Text>
        <Text style={styles.tipTime}>{relativeTime(tip.created_at)}</Text>
      </View>
    </View>
  );
}

// ── CoachScreen ───────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const router = useRouter();
  const { data: tips = [], isLoading } = useCoachTips();
  const markRead = useMarkAllTipsRead();
  const requestTip = useRequestTip();

  useEffect(() => {
    markRead.mutate();
    requestTip.mutate();
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.header}>Mayari Tips</Text>

      <TouchableOpacity
        style={styles.planBtn}
        onPress={() => router.push('/(tabs)/coach/browse' as never)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.planBtnTitle}>Get a Workout Plan</Text>
          <Text style={styles.planBtnSub}>Browse science-based plans or generate with AI</Text>
        </View>
        <Text style={styles.planBtnIcon}>💪</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.skeletons}>
          <Skeleton width="100%" height={80} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={80} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={80} />
        </View>
      ) : tips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Wala pang tips. Mag-log ng workout o pagkain para makakuha ng tips mula kay Mayari! 🌙
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tips.map(tip => <TipCard key={tip.id} tip={tip} />)}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.lg },
  header: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  skeletons: { gap: 8 },
  list: { gap: 8, paddingBottom: spacing['2xl'] },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    lineHeight: 24,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
  },
  tipIcon: { fontSize: 28 },
  tipBody: { flex: 1 },
  tipContent: {
    color: colors.text.primary,
    fontSize: typography.base,
    lineHeight: 22,
    marginBottom: 4,
  },
  tipTime: { color: colors.text.muted, fontSize: typography.sm },
  planBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  planBtnTitle: { color: colors.white, fontSize: typography.base, fontWeight: '700', marginBottom: 2 },
  planBtnSub: { color: colors.white + '99', fontSize: typography.xs },
  planBtnIcon: { fontSize: typography.xl, marginLeft: spacing.sm },
});
