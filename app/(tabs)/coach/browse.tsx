// app/(tabs)/coach/browse.tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../stores/authStore';
import { getAlgorithmPlan } from '../../../constants/algorithmPlans';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlanData } from '../../../types/database';

const DURATIONS = [30, 45, 60, 75, 90];

const PLAN_TYPES = [
  {
    frequency: 2,
    name: 'Full Body',
    tag: '2x / week',
    description: 'Train your whole body twice a week — great for beginners',
    color: '#22C55E',
  },
  {
    frequency: 3,
    name: 'Full Body',
    tag: '3x / week',
    description: 'Optimal full body training for strength & size',
    color: '#6366F1',
  },
  {
    frequency: 4,
    name: 'Upper / Lower',
    tag: '4x / week',
    description: 'Alternate upper and lower body days for balanced gains',
    color: '#F59E0B',
  },
  {
    frequency: 5,
    name: 'Push / Pull / Legs',
    tag: '5x / week',
    description: 'Classic PPL split with high muscle frequency',
    color: '#A78BFA',
  },
  {
    frequency: 6,
    name: 'Push / Pull / Legs',
    tag: '6x / week',
    description: 'Advanced 6-day PPL for experienced lifters',
    color: '#F472B6',
  },
];

export default function BrowsePlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore(s => s.profile);
  const profileFrequency = Math.min(Math.max(profile?.workout_days?.length ?? 3, 2), 6);

  const rawDuration = profile?.session_duration_min ?? 60;
  const [selectedDuration, setSelectedDuration] = useState(
    DURATIONS.includes(rawDuration) ? rawDuration : 60,
  );

  function handleSelectPlan(plan: PlanData, planName: string, frequency: number) {
    router.push({
      pathname: '/(tabs)/coach/plan',
      params: {
        plan: JSON.stringify(plan),
        source: 'algorithm',
        planName,
        frequency: String(frequency),
        duration: String(selectedDuration),
      },
    });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/workout' as never)}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Suggested Plans</Text>
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

      {/* Plan type cards */}
      <Text style={styles.sectionLabel}>Choose a Split</Text>
      {PLAN_TYPES.map(pt => {
        const plan = getAlgorithmPlan(pt.frequency, selectedDuration);
        const isRecommended = pt.frequency === profileFrequency;
        return (
          <TouchableOpacity
            key={pt.frequency}
            style={styles.planCard}
            onPress={() => handleSelectPlan(plan, `${pt.name} · ${pt.tag}`, pt.frequency)}
            activeOpacity={0.75}
          >
            <View style={[styles.planAccent, { backgroundColor: pt.color }]} />
            <View style={styles.planBody}>
              <View style={styles.planTopRow}>
                <Text style={styles.planName}>{pt.name}</Text>
                <View style={styles.planTagRow}>
                  {isRecommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>For You</Text>
                    </View>
                  )}
                  <Text style={[styles.planTag, { color: pt.color }]}>{pt.tag}</Text>
                </View>
              </View>
              <Text style={styles.planDesc}>{pt.description}</Text>
              <View style={styles.planMeta}>
                <Text style={styles.planMetaText}>{plan.days.length} days</Text>
                <Text style={styles.planMetaDot}>·</Text>
                <Text style={styles.planMetaText}>~{selectedDuration} min / session</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
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
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  planAccent: { width: 4, alignSelf: 'stretch' },
  planBody: { flex: 1, padding: spacing.md },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  planTagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planTag: { fontSize: typography.xs, fontWeight: '600' },
  recommendedBadge: {
    backgroundColor: colors.brand.primary + '33',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedText: { color: colors.brand.primary, fontSize: 10, fontWeight: '700' },
  planDesc: { color: colors.text.secondary, fontSize: typography.xs, marginBottom: spacing.sm },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planMetaText: { color: colors.text.muted, fontSize: typography.xs },
  planMetaDot: { color: colors.text.muted, fontSize: typography.xs },
  chevron: { color: colors.text.muted, fontSize: 20, paddingRight: spacing.md },
});
