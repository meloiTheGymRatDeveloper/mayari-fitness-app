import { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, typography, spacing, fonts } from '../../../../constants/theme';
import { useWorkoutStore } from '../../../../stores/workoutStore';
import { useAuthStore } from '../../../../stores/authStore';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';
import { supabase } from '../../../../lib/supabase';
import SetLogger from '../../../../components/workout/SetLogger';
import type { PlannedExercise, WorkoutPlan } from '../../../../types/database';

const HOME_GREEN = colors.success;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function isBodyweightExercise(exerciseId: string, exerciseName: string): boolean {
  const name = exerciseName.toLowerCase();
  return (
    exerciseId.includes('bodyweight') ||
    name.includes('push-up') ||
    name.includes('push up') ||
    name.includes('pull-up') ||
    name.includes('pull up') ||
    name.includes('squat') ||
    name.includes('plank') ||
    name.includes('dip') ||
    name.includes('burpee') ||
    name.includes('mountain climber') ||
    name.includes('lunge')
  );
}

export default function HomeActiveSession() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId, dayIdx } = useLocalSearchParams<{ planId: string; dayIdx: string }>();
  const { canUse } = useFeatureAccess();

  const {
    sessionId, sets, isResting, restSecondsLeft, elapsedSeconds,
    circuitMode, circuitRound,
    startSession, addSet, setRest, skipRest, tickRest, tickElapsed,
    setCircuitMode, nextCircuitRound, endSession,
  } = useWorkoutStore();

  const userId = useAuthStore(s => s.session?.user.id);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: plan } = useQuery({
    queryKey: ['workout_plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .single();
      if (error) throw error;
      return data as WorkoutPlan;
    },
    enabled: !!planId,
  });

  const dayIndex = parseInt(dayIdx ?? '0', 10);
  const todayExercises: PlannedExercise[] =
    plan?.plan_data?.days?.[dayIndex]?.exercises ?? [];

  // Start session on mount
  useEffect(() => {
    if (!plan || !userId || sessionId) return;
    supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        plan_id: planId,
        started_at: new Date().toISOString(),
        workout_type: 'home',
        circuit_mode: false,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data) {
          startSession(data.id, planId, plan.plan_data.days[dayIndex]);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, userId]);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => tickElapsed(), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tickElapsed]);

  // Rest timer
  useEffect(() => {
    if (isResting) {
      restTimerRef.current = setInterval(() => tickRest(), 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, tickRest]);

  const handleSetDone = useCallback(
    (exercise: PlannedExercise, setNum: number, weight: number | null, reps: number) => {
      if (!sessionId) return;
      const newSet = {
        session_id: sessionId,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        set_number: setNum,
        weight_kg: weight,
        reps,
        is_warmup: false,
      };
      addSet(newSet);
      supabase
        .from('workout_sets')
        .insert({ ...newSet, completed_at: new Date().toISOString() });

      // In circuit mode, don't rest between sets — only between rounds
      if (!circuitMode) {
        setRest(exercise.rest_seconds);
      }
    },
    [sessionId, circuitMode, addSet, setRest],
  );

  const handleFinishRound = useCallback(() => {
    nextCircuitRound();
    setRest(90); // 90s rest between rounds
  }, [nextCircuitRound, setRest]);

  const handleFinish = useCallback(async () => {
    if (!sessionId) return;
    const totalVolume = sets.reduce(
      (sum, s) => sum + ((s.weight_kg ?? 0) * s.reps),
      0,
    );
    await supabase
      .from('workout_sessions')
      .update({
        ended_at: new Date().toISOString(),
        total_volume_kg: totalVolume,
      })
      .eq('id', sessionId);
    endSession();
    if (timerRef.current) clearInterval(timerRef.current);
    router.replace('/(tabs)/workout/home/summary' as never);
  }, [sessionId, sets, endSession, router]);

  const confirmFinish = useCallback(() => {
    Alert.alert(
      'Finish Workout?',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Finish', style: 'destructive', onPress: handleFinish },
      ],
    );
  }, [handleFinish]);

  const handleCircuitToggle = useCallback(async (enabled: boolean) => {
    if (!canUse('circuitMode')) {
      Alert.alert(
        'Pro Feature',
        'Circuit mode is available on Pro. Upgrade to unlock it.',
        [{ text: 'OK' }],
      );
      return;
    }
    setCircuitMode(enabled);
    if (sessionId) {
      await supabase
        .from('workout_sessions')
        .update({ circuit_mode: enabled })
        .eq('id', sessionId);
    }
  }, [sessionId, setCircuitMode, canUse]);

  const setsForExercise = useCallback(
    (exerciseId: string) => sets.filter(s => s.exercise_id === exerciseId),
    [sets],
  );

  const isPro = canUse('circuitMode');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.timerLabel}>Elapsed</Text>
          <Text style={[styles.timer, { color: HOME_GREEN }]}>{formatTime(elapsedSeconds)}</Text>
        </View>
        {circuitMode && (
          <View style={styles.roundBadge}>
            <Text style={styles.roundText}>Round {circuitRound}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.finishBtn} onPress={confirmFinish}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest overlay */}
      {isResting && (
        <View style={styles.restOverlay}>
          <Text style={styles.restTitle}>
            {circuitMode ? 'Rest between rounds' : 'Rest'}
          </Text>
          <Text style={styles.restTimer}>{restSecondsLeft}s</Text>
          <TouchableOpacity style={styles.skipBtn} onPress={skipRest}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Circuit mode toggle */}
        <View style={styles.circuitRow}>
          <Text style={styles.circuitLabel}>Circuit mode</Text>
          {isPro ? (
            <TouchableOpacity
              style={[styles.toggle, circuitMode && styles.toggleOn]}
              onPress={() => handleCircuitToggle(!circuitMode)}
            >
              <Text style={styles.toggleText}>{circuitMode ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.proTag}
              onPress={() => handleCircuitToggle(true)}
            >
              <Text style={styles.proTagText}>Pro</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.circuitHint}>
          {circuitMode
            ? 'Rest fires after completing all exercises in a round'
            : 'Rest fires after each set'}
        </Text>

        {/* Exercise list */}
        {todayExercises.map((exercise) => {
          const doneSets = setsForExercise(exercise.exercise_id);
          const bodyweight = isBodyweightExercise(
            exercise.exercise_id,
            exercise.exercise_name,
          );

          return (
            <View key={exercise.exercise_id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
              <Text style={styles.exerciseMeta}>
                {exercise.sets} × {exercise.reps_low}–{exercise.reps_high} reps
              </Text>
              {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNum => {
                const done = doneSets.find(s => s.set_number === setNum);
                if (done) {
                  return (
                    <View key={setNum} style={styles.doneSet}>
                      <Text style={styles.doneSetText}>
                        Set {setNum} — {bodyweight ? 'BW' : `${done.weight_kg} kg`} × {done.reps} reps ✓
                      </Text>
                    </View>
                  );
                }
                if (setNum !== doneSets.length + 1) return null;
                return (
                  <SetLogger
                    key={setNum}
                    setNumber={setNum}
                    isBodyweight={bodyweight}
                    defaultReps={exercise.reps_low}
                    onDone={(w, r) => handleSetDone(exercise, setNum, w, r)}
                  />
                );
              })}
            </View>
          );
        })}

        {/* Finish round button (circuit mode only) */}
        {circuitMode && !isResting && (
          <TouchableOpacity style={styles.finishRoundBtn} onPress={handleFinishRound}>
            <Text style={styles.finishRoundText}>
              Round {circuitRound} complete — Rest
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timerLabel: { color: colors.text.muted, fontSize: typography.xs },
  timer: { fontSize: typography['2xl'], fontFamily: fonts.bold },
  roundBadge: {
    backgroundColor: HOME_GREEN + '25',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: HOME_GREEN,
  },
  roundText: { color: HOME_GREEN, fontSize: typography.sm, fontFamily: fonts.bold },
  finishBtn: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  finishBtnText: { color: '#fff', fontSize: typography.sm, fontFamily: fonts.bold },
  restOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg.primary + 'E8',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  restTitle: { color: colors.text.secondary, fontSize: typography.base },
  restTimer: { color: HOME_GREEN, fontSize: 64, fontFamily: fonts.bold },
  skipBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  skipBtnText: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  content: { padding: spacing.lg },
  circuitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  circuitLabel: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },
  toggle: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: HOME_GREEN + '25', borderColor: HOME_GREEN },
  toggleText: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  circuitHint: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginBottom: spacing.md,
  },
  exerciseCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  exerciseMeta: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    marginBottom: spacing.sm,
  },
  doneSet: {
    backgroundColor: HOME_GREEN + '15',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: 4,
  },
  doneSetText: { color: colors.success, fontSize: typography.sm },
  finishRoundBtn: {
    backgroundColor: HOME_GREEN,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  finishRoundText: {
    color: '#fff',
    fontSize: typography.base,
    fontFamily: fonts.bold,
  },
  proTag: {
    backgroundColor: colors.brand.accent + '25',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.brand.accent,
  },
  proTagText: {
    color: colors.brand.accent,
    fontSize: typography.xs,
    fontFamily: fonts.bold,
  },
});
