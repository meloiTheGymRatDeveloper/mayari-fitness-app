import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '../../../../stores/workoutStore';
import { useAuthStore } from '../../../../stores/authStore';
import { supabase } from '../../../../lib/supabase';
import SetLogger from '../../../../components/workout/SetLogger';
import RestTimer from '../../../../components/workout/RestTimer';
import { colors, typography, spacing, fonts } from '../../../../constants/theme';
import type { PlannedExercise } from '../../../../types/database';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { sessionId, todayPlan, sets, addSet, setRest, tickElapsed, endSession, elapsedSeconds } =
    useWorkoutStore();
  const { profile } = useAuthStore();
  const userId = useAuthStore(s => s.session?.user.id);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [finishing, setFinishing] = useState(false);
  // null = loading, {} = loaded (possibly no prev data)
  const [prevSetMap, setPrevSetMap] = useState<Record<string, { weight_kg: number; reps: number }> | null>(null);
  const [formExerciseId, setFormExerciseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    gifUrl: string | null;
    instructions: string[] | null;
    bodyPart: string | null;
    target: string | null;
    equipment: string | null;
    difficulty: string | null;
  } | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => tickElapsed(), 1000);
    return () => clearInterval(id);
  }, [tickElapsed]);

  useEffect(() => {
    if (!sessionId || !todayPlan) {
      router.replace('/(tabs)/workout/gym');
    }
  }, [sessionId, todayPlan, router]);

  useEffect(() => {
    if (!sessionId || !todayPlan || !userId) return;
    const exerciseIds = todayPlan.exercises.map(e => e.exercise_id);

    async function loadPrevSets() {
      const { data: recentSessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId!)
        .not('ended_at', 'is', null)
        .neq('id', sessionId!)
        .order('ended_at', { ascending: false })
        .limit(10);

      const recentIds = (recentSessions ?? []).map((s: { id: string }) => s.id);
      if (recentIds.length === 0) { setPrevSetMap({}); return; }

      const { data: prevSets } = await supabase
        .from('workout_sets')
        .select('exercise_id, weight_kg, reps, completed_at')
        .in('session_id', recentIds)
        .in('exercise_id', exerciseIds)
        .order('completed_at', { ascending: false });

      const map: Record<string, { weight_kg: number; reps: number }> = {};
      for (const s of (prevSets ?? []) as { exercise_id: string; weight_kg: number; reps: number }[]) {
        if (!map[s.exercise_id]) {
          map[s.exercise_id] = { weight_kg: s.weight_kg, reps: s.reps };
        }
      }
      setPrevSetMap(map);
    }

    loadPrevSets();
  }, [sessionId, todayPlan, userId]);

  const totalVolume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * s.reps, 0);

  async function showForm(exerciseId: string, exerciseName: string) {
    setFormExerciseId(exerciseId);
    setFormLoading(true);
    setFormData(null);
    setInstructionsOpen(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('exercise-form', {
        body: { exerciseId, exerciseName },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (res.error) throw res.error;
      setFormData(res.data ?? null);
    } catch (e) {
      console.error('exercise-form error:', e);
      setFormData(null);
    } finally {
      setFormLoading(false);
    }
  }

  const handleSetDone = useCallback(
    async (exercise: PlannedExercise, weight: number | null, reps: number) => {
      if (!sessionId) return;
      const setNum = (completedSets[exercise.exercise_id] ?? 0) + 1;

      const { error } = await supabase.from('workout_sets').insert({
        session_id: sessionId,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        set_number: setNum,
        weight_kg: weight ?? 0,
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
        weight_kg: weight ?? 0,
        reps,
        is_warmup: false,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const prevBest = sets
        .filter(s => s.exercise_id === exercise.exercise_id)
        .reduce((max, s) => Math.max(max, s.weight_kg ?? 0), 0);
      if ((weight ?? 0) > prevBest) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('personal_records').upsert({
            user_id: user.id,
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
            weight_kg: weight ?? 0,
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
      // MET-based calorie burn calculation
      const MET_STRENGTH = 3.5;
      const MET_BODYWEIGHT = 4.0;
      const met = profile?.equipment_type === 'bodyweight' ? MET_BODYWEIGHT : MET_STRENGTH;
      const weightKg = profile?.body_weight_kg ?? 70;
      const durationHours = elapsedSeconds / 3600;
      const caloriesBurned = Math.round(met * weightKg * durationHours);

      const totalVol = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * s.reps, 0);
      const xp = sets.length * 10;
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_volume_kg: Math.round(totalVol * 10) / 10,
          xp_earned: xp,
          calories_burned: caloriesBurned,
        })
        .eq('id', sessionId);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sid = sessionId;
      endSession();
      router.replace({
        pathname: '/(tabs)/workout/gym/summary',
        params: { sessionId: sid, caloriesBurned: String(caloriesBurned) },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : (e as { message?: string })?.message ?? 'Could not finish workout';
      Alert.alert('Error', msg);
      setFinishing(false);
    }
  }, [sessionId, sets, elapsedSeconds, profile, endSession, router]);

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
              <TouchableOpacity onPress={() => showForm(exercise.exercise_id, exercise.exercise_name)} style={styles.gifBtn}>
                <Text style={styles.gifBtnText}>🎬 Form</Text>
              </TouchableOpacity>
              {remaining > 0
                ? Array.from({ length: Math.min(remaining, 1) }, (_, i) => {
                    const currentWeight = sets
                      .filter(s => s.exercise_id === exercise.exercise_id)
                      .slice(-1)[0]?.weight_kg;
                    const prev = prevSetMap?.[exercise.exercise_id];
                    return (
                      <SetLogger
                        key={`${exercise.exercise_id}-${done + i}-${prevSetMap !== null}`}
                        setNumber={done + i + 1}
                        defaultWeight={currentWeight ?? prev?.weight_kg ?? 0}
                        defaultReps={currentWeight == null ? prev?.reps : undefined}
                        onDone={(w, r) => handleSetDone(exercise, w, r)}
                      />
                    );
                  })
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

      <Modal
        visible={formExerciseId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { setFormExerciseId(null); setFormData(null); }}
      >
        <View style={styles.gifModalOverlay}>
          <ScrollView style={styles.gifModalScroll} contentContainerStyle={styles.gifModalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.gifModalTitle}>Form Guide</Text>

            {formLoading && (
              <ActivityIndicator size="large" color={colors.brand.primary} style={styles.formSpinner} />
            )}

            {!formLoading && formData?.gifUrl && (
              <Image source={formData.gifUrl} style={styles.gifImage} contentFit="contain" />
            )}

            {!formLoading && !formData?.gifUrl && (
              <Text style={styles.gifPlaceholder}>Form guide coming soon 🌙</Text>
            )}

            {!formLoading && formData && (formData.target || formData.equipment || formData.difficulty) && (
              <View style={styles.metaRow}>
                {formData.target && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>💪 {formData.target}</Text>
                  </View>
                )}
                {formData.equipment && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>🏋️ {formData.equipment}</Text>
                  </View>
                )}
                {formData.difficulty && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>⚡ {formData.difficulty}</Text>
                  </View>
                )}
              </View>
            )}

            {!formLoading && formData?.instructions && formData.instructions.length > 0 && (
              <View style={styles.instructionsContainer}>
                <TouchableOpacity
                  style={styles.instructionsToggle}
                  onPress={() => setInstructionsOpen(o => !o)}
                >
                  <Text style={styles.instructionsToggleText}>
                    {instructionsOpen ? '▼' : '▶'} Basahin ang instructions
                  </Text>
                </TouchableOpacity>
                {instructionsOpen && (
                  <View style={styles.instructionsList}>
                    {formData.instructions.map((step, i) => (
                      <View key={step.slice(0, 40)} style={styles.instructionRow}>
                        <View style={styles.instructionBullet}>
                          <Text style={styles.instructionBulletText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.instructionStep}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => { setFormExerciseId(null); setFormData(null); }}
              style={styles.gifCloseBtn}
            >
              <Text style={styles.gifCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  headerLabel: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerValue: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
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
  exerciseName: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.bold, flex: 1 },
  exerciseProgress: { color: colors.brand.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  allDone: { color: colors.success, fontSize: typography.sm, fontFamily: fonts.medium, paddingVertical: spacing.xs },
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
  finishBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
  gifBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.bg.elevated, borderRadius: 6, marginTop: spacing.xs, alignSelf: 'flex-start' },
  gifBtnText: { color: colors.brand.secondary, fontSize: typography.sm },
  gifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  gifModalScroll: { maxHeight: '90%', backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  gifModalContent: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  gifModalTitle: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold, marginBottom: spacing.md },
  formSpinner: { marginVertical: spacing.xl },
  gifImage: { width: '100%', height: 280, borderRadius: 8, marginBottom: spacing.md },
  gifPlaceholder: { color: colors.text.muted, fontSize: typography.base, textAlign: 'center', paddingVertical: spacing.xl },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  metaChip: {
    backgroundColor: colors.bg.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: { color: colors.text.secondary, fontSize: typography.xs, textTransform: 'capitalize' },
  instructionsContainer: { marginBottom: spacing.md },
  instructionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  instructionsToggleText: { color: colors.brand.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  instructionsList: { marginTop: spacing.sm },
  instructionRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.sm },
  instructionBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  instructionBulletText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },
  instructionStep: { color: colors.text.secondary, fontSize: typography.sm, flex: 1, lineHeight: 20 },
  gifCloseBtn: { marginTop: spacing.md, alignItems: 'center', padding: spacing.md },
  gifCloseBtnText: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.bold },
});
