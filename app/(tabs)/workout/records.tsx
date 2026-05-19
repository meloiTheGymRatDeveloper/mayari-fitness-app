import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { usePersonalRecords } from '../../../hooks/useWorkout';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PersonalRecord } from '../../../types/database';

type MuscleGroup = PersonalRecord['muscle_group'];

const GROUP_ORDER: MuscleGroup[] = ['push', 'pull', 'legs', 'core'];
const GROUP_LABELS: Record<MuscleGroup, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PersonalRecordsScreen() {
  const { data: prs = [], isLoading, isError } = usePersonalRecords();

  const grouped = useMemo(() => {
    const map: Record<string, PersonalRecord[]> = {};
    for (const pr of prs) {
      (map[pr.muscle_group] ??= []).push(pr);
    }
    return map;
  }, [prs]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Hindi ma-load ang records.</Text>
        <Text style={styles.emptyBody}>Check your connection and try again.</Text>
      </View>
    );
  }

  if (prs.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Wala pang PRs.</Text>
        <Text style={styles.emptyBody}>Complete a workout to set your first personal records!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {GROUP_ORDER.map(group => {
        const items = grouped[group];
        if (!items?.length) return null;
        return (
          <View key={group} style={styles.section}>
            <Text style={styles.groupLabel}>{GROUP_LABELS[group]}</Text>
            {items.map(pr => (
              <View key={pr.id} style={styles.prCard}>
                <View style={styles.prLeft}>
                  <Text style={styles.prName}>{pr.exercise_name}</Text>
                  <Text style={styles.prDate}>{formatDate(pr.achieved_at)}</Text>
                </View>
                <View style={styles.prRight}>
                  <Text style={styles.prTrophy}>🏆</Text>
                  <Text style={styles.prRecord}>{pr.weight_kg} kg × {pr.reps}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.xs, textAlign: 'center' },
  emptyBody: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center' },
  section: { marginBottom: spacing.lg },
  groupLabel: {
    color: colors.brand.secondary,
    fontSize: typography.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  prCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prLeft: { flex: 1 },
  prName: { color: colors.text.primary, fontSize: typography.base },
  prDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  prRight: { alignItems: 'flex-end' },
  prTrophy: { fontSize: 18 },
  prRecord: { color: colors.brand.accent, fontSize: typography.base, fontWeight: '700' },
});
