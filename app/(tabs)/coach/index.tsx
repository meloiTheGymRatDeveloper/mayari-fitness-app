// app/(tabs)/coach/index.tsx
import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'react-native-linear-gradient';
import { colors, typography, spacing, fonts } from '../../../constants/theme';
import {
  useCoachTips, useMarkAllTipsRead, useRequestTip,
} from '../../../hooks/useCoachTips';
import type { CoachTip } from '../../../types/database';
import Skeleton from '../../../components/ui/Skeleton';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import ProGate from '../../../components/ui/ProGate';

// ── Icon mapping ──────────────────────────────────────────────────────────────
const TIP_ICONS: Record<string, string> = {
  nutrition: '🥗',
  workout: '💪',
  streak: '🔥',
  pr: '🏆',
  general: '🌙',
  insight: '💡',
  risk: '⚠️',
  achievement: '⭐',
};

// ── Tip colour mapping ────────────────────────────────────────────────────────
const TIP_COLOR: Record<string, string> = {
  streak:      colors.brand.goldLight,
  pr:          colors.brand.accent,
  achievement: colors.brand.accent,
  workout:     colors.brand.secondary,
  nutrition:   colors.success,
  insight:     colors.brand.secondary,
  risk:        colors.error,
  general:     colors.brand.gold,
};
function tipColor(tipType: string): string {
  return TIP_COLOR[tipType] ?? colors.brand.gold;
}

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
  const color = tipColor(tip.tip_type);
  const typeLabel = tip.tip_type.toUpperCase();
  return (
    <View style={[styles.tipCard, { borderLeftColor: color }]}>
      <View style={styles.tipHeader}>
        <Text style={[styles.tipType, { color }]}>{typeLabel}</Text>
        <Text style={styles.tipDot}> · </Text>
        <Text style={styles.tipTime}>{relativeTime(tip.created_at)}</Text>
      </View>
      <View style={styles.tipBody}>
        <Text style={styles.tipIcon}>{TIP_ICONS[tip.tip_type] ?? '🌙'}</Text>
        <Text style={styles.tipContent}>{tip.content}</Text>
      </View>
    </View>
  );
}

// ── CoachScreen ───────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const { canUse } = useFeatureAccess();
  const insets = useSafeAreaInsets();
  const { data: tips = [], isLoading } = useCoachTips();
  const markRead = useMarkAllTipsRead();
  const requestTip = useRequestTip();

  const moonY = useSharedValue(0);
  useEffect(() => {
    moonY.value = withRepeat(withTiming(4, { duration: 2000 }), -1, true);
    markRead.mutate();
    requestTip.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const moonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moonY.value }],
  }));

  if (!canUse('coachTips')) {
    return (
      <ProGate
        title="Coach Mayari"
        description="Get personalised tips on workouts, nutrition, and streaks — powered by AI and tailored to your Filipino lifestyle."
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Animated.View style={[styles.moonOrb, moonAnimStyle]} pointerEvents="none">
        <LinearGradient
          colors={['#C4A55A', '#F5E680']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moonOrbInner}
        />
      </Animated.View>
      <Text style={styles.header}>Coach Mayari</Text>

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
  moonOrb: { position: 'absolute', top: 0, right: spacing.lg, zIndex: 10 },
  moonOrbInner: { width: 52, height: 52, borderRadius: 26, opacity: 0.35 },
  header: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
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
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipType: {
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tipDot: { color: colors.text.muted, fontSize: typography.xs },
  tipTime: { color: colors.text.muted, fontSize: typography.xs },
  tipBody: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tipIcon: { fontSize: 22 },
  tipContent: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.base,
    lineHeight: 22,
  },
});
