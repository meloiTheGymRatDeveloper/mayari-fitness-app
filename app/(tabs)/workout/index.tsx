import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing } from '../../../constants/theme';
import { useAllPlans, useRecentSessions } from '../../../hooks/useWorkout';
import { useLatestTipByType } from '../../../hooks/useCoachTips';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { deleteWorkoutPlan } from '../../../lib/workoutGenerator';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import type { WorkoutPlan, WorkoutSession } from '../../../types/database';

const PLAN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
  onPress,
  onDelete,
  deleting,
}: {
  plan: WorkoutPlan;
  letter: string;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <TouchableOpacity style={styles.planCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.planLetterBadge}>
        <Text style={styles.planLetter}>{letter}</Text>
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>Workout {letter}</Text>
        <Text style={styles.planMeta}>
          {getSplitShortLabel(plan.split_type)} · {plan.plan_data.days.length} days
        </Text>
        <Text style={styles.planDate}>Generated {formatDate(plan.created_at)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {deleting
          ? <ActivityIndicator size="small" color={colors.error} />
          : <Text style={styles.deleteBtnText}>🗑</Text>
        }
      </TouchableOpacity>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
            setDeletingId(plan.id);
            try {
              await deleteWorkoutPlan(supabase, userId, plan.id);
              await queryClient.invalidateQueries({ queryKey: ['workout_plans'] });
              await queryClient.invalidateQueries({ queryKey: ['workout_plan'] });
            } catch {
              Alert.alert('Error', 'Could not delete plan.');
            } finally {
              setDeletingId(null);
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
      </View>

      <TouchableOpacity
        style={styles.browseBtn}
        onPress={() => router.push('/(tabs)/coach/browse' as never)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.browseBtnTitle}>Browse Pre-built Plans</Text>
          <Text style={styles.browseBtnSub}>Science-based plans filtered to your schedule</Text>
        </View>
        <Text style={styles.browseBtnIcon}>💪</Text>
      </TouchableOpacity>

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
                onPress={() => router.push(`/(tabs)/workout/${plan.id}` as never)}
                onDelete={() => handleDelete(plan, letter)}
                deleting={deletingId === plan.id}
              />
            );
          })}
        </View>
      )}

      <View style={styles.linksRow}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/workout/records')}>
          <Text style={styles.link}>Personal Records</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/workout/exercise/index')}>
          <Text style={styles.link}>Exercise Library</Text>
        </TouchableOpacity>
      </View>

      {recentSessions.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/workout/history' as never)}>
              <Text style={styles.link}>View all →</Text>
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
    backgroundColor: colors.brand.primary + '25',
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planLetter: { color: colors.brand.primary, fontSize: typography.xl, fontWeight: '800' },
  planInfo: { flex: 1 },
  planName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  planMeta: { color: colors.brand.secondary, fontSize: typography.sm, marginTop: 2 },
  planDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 18 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  link: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  sessionDate: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sessionVol: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionDur: { color: colors.text.muted, fontSize: typography.xs },
  sessionXp: { color: colors.brand.accent, fontSize: typography.xs, fontWeight: '600' },
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
  browseBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  browseBtnTitle: { color: colors.white, fontSize: typography.base, fontWeight: '700', marginBottom: 2 },
  browseBtnSub: { color: colors.white + '99', fontSize: typography.xs },
  browseBtnIcon: { fontSize: typography.xl, marginLeft: spacing.sm },
});
