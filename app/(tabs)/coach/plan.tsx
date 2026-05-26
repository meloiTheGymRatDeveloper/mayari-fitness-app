// app/(tabs)/coach/plan.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlanData, DayPlan } from '../../../types/database';

const DAY_COLORS = ['#F59E0B', '#22C55E', '#6366F1', '#A78BFA', '#F472B6', '#34D399'];

function parsePlan(raw: string): PlanData | null {
  try {
    return JSON.parse(raw) as PlanData;
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1]) as PlanData; } catch { /* fall through */ }
    }
    return null;
  }
}

function DayCard({
  day,
  index,
  onPress,
}: {
  day: DayPlan;
  index: number;
  onPress: () => void;
}) {
  const color = DAY_COLORS[index % DAY_COLORS.length];
  const muscleGroups = [...new Set(day.exercises.map(e => e.muscle_group))];
  return (
    <TouchableOpacity style={styles.dayCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.dayCardInner}>
        <View style={[styles.dayIndex, { borderColor: color }]}>
          <Text style={[styles.dayIndexText, { color }]}>{index + 1}</Text>
        </View>
        <View style={styles.dayInfo}>
          <Text style={styles.dayLabel}>{day.day_label}</Text>
          <View style={styles.dayMeta}>
            <Text style={styles.dayMetaText}>{day.exercises.length} exercises</Text>
            {muscleGroups.map(g => (
              <View key={g} style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const { plan: planRaw, source, planName, duration } = useLocalSearchParams<{
    plan: string;
    source?: string;
    planName?: string;
    duration?: string;
  }>();
  const userId = useAuthStore(s => s.session?.user.id);
  const [saving, setSaving] = useState(false);

  const planData = planRaw ? parsePlan(planRaw) : null;
  const title = planName ?? 'Plan Preview';

  const handleSave = async () => {
    if (!planData || !userId) return;
    setSaving(true);
    try {
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', userId);

      const { error } = await supabase.from('workout_plans').insert({
        user_id: userId,
        split_type: source === 'algorithm' ? 'algorithm' : 'custom',
        days_per_week: planData.days.length,
        plan_data: planData,
        is_active: true,
        generated_by: source === 'algorithm' ? 'algorithm' : 'claude',
      });
      if (error) throw error;

      router.replace('/(tabs)/workout' as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  function handleDayPress(day: DayPlan) {
    router.push({
      pathname: '/(tabs)/coach/plan-day',
      params: { day: JSON.stringify(day), duration: duration ?? '60' },
    });
  }

  if (!planData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load the plan.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sub}>
          {planData.days.length} days · ~{duration ?? '60'} min per session
        </Text>

        {planData.days.map((day, i) => (
          <DayCard
            key={day.day_label}
            day={day}
            index={i}
            onPress={() => handleDayPress(day)}
          />
        ))}

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnOff]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.btnText}>Save This Plan</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sub: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginBottom: spacing.lg,
  },
  dayCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndexText: { fontSize: typography.sm, fontWeight: '800' },
  dayInfo: { flex: 1 },
  dayLabel: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700', marginBottom: 4 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  dayMetaText: { color: colors.text.muted, fontSize: typography.xs },
  muscleTag: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  muscleTagText: { color: colors.brand.secondary, fontSize: 10, fontWeight: '600' },
  chevron: { color: colors.text.muted, fontSize: 20 },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: colors.white, fontSize: typography.base, fontWeight: '700' },
  errorText: {
    color: colors.error,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
