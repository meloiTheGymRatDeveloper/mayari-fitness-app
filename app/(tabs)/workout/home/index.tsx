import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useHomePlans } from '../../../../hooks/useWorkout';
import { useAuthStore } from '../../../../stores/authStore';
import { supabase } from '../../../../lib/supabase';
import { generateHomeWorkoutPlan } from '../../../../lib/homeWorkoutGenerator';
import { saveWorkoutPlan } from '../../../../lib/workoutGenerator';
import type { HomeEquipmentTier } from '../../../../types/database';
import Skeleton from '../../../../components/ui/Skeleton';
import EmptyState from '../../../../components/ui/EmptyState';

const TIER_OPTIONS: { value: HomeEquipmentTier; label: string; description: string }[] = [
  { value: 'bodyweight', label: 'Bodyweight Only', description: 'No equipment — push-ups, pull-ups, squats' },
  { value: 'minimal', label: 'Minimal Gear', description: 'Resistance band + single dumbbell' },
  { value: 'home_gym', label: 'Home Gym', description: 'Dumbbells, bench, pull-up bar' },
];

const HOME_GREEN = colors.success;

function TierPicker({
  current,
  onChange,
}: {
  current: HomeEquipmentTier;
  onChange: (tier: HomeEquipmentTier) => void;
}) {
  return (
    <View style={styles.tierCard}>
      <Text style={labelStyle}>Equipment Tier</Text>
      <View style={styles.tierOptions}>
        {TIER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.tierOption, current === opt.value && styles.tierOptionActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tierLabel, current === opt.value && styles.tierLabelActive]}>
              {opt.label}
            </Text>
            <Text style={styles.tierDesc}>{opt.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function HomeWorkoutHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore(s => s.profile);
  const userId = useAuthStore(s => s.session?.user.id);
  const { data: plans = [], isLoading } = useHomePlans();

  const equipmentTier: HomeEquipmentTier = (profile?.home_equipment_tier ?? 'bodyweight') as HomeEquipmentTier;
  const [generating, setGenerating] = useState(false);

  const handleTierChange = useCallback(async (tier: HomeEquipmentTier) => {
    if (!userId) return;
    await supabase.from('users').update({ home_equipment_tier: tier }).eq('id', userId);
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }, [userId, queryClient]);

  const handleGenerate = useCallback(async () => {
    if (!userId || !profile) return;
    setGenerating(true);
    try {
      const { data: dbExercises } = await supabase.from('exercises').select('*').order('name');
      const result = generateHomeWorkoutPlan({
        daysPerWeek: profile.workout_days.length || 3,
        sessionDurationMin: profile.session_duration_min || 45,
        experienceLevel: profile.experience_level,
        tier: equipmentTier,
        exercises: dbExercises?.length ? dbExercises : undefined,
      });
      const plan = await saveWorkoutPlan(supabase, userId, result, result.daysPerWeek);
      // Tag as home workout type
      await supabase.from('workout_plans').update({ workout_type: 'home' }).eq('id', plan.id);
      await queryClient.invalidateQueries({ queryKey: ['workout_plans', 'home', userId] });
    } catch (e) {
      Alert.alert('Error', 'Could not generate plan. Try again.');
    } finally {
      setGenerating(false);
    }
  }, [userId, profile, equipmentTier, queryClient]);

  if (isLoading) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Skeleton width={200} height={28} style={{ marginBottom: spacing.lg }} />
        <Skeleton width="100%" height={120} style={{ marginBottom: spacing.sm }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Home Workout</Text>
          <Text style={styles.sub}>No gym required</Text>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnOff]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Text style={styles.generateBtnText}>{generating ? 'Generating…' : '+ New Plan'}</Text>
        </TouchableOpacity>
      </View>

      <TierPicker current={equipmentTier} onChange={handleTierChange} />

      {plans.length === 0 ? (
        <EmptyState
          emoji="🏠"
          title="Wala pang home workout plan"
          subtitle="Generate a plan using your equipment tier above"
          ctaLabel="Generate Plan"
          onCta={handleGenerate}
        />
      ) : (
        <View style={styles.planList}>
          <Text style={labelStyle}>Your Plans</Text>
          {plans.map((plan, idx) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => router.push(`/(tabs)/workout/home/active?planId=${plan.id}&dayIdx=0` as never)}
              activeOpacity={0.75}
            >
              <View style={[styles.planBadge, { backgroundColor: HOME_GREEN + '25', borderColor: HOME_GREEN }]}>
                <Text style={[styles.planBadgeText, { color: HOME_GREEN }]}>{String.fromCharCode(65 + idx)}</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Home Workout {String.fromCharCode(65 + idx)}</Text>
                <Text style={styles.planMeta}>{plan.plan_data.days.length} days · {plan.split_type}</Text>
              </View>
              <Text style={[styles.chevron, { color: HOME_GREEN }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  sub: { color: colors.text.secondary, fontSize: typography.sm, marginTop: 2 },
  generateBtn: {
    backgroundColor: HOME_GREEN,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  generateBtnOff: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: typography.sm, fontFamily: fonts.bold },
  tierCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  tierOptions: { gap: spacing.xs },
  tierOption: {
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  tierOptionActive: {
    borderColor: HOME_GREEN,
    backgroundColor: HOME_GREEN + '18',
  },
  tierLabel: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.semibold },
  tierLabelActive: { color: HOME_GREEN },
  tierDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  planList: { gap: spacing.sm },
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeText: { fontSize: typography.lg, fontFamily: fonts.extrabold },
  planInfo: { flex: 1 },
  planName: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.bold },
  planMeta: { color: colors.text.secondary, fontSize: typography.sm, marginTop: 2 },
  chevron: { fontSize: typography.xl },
});
