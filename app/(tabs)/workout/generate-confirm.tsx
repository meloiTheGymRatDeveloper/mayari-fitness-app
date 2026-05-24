import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import {
  buildWorkoutPlan,
  calcSetsPerSession,
  SPLIT_LABELS,
  getPreviousPlans,
  restoreWorkoutPlan,
} from '../../../lib/workoutGenerator';
import { fallbackExercises } from '../../../constants/exercises';
import { colors, typography, spacing } from '../../../constants/theme';
import type { WorkoutPlan, Exercise } from '../../../types/database';

const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const DURATION_OPTIONS = [30, 45, 60, 75, 90];

function getSplitType(daysPerWeek: number): string {
  if (daysPerWeek <= 3) return 'full_body';
  if (daysPerWeek === 4) return 'upper_lower';
  return 'ppl';
}

export default function GenerateConfirmScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore(s => s.profile);
  const userId = useAuthStore(s => s.session?.user.id);

  const defaultDays = Math.max(2, Math.min(6, profile?.workout_days?.length ?? 3));
  const defaultDuration = DURATION_OPTIONS.includes(profile?.session_duration_min ?? 0)
    ? (profile?.session_duration_min ?? 45)
    : 45;

  const [daysPerWeek, setDaysPerWeek] = useState(defaultDays);
  const [sessionMin, setSessionMin] = useState(defaultDuration);
  const [previousPlans, setPreviousPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(fallbackExercises);
  const [restoring, setRestoring] = useState(false);

  const splitType = getSplitType(daysPerWeek);
  const splitLabel = SPLIT_LABELS[splitType];
  const experienceLevel = profile?.experience_level ?? 'intermediate';
  const totalSets = calcSetsPerSession(sessionMin, experienceLevel);

  useEffect(() => {
    if (!userId) return;
    getPreviousPlans(supabase, userId).then(setPreviousPlans);

    // Fetch exercises from DB; fall back to hardcoded list if empty
    supabase
      .from('exercises')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) setExercises(data as Exercise[]);
      });
  }, [userId]);

  function handleGenerate() {
    if (!profile) return;
    const result = buildWorkoutPlan({
      daysPerWeek,
      sessionDurationMin: sessionMin,
      experienceLevel: profile.experience_level,
      equipmentType: profile.equipment_type,
      exercises,
    });
    router.push({
      pathname: '/(tabs)/workout/plan' as never,
      params: {
        planJson: JSON.stringify(result.planData),
        splitType: result.splitType,
        splitLabel: result.splitLabel,
        daysPerWeek: String(daysPerWeek),
      },
    });
  }

  async function handleRestore(planId: string) {
    if (!userId) return;
    setRestoring(true);
    try {
      await restoreWorkoutPlan(supabase, userId, planId);
      await queryClient.invalidateQueries({ queryKey: ['workout_plan'] });
      router.replace('/(tabs)/workout');
    } catch {
      Alert.alert('Error', 'Could not restore plan. Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const exercisesPerSession = Math.round(totalSets / 3);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Generate Your Plan</Text>

      {/* Days/week */}
      <Text style={styles.label}>Days per week</Text>
      <View style={styles.segmented}>
        {DAYS_OPTIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.segment, daysPerWeek === d && styles.segmentActive]}
            onPress={() => setDaysPerWeek(d)}
          >
            <Text style={[styles.segmentText, daysPerWeek === d && styles.segmentTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session duration */}
      <Text style={styles.label}>Session duration</Text>
      <View style={styles.segmented}>
        {DURATION_OPTIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.segment, sessionMin === d && styles.segmentActive]}
            onPress={() => setSessionMin(d)}
          >
            <Text style={[styles.segmentText, sessionMin === d && styles.segmentTextActive]}>{d}m</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plan info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoSplit}>{splitLabel}</Text>
        <Text style={styles.infoSets}>
          ~{exercisesPerSession} exercises × 3 sets = {totalSets} sets/session
        </Text>
        <Text style={styles.infoLevel}>
          Level: {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}
        </Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
        <Text style={styles.generateBtnText}>Generate Plan →</Text>
      </TouchableOpacity>

      {/* Previous plans */}
      {previousPlans.length > 0 && (
        <View style={styles.prevSection}>
          <Text style={styles.prevTitle}>Restore a previous plan</Text>
          {previousPlans.map(plan => (
            <View key={plan.id} style={styles.prevPlan}>
              <Text style={styles.prevPlanLabel}>Plan from {formatDate(plan.created_at)}</Text>
              <TouchableOpacity
                style={[styles.restoreBtn, restoring && styles.restoreBtnDisabled]}
                onPress={() => handleRestore(plan.id)}
                disabled={restoring}
              >
                {restoring
                  ? <ActivityIndicator size="small" color={colors.brand.primary} />
                  : <Text style={styles.restoreBtnText}>Restore</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  title: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.xl },
  label: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.md },
  segmented: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  segmentText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  infoCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  infoSplit: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  infoSets: { color: colors.brand.secondary, fontSize: typography.sm },
  infoLevel: { color: colors.text.muted, fontSize: typography.xs },
  generateBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  generateBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  prevSection: { marginTop: spacing.md },
  prevTitle: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '700', marginBottom: spacing.md },
  prevPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  prevPlanLabel: { color: colors.text.primary, fontSize: typography.sm },
  restoreBtn: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  restoreBtnDisabled: { opacity: 0.5 },
  restoreBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '700' },
});
