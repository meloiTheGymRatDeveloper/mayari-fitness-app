import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing } from '../../../../constants/theme';
import { useSessionDetail } from '../../../../hooks/useWorkout';
import type { WorkoutSet } from '../../../../types/database';

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  return `${mins}m`;
}

function groupSets(
  sets: WorkoutSet[],
): { exerciseName: string; sets: WorkoutSet[] }[] {
  const order: string[] = [];
  const map = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    if (!map.has(set.exercise_name)) {
      order.push(set.exercise_name);
      map.set(set.exercise_name, []);
    }
    map.get(set.exercise_name)!.push(set);
  }
  return order.map((name) => ({ exerciseName: name, sets: map.get(name)! }));
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useSessionDetail(id ?? '');

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load session.</Text>
      </View>
    );
  }

  const { session, sets } = data;

  const dateStr = new Date(session.started_at).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const duration = session.ended_at
    ? formatDuration(session.started_at, session.ended_at)
    : '—';
  const groups = groupSets(sets);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Stat header */}
      <View style={styles.statCard}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Date</Text>
          <Text style={styles.statValue}>{dateStr}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{duration}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{session.total_volume_kg} kg</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>XP</Text>
          <Text style={[styles.statValue, styles.xpValue]}>+{session.xp_earned}</Text>
        </View>
      </View>

      {/* Exercise groups */}
      {groups.map(({ exerciseName, sets: groupedSets }) => (
        <View key={exerciseName} style={styles.exerciseGroup}>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          {groupedSets.map((set) => {
            const weightStr = set.weight_kg === 0
              ? `BW × ${set.reps}`
              : `${set.weight_kg} kg × ${set.reps}`;
            return (
              <View
                key={set.id}
                style={[styles.setRow, set.is_warmup && styles.setRowWarmup]}
              >
                <Text style={[styles.setNum, set.is_warmup && styles.setTextMuted]}>
                  Set {set.set_number}
                </Text>
                <Text style={[styles.setWeight, set.is_warmup && styles.setTextMuted]}>
                  {weightStr}
                </Text>
                {set.is_warmup && (
                  <View style={styles.warmupChip}>
                    <Text style={styles.warmupChipText}>W</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
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
  errorText: { color: colors.text.secondary, fontSize: typography.base },
  statCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statChip: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: spacing.xs },
  statLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  xpValue: { color: colors.brand.accent },
  exerciseGroup: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: {
    color: colors.brand.secondary,
    fontSize: typography.base,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setRowWarmup: { opacity: 0.6 },
  setNum: { color: colors.text.muted, fontSize: typography.xs, width: 44 },
  setWeight: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
  setTextMuted: { color: colors.text.muted },
  warmupChip: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warmupChipText: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
  },
});
