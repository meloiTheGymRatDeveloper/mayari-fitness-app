import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing } from '../../../constants/theme';
import { useActivePlan, useRecentSessions, useWorkoutSessionCount } from '../../../hooks/useWorkout';
import { useLatestTipByType } from '../../../hooks/useCoachTips';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { generateWorkoutPlan } from '../../../lib/workoutGenerator';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import type { DayPlan, WorkoutSession } from '../../../types/database';

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

export default function WorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: activePlan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useActivePlan();
  const { data: recentSessions = [] } = useRecentSessions(3);
  const { data: sessionCount = 0 } = useWorkoutSessionCount();
  const { startSession } = useWorkoutStore();
  const userId = useAuthStore(s => s.session?.user.id);
  const profile = useAuthStore(s => s.profile);
  const [starting, setStarting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const workoutTip = useLatestTipByType('workout');

  const todayPlan: DayPlan | null = activePlan
    ? (activePlan.plan_data.days[sessionCount % activePlan.plan_data.days.length] ?? null)
    : null;

  const handleStart = useCallback(async () => {
    if (!userId || !todayPlan || !activePlan) return;
    setStarting(true);
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          plan_id: activePlan.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Session create failed');
      startSession(data.id, activePlan.id, todayPlan);
      router.push('/(tabs)/workout/active');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not start workout');
    } finally {
      setStarting(false);
    }
  }, [userId, todayPlan, activePlan, startSession, router]);

  const handleGenerate = useCallback(async () => {
    if (!userId || !profile) return;
    setGenerating(true);
    try {
      await generateWorkoutPlan(supabase, userId, profile);
      await queryClient.invalidateQueries({ queryKey: ['workout_plan'] });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not generate plan');
    } finally {
      setGenerating(false);
    }
  }, [userId, profile, queryClient]);

  if (planLoading) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Skeleton width={280} height={28} style={{ marginBottom: spacing.lg }} />
        <Skeleton width={340} height={200} style={{ marginBottom: spacing.lg }} />
        <View style={styles.linksRow}>
          <Skeleton width={120} height={16} />
          <Skeleton width={120} height={16} />
        </View>
      </ScrollView>
    );
  }

  if (planError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetchPlan()}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.heading}>Workout</Text>

      {todayPlan ? (
        <View style={styles.planCard}>
          <Text style={styles.dayLabel}>{todayPlan.day_label}</Text>
          {todayPlan.exercises.map(ex => (
            <View key={ex.exercise_id} style={styles.exRow}>
              <Text style={styles.exName}>{ex.exercise_name}</Text>
              <Text style={styles.exMeta}>{ex.sets} × {ex.reps_low}–{ex.reps_high}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.btn, starting && styles.btnOff]}
            onPress={handleStart}
            disabled={starting}
          >
            <Text style={styles.btnText}>{starting ? 'Starting...' : 'Start Workout'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <EmptyState
          emoji="🏋️"
          title="Wala pang workout plan"
          subtitle="Let Coach Mayari generate one for you"
          ctaLabel="Generate Plan"
          onCta={() => router.push('/(tabs)/coach' as never)}
        />
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
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.lg },
  planCard: { backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  dayLabel: { color: colors.brand.secondary, fontSize: typography.xl, fontWeight: '700', marginBottom: spacing.md },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  exName: { color: colors.text.primary, fontSize: typography.base },
  exMeta: { color: colors.text.muted, fontSize: typography.sm },
  btn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
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
});
