// app/(tabs)/coach/browse.tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../stores/authStore';
import { getAlgorithmPlan } from '../../../constants/algorithmPlans';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlanData } from '../../../types/database';

const FREQUENCIES = [2, 3, 4, 5, 6];
const DURATIONS = [30, 45, 60, 75, 90];

const PLAN_META: Record<number, { name: string; description: string; color: string }> = {
  2: { name: 'Full Body', description: 'Train your whole body twice a week — great for beginners', color: '#22C55E' },
  3: { name: 'Full Body', description: 'Optimal full body training for strength & size', color: '#6366F1' },
  4: { name: 'Upper / Lower', description: 'Alternate upper and lower body days for balanced gains', color: '#F59E0B' },
  5: { name: 'Push / Pull / Legs', description: 'Classic PPL split with high muscle frequency', color: '#A78BFA' },
  6: { name: 'Push / Pull / Legs', description: 'Advanced 6-day PPL for experienced lifters', color: '#F472B6' },
};

export default function BrowsePlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore(s => s.profile);
  const profileFrequency = Math.min(Math.max(profile?.workout_days?.length ?? 3, 2), 6);

  const rawDuration = profile?.session_duration_min ?? 60;
  const [selectedFrequency, setSelectedFrequency] = useState(profileFrequency);
  const [selectedDuration, setSelectedDuration] = useState(
    DURATIONS.includes(rawDuration) ? rawDuration : 60,
  );

  const meta = PLAN_META[selectedFrequency];
  const plan = getAlgorithmPlan(selectedFrequency, selectedDuration);

  function handleSelectPlan(planData: PlanData) {
    router.push({
      pathname: '/(tabs)/coach/plan',
      params: {
        plan: JSON.stringify(planData),
        source: 'algorithm',
        planName: `${meta.name} · ${selectedFrequency}x / week`,
        frequency: String(selectedFrequency),
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

      {/* Days per week chips */}
      <Text style={styles.sectionLabel}>Days per Week</Text>
      <View style={styles.chipsRow}>
        {FREQUENCIES.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, selectedFrequency === f && styles.chipActive]}
            onPress={() => setSelectedFrequency(f)}
          >
            <Text style={[styles.chipText, selectedFrequency === f && styles.chipTextActive]}>
              {f}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session duration chips */}
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

      {/* Matching plan card */}
      <Text style={styles.sectionLabel}>Suggested Plan</Text>
      <TouchableOpacity
        style={styles.planCard}
        onPress={() => handleSelectPlan(plan)}
        activeOpacity={0.75}
      >
        <View style={[styles.planAccent, { backgroundColor: meta.color }]} />
        <View style={styles.planBody}>
          <View style={styles.planTopRow}>
            <Text style={styles.planName}>{meta.name}</Text>
            {selectedFrequency === profileFrequency && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>For You</Text>
              </View>
            )}
          </View>
          <Text style={styles.planDesc}>{meta.description}</Text>
          <View style={styles.planMeta}>
            <Text style={styles.planMetaText}>{selectedFrequency}x / week</Text>
            <Text style={styles.planMetaDot}>·</Text>
            <Text style={styles.planMetaText}>{plan.days.length} days</Text>
            <Text style={styles.planMetaDot}>·</Text>
            <Text style={styles.planMetaText}>~{selectedDuration} min / session</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { color: colors.text.secondary, fontSize: typography.sm },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  planAccent: { width: 4, alignSelf: 'stretch' },
  planBody: { flex: 1, padding: spacing.md },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  planName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  recommendedBadge: {
    backgroundColor: colors.brand.primary + '33',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedText: { color: colors.brand.primary, fontSize: 10, fontWeight: '700' },
  planDesc: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: spacing.sm },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  planMetaText: { color: colors.text.muted, fontSize: typography.xs },
  planMetaDot: { color: colors.text.muted, fontSize: typography.xs },
  chevron: { color: colors.text.muted, fontSize: 20, paddingRight: spacing.md },
});
