import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../../../stores/authStore';
import { supabase } from '../../../../../lib/supabase';
import { colors, typography, spacing, fonts } from '../../../../../constants/theme';
import type { WorkoutPlan, DayPlan } from '../../../../../types/database';

function getPlanLetter(plans: WorkoutPlan[], planId: string): string {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const idx = plans.findIndex(p => p.id === planId);
  return idx >= 0 ? (LETTERS[idx] ?? String(idx + 1)) : 'A';
}

export default function PlanDayListScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const userId = useAuthStore(s => s.session?.user.id);

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [planLetter, setPlanLetter] = useState('A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId || !planId) return;
    setLoading(true);
    Promise.all([
      supabase.from('workout_plans').select('*').eq('id', planId).eq('user_id', userId).single(),
      supabase.from('workout_plans').select('id, created_at').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true }),
    ]).then(([planRes, allRes]) => {
      if (planRes.error || !planRes.data) { setError(true); setLoading(false); return; }
      setPlan(planRes.data as WorkoutPlan);
      if (allRes.data) {
        const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const idx = (allRes.data as { id: string }[]).findIndex(p => p.id === planId);
        setPlanLetter(idx >= 0 ? (LETTERS[idx] ?? String(idx + 1)) : 'A');
      }
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, [userId, planId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load plan</Text>
      </View>
    );
  }

  const SPLIT_LABELS: Record<string, string> = {
    full_body: 'Full Body',
    upper_lower: 'Upper/Lower',
    ppl: 'Push/Pull/Legs',
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.planMeta}>{SPLIT_LABELS[plan.split_type] ?? plan.split_type}</Text>
      <Text style={styles.heading}>Workout {planLetter}</Text>
      <Text style={styles.subheading}>Choose a session to do today</Text>

      <View style={styles.dayList}>
        {plan.plan_data.days.map((day: DayPlan, idx: number) => (
          <TouchableOpacity
            key={idx}
            style={styles.dayCard}
            onPress={() => router.push(`/(tabs)/workout/gym/${planId}/${idx}` as never)}
            activeOpacity={0.75}
          >
            <View style={styles.dayInfo}>
              <Text style={styles.dayLabel}>{day.day_label}</Text>
              <Text style={styles.dayMeta}>{day.exercises.length} exercises</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  planMeta: { color: colors.brand.secondary, fontSize: typography.sm, fontFamily: fonts.semibold, marginBottom: 4 },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold, marginBottom: 4 },
  subheading: { color: colors.text.muted, fontSize: typography.sm, fontFamily: fonts.regular, marginBottom: spacing.xl },
  dayList: { gap: spacing.sm },
  dayCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayInfo: { flex: 1 },
  dayLabel: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  dayMeta: { color: colors.text.muted, fontSize: typography.sm, fontFamily: fonts.regular, marginTop: 2 },
  chevron: { color: colors.text.muted, fontSize: 24 },
  errorText: { color: colors.text.secondary, fontSize: typography.base, fontFamily: fonts.regular },
});
