import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import { useSessionHistory } from '../../../hooks/useWorkout';
import EmptyState from '../../../components/ui/EmptyState';
import type { WorkoutSession } from '../../../types/database';

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  return `${mins}m`;
}

function groupByMonth(
  sessions: WorkoutSession[],
): { month: string; label: string; sessions: WorkoutSession[] }[] {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const key = s.started_at.substring(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    month: key,
    label: new Date(key + '-02').toLocaleDateString('en-PH', {
      month: 'long', year: 'numeric',
    }),
    sessions: items,
  }));
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { data: sessions = [], isLoading } = useSessionHistory();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState
          emoji="📋"
          title="Wala pang history"
          subtitle="Complete your first workout to see it here"
        />
      </View>
    );
  }

  const groups = groupByMonth(sessions);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {groups.map((group) => (
        <View key={group.month} style={styles.group}>
          <Text style={styles.monthLabel}>{group.label}</Text>
          {group.sessions.map((s) => {
            const dateStr = new Date(s.started_at).toLocaleDateString('en-PH', {
              weekday: 'short', month: 'short', day: 'numeric',
            });
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionRow}
                onPress={() => router.push(`/(tabs)/workout/session/${s.id}` as never)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.sessionDate}>{dateStr}</Text>
                  <Text style={styles.sessionVol}>{s.total_volume_kg} kg lifted</Text>
                </View>
                <View style={styles.sessionRight}>
                  {s.ended_at && (
                    <Text style={styles.sessionDur}>
                      {formatDuration(s.started_at, s.ended_at)}
                    </Text>
                  )}
                  <Text style={styles.sessionXp}>+{s.xp_earned} XP</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
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
  group: { marginBottom: spacing.lg },
  monthLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sessionRow: {
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
  sessionDate: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sessionVol: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end', gap: 2 },
  sessionDur: { color: colors.text.muted, fontSize: typography.xs },
  sessionXp: { color: colors.brand.accent, fontSize: typography.xs, fontWeight: '600' },
  chevron: { color: colors.text.muted, fontSize: 18 },
});
