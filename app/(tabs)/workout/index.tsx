import { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import { useAllPlans, useRecentSessions } from '../../../hooks/useWorkout';
import { useLatestTipByType } from '../../../hooks/useCoachTips';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { deleteWorkoutPlan } from '../../../lib/workoutGenerator';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import type { WorkoutPlan, WorkoutSession } from '../../../types/database';

const PLAN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PLAN_BADGE_COLORS = [
  colors.brand.primary,    // A = indigo
  colors.brand.secondary,  // B = violet
  '#2DD4BF',               // C = teal
];
function planBadgeColor(idx: number): string {
  return PLAN_BADGE_COLORS[idx % PLAN_BADGE_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSplitShortLabel(splitType: string): string {
  const map: Record<string, string> = {
    full_body: 'Full Body',
    upper_lower: 'Upper/Lower',
    ppl: 'Push/Pull/Legs',
    algorithm: 'Pre-built Plan',
    custom: 'Custom Plan',
  };
  return map[splitType] ?? splitType;
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  return `${mins}m`;
}

function SessionCard({ session, onPress }: { session: WorkoutSession; onPress?: () => void }) {
  const dateStr = new Date(session.started_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric',
  });
  const content = (
    <>
      <View>
        <Text style={styles.sessionDate}>{dateStr}</Text>
        <Text style={styles.sessionVol}>{session.total_volume_kg} kg lifted</Text>
      </View>
      <View style={styles.sessionRight}>
        {session.ended_at && (
          <Text style={styles.sessionDur}>{formatDuration(session.started_at, session.ended_at)}</Text>
        )}
        <Text style={styles.sessionXp}>+{session.xp_earned} XP</Text>
        {onPress && <Text style={styles.sessionChevron}>›</Text>}
      </View>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.sessionCard} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.sessionCard}>{content}</View>;
}

function PlanCard({
  plan,
  letter,
  idx,
  onPress,
  onLongPress,
}: {
  plan: WorkoutPlan;
  letter: string;
  idx: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const badgeColor = planBadgeColor(idx);
  return (
    <TouchableOpacity
      style={styles.planCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[styles.planLetterBadge, { borderColor: badgeColor, backgroundColor: badgeColor + '25' }]}>
        <Text style={[styles.planLetter, { color: badgeColor }]}>{letter}</Text>
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>Workout {letter}</Text>
        <Text style={[styles.planMeta, { color: colors.brand.gold }]}>
          {getSplitShortLabel(plan.split_type)}
        </Text>
        <Text style={styles.planDate}>{plan.plan_data.days.length} days · Generated {formatDate(plan.created_at)}</Text>
      </View>
      <Text style={styles.planChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function WorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading: plansLoading, isError: plansError, refetch } = useAllPlans();
  const { data: recentSessions = [] } = useRecentSessions(3);
  const userId = useAuthStore(s => s.session?.user.id);
  const workoutTip = useLatestTipByType('workout');

  const handleDelete = useCallback((plan: WorkoutPlan, letter: string) => {
    Alert.alert(
      `Delete Workout ${letter}?`,
      `This will permanently remove the ${getSplitShortLabel(plan.split_type)} plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await deleteWorkoutPlan(supabase, userId, plan.id);
              await queryClient.invalidateQueries({ queryKey: ['workout_plans'] });
              await queryClient.invalidateQueries({ queryKey: ['workout_plan'] });
            } catch {
              Alert.alert('Error', 'Could not delete plan.');
            }
          },
        },
      ]
    );
  }, [userId, queryClient]);

  if (plansLoading) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Skeleton width={280} height={28} style={{ marginBottom: spacing.lg }} />
        <Skeleton width='100%' height={90} style={{ marginBottom: spacing.sm }} />
        <Skeleton width='100%' height={90} style={{ marginBottom: spacing.sm }} />
      </ScrollView>
    );
  }

  if (plansError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Workout</Text>
        {plans.length > 0 && (
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/coach/browse' as never)}
          >
            <Text style={styles.browseBtnText}>+ Browse Plans</Text>
          </TouchableOpacity>
        )}
      </View>

      {plans.length === 0 ? (
        <EmptyState
          emoji="🏋️"
          title="Wala pang workout plan"
          subtitle="Browse pre-built plans to get started"
          ctaLabel="Browse Plans"
          onCta={() => router.push('/(tabs)/coach/browse' as never)}
        />
      ) : (
        <View style={styles.planList}>
          {plans.map((plan, idx) => {
            const letter = PLAN_LETTERS[idx] ?? String(idx + 1);
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                letter={letter}
                idx={idx}
                onPress={() => router.push(`/(tabs)/workout/${plan.id}` as never)}
                onLongPress={() => handleDelete(plan, letter)}
              />
            );
          })}
        </View>
      )}

      <View style={styles.tilesRow}>
        {[
          { emoji: '🏆', label: 'Records', route: '/(tabs)/workout/records', color: colors.brand.accent },
          { emoji: '📚', label: 'Exercises', route: '/(tabs)/workout/exercise/index', color: colors.brand.secondary },
          { emoji: '📋', label: 'History', route: '/(tabs)/workout/history', color: '#2DD4BF' },
        ].map(({ emoji, label, route, color }) => (
          <TouchableOpacity
            key={label}
            style={[styles.tile, { backgroundColor: color + '18' }]}
            onPress={() => router.push(route as never)}
          >
            <Text style={styles.tileEmoji}>{emoji}</Text>
            <Text style={[styles.tileLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {recentSessions.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <Text style={labelStyle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/workout/history' as never)}>
              <Text style={styles.viewAllLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onPress={() => router.push(`/(tabs)/workout/session/${s.id}` as never)}
            />
          ))}
        </View>
      )}

      {workoutTip && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{workoutTip.content}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  browseBtn: {
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  browseBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '700', fontFamily: fonts.bold },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700' },
  planList: { marginBottom: spacing.lg, gap: spacing.sm },
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planLetterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  planLetter: { fontSize: typography.xl, fontWeight: '800' },
  planInfo: { flex: 1 },
  planName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  planMeta: { fontSize: typography.sm, marginTop: 2 },
  planDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  planChevron: { color: colors.text.muted, fontSize: typography.xl },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tile: {
    flex: 1,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  tileEmoji: { fontSize: 20 },
  tileLabel: { fontSize: typography.xs, fontWeight: '700', fontFamily: fonts.bold },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  viewAllLink: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  sessionCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  sessionDate: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sessionVol: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionDur: { color: colors.text.muted, fontSize: typography.xs },
  sessionXp: { color: colors.brand.gold, fontSize: typography.xs, fontWeight: '600', fontFamily: fonts.semibold },
  sessionChevron: { color: colors.text.muted, fontSize: typography.lg, lineHeight: typography.lg + 2 },
  errorText: { color: colors.text.secondary, fontSize: typography.base, marginBottom: spacing.md },
  retryBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  tipCard: {
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  tipText: { color: colors.brand.secondary, fontSize: typography.sm },
});
