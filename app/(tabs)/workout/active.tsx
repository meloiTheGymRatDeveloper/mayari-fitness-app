import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { supabase } from '../../../lib/supabase';
import SetLogger from '../../../components/workout/SetLogger';
import RestTimer from '../../../components/workout/RestTimer';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlannedExercise } from '../../../types/database';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { sessionId, todayPlan, sets, addSet, setRest, tickElapsed, endSession, elapsedSeconds } =
    useWorkoutStore();
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => tickElapsed(), 1000);
    return () => clearInterval(id);
  }, [tickElapsed]);

  useEffect(() => {
    if (!sessionId || !todayPlan) {
      router.replace('/(tabs)/workout');
    }
  }, [sessionId, todayPlan, router]);

  const totalVolume = sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

  const handleSetDone = useCallback(
    async (exercise: PlannedExercise, weight: number, reps: number) => {
      if (!sessionId) return;
      const setNum = (completedSets[exercise.exercise_id] ?? 0) + 1;

      const { error } = await supabase.from('workout_sets').insert({
        session_id: sessionId,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        set_number: setNum,
        weight_kg: weight,
        reps,
        is_warmup: false,
        completed_at: new Date().toISOString(),
      });

      if (error) { Alert.alert('Error saving set', error.message); return; }

      addSet({
        session_id: sessionId,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        set_number: setNum,
        weight_kg: weight,
        reps,
        is_warmup: false,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const prevBest = sets
        .filter(s => s.exercise_id === exercise.exercise_id)
        .reduce((max, s) => Math.max(max, s.weight_kg), 0);
      if (weight > prevBest) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('personal_records').upsert({
            user_id: user.id,
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
            weight_kg: weight,
            reps,
            achieved_at: new Date().toISOString(),
            muscle_group: exercise.muscle_group,
          }, { onConflict: 'user_id,exercise_id', ignoreDuplicates: false });
        }
      }

      setCompletedSets(prev => ({ ...prev, [exercise.exercise_id]: setNum }));
      setRest(exercise.rest_seconds);
    },
    [sessionId, completedSets, addSet, setRest, sets],
  );

  const handleFinish = useCallback(async () => {
    if (!sessionId) return;
    setFinishing(true);
    try {
      const totalVol = sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
      const xp = sets.length * 10;
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_volume_kg: Math.round(totalVol * 10) / 10,
          xp_earned: xp,
        })
        .eq('id', sessionId);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sid = sessionId;
      endSession();
      router.replace({ pathname: '/(tabs)/workout/summary', params: { sessionId: sid } });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not finish workout');
      setFinishing(false);
    }
  }, [sessionId, sets, endSession, router]);

  if (!todayPlan || !sessionId) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Elapsed</Text>
          <Text style={styles.headerValue}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerLabel}>Volume</Text>
          <Text style={styles.headerValue}>{Math.round(totalVolume)} kg</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {todayPlan.exercises.map(exercise => {
          const done = completedSets[exercise.exercise_id] ?? 0;
          const remaining = exercise.sets - done;
          return (
            <View key={exercise.exercise_id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                <Text style={styles.exerciseProgress}>
                  {done}/{exercise.sets} sets
                </Text>
              </View>
              {remaining > 0
                ? Array.from({ length: Math.min(remaining, 1) }, (_, i) => (
                    <SetLogger
                      key={done + i}
                      setNumber={done + i + 1}
                      defaultWeight={
                        sets.filter(s => s.exercise_id === exercise.exercise_id).slice(-1)[0]
                          ?.weight_kg ?? 0
                      }
                      onDone={(w, r) => handleSetDone(exercise, w, r)}
                    />
                  ))
                : <Text style={styles.allDone}>All sets complete ✓</Text>
              }
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, finishing && styles.finishBtnOff]}
          onPress={handleFinish}
          disabled={finishing}
        >
          {finishing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.finishBtnText}>Finish Workout</Text>
          }
        </TouchableOpacity>
      </View>

      <RestTimer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerValue: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: 100 },
  exerciseCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  exerciseName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700', flex: 1 },
  exerciseProgress: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  allDone: { color: colors.success, fontSize: typography.sm, paddingVertical: spacing.xs },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  finishBtn: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  finishBtnOff: { opacity: 0.5 },
  finishBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
