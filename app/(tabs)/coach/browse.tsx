// app/(tabs)/coach/browse.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { getAlgorithmPlan } from '../../../constants/algorithmPlans';
import { colors, typography, spacing } from '../../../constants/theme';

const DURATIONS = [30, 45, 60, 75, 90];
const DAY_COLORS = ['#F59E0B', '#22C55E', '#6366F1', '#A78BFA', '#F472B6', '#34D399'];

export default function BrowsePlansScreen() {
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);

  const frequency = Math.min(Math.max(profile?.workout_days?.length ?? 3, 2), 6);
  const rawDuration = profile?.session_duration_min ?? 60;
  const [selectedDuration, setSelectedDuration] = useState(
    DURATIONS.includes(rawDuration) ? rawDuration : 60,
  );

  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const plan = getAlgorithmPlan(frequency, selectedDuration);

  function handleSelectPlan() {
    router.push({
      pathname: '/(tabs)/coach/plan',
      params: { plan: JSON.stringify(plan), source: 'algorithm' },
    });
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Suggested Plans</Text>
      </View>

      {/* AI card */}
      <TouchableOpacity
        style={styles.aiCard}
        onPress={() => router.push('/(tabs)/coach/generate')}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.aiLabel}>AI-Powered</Text>
          <Text style={styles.aiTitle}>Generate a Custom Plan with AI</Text>
          <Text style={styles.aiSub}>Coach Mayari builds a plan just for you</Text>
        </View>
        <Text style={styles.aiIcon}>✦</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or pick from the list below</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Frequency info */}
      <View style={styles.freqRow}>
        <Text style={styles.freqEmoji}>📅</Text>
        <Text style={styles.freqText}>
          Based on your{' '}
          <Text style={styles.freqBold}>{frequency}x / week</Text>
          {' '}schedule
        </Text>
      </View>

      {/* Duration chips */}
      <Text style={styles.sectionLabel}>Session Duration</Text>
      <View style={styles.chipsRow}>
        {DURATIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, selectedDuration === d && styles.chipActive]}
            onPress={() => setSelectedDuration(d)}
          >
            <Text style={[styles.chipText, selectedDuration === d && styles.chipTextActive]}>
              {d} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plan section label */}
      <Text style={styles.planLabel}>
        {frequency}x / Week · {selectedDuration} Minutes
      </Text>

      {/* Day cards — tapping any card selects the full plan (all days), not just the individual day */}
      {plan.days.map((day, i) => {
        const exNames = day.exercises.map(e => e.exercise_name).join(' · ');
        const truncated = exNames.length > 60 ? exNames.slice(0, 57) + '...' : exNames;
        return (
          <TouchableOpacity key={day.day_label} style={styles.dayCard} onPress={handleSelectPlan}>
            <View style={styles.dayCardInner}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayBadge, { color: DAY_COLORS[i % DAY_COLORS.length] }]}>
                  Day {i + 1}
                </Text>
                <Text style={styles.dayTitle}>{day.day_label}</Text>
                <Text style={styles.dayExercises}>{truncated}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>{day.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>~{selectedDuration} min</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  back: { color: colors.brand.primary, fontSize: typography.sm },
  heading: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  aiCard: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 10,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  aiLabel: {
    color: colors.brand.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  aiTitle: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600', marginBottom: 2 },
  aiSub: { color: colors.text.muted, fontSize: typography.xs },
  aiIcon: { color: colors.brand.primary, fontSize: typography.xl, marginLeft: spacing.sm },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.text.muted, fontSize: typography.xs },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  freqEmoji: { fontSize: typography.sm },
  freqText: { color: colors.text.secondary, fontSize: typography.sm },
  freqBold: { color: colors.text.primary, fontWeight: '600' },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { color: colors.text.secondary, fontSize: typography.sm },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  planLabel: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  dayCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayCardInner: { flexDirection: 'row', alignItems: 'flex-start' },
  dayBadge: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  dayTitle: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayExercises: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    marginBottom: spacing.sm,
  },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaBadge: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  metaText: { color: colors.brand.secondary, fontSize: typography.xs },
  chevron: { color: colors.text.muted, fontSize: 18, marginLeft: spacing.sm },
});
