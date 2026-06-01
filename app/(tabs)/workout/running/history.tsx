import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useCardioSessions } from '../../../../hooks/useCardio';

const AMBER = colors.warning;

function formatPace(minPerKm: number | null | undefined): string {
  if (!minPerKm) return '—';
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RunningHistory() {
  const insets = useSafeAreaInsets();
  const { data: sessions = [], isLoading } = useCardioSessions('running', 50);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.loading}>Loading history…</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyEmoji}>🏃</Text>
        <Text style={styles.emptyTitle}>No runs yet</Text>
        <Text style={styles.emptySub}>Log your first run to see history here</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={labelStyle}>Run History</Text>
      {sessions.map(s => {
        const metrics = s.cardio_metrics;
        const dateStr = new Date(s.started_at).toLocaleDateString('en-PH', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        return (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{dateStr}</Text>
              <Text style={styles.cardDist}>
                {metrics?.distance_km ? `${metrics.distance_km} km` : 'Run logged'}
              </Text>
              <Text style={styles.cardMeta}>
                {formatPace(metrics?.avg_pace_min_per_km)} · {formatDuration(metrics?.duration_seconds)}
                {metrics?.strava_activity_id ? ' · Strava' : ''}
              </Text>
            </View>
            <Text style={styles.check}>✓</Text>
          </View>
        );
      })}
      <View style={{ height: spacing['2xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.lg },
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, gap: spacing.sm },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.text.secondary, fontSize: typography.base },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  emptySub: { color: colors.text.secondary, fontSize: typography.sm, marginTop: 4 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLeft: { flex: 1 },
  cardDate: { color: colors.text.muted, fontSize: typography.xs },
  cardDist: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.bold, marginTop: 2 },
  cardMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  check: { color: colors.success, fontSize: typography.lg, fontFamily: fonts.bold },
});
