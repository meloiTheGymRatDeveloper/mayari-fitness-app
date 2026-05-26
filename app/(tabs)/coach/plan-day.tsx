// app/(tabs)/coach/plan-day.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import type { DayPlan } from '../../../types/database';

const MUSCLE_COLORS: Record<string, string> = {
  push: '#6366F1',
  pull: '#22C55E',
  legs: '#F59E0B',
  core: '#F472B6',
};

export default function PlanDayScreen() {
  const { day: dayRaw, duration } = useLocalSearchParams<{ day: string; duration?: string }>();

  let dayData: DayPlan | null = null;
  try {
    dayData = dayRaw ? JSON.parse(dayRaw) as DayPlan : null;
  } catch {
    dayData = null;
  }

  if (!dayData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load day data.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: dayData.day_label }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sub}>
          {dayData.exercises.length} exercises · ~{duration ?? '60'} min
        </Text>

        {dayData.exercises.map((ex, i) => {
          const color = MUSCLE_COLORS[ex.muscle_group] ?? colors.brand.secondary;
          return (
            <View key={i} style={styles.exCard}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{ex.exercise_name}</Text>
                <View style={[styles.muscleTag, { backgroundColor: color + '33' }]}>
                  <Text style={[styles.muscleText, { color }]}>{ex.muscle_group}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.sets}</Text>
                  <Text style={styles.statLabel}>sets</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.reps_low}–{ex.reps_high}</Text>
                  <Text style={styles.statLabel}>reps</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.rest_seconds}s</Text>
                  <Text style={styles.statLabel}>rest</Text>
                </View>
              </View>
            </View>
          );
        })}
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
  },
  sub: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginBottom: spacing.lg,
  },
  exCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exName: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  muscleTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleText: { fontSize: typography.xs, fontWeight: '700', textTransform: 'capitalize' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    padding: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  statLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  errorText: { color: colors.error, fontSize: typography.base },
});
