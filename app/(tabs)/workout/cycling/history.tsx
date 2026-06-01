import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useCardioSessions } from '../../../../hooks/useCardio';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function CyclingHistory() {
  const insets = useSafeAreaInsets();
  const { data: sessions = [], isLoading } = useCardioSessions('cycling', 50);

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
        <Text style={styles.emptyEmoji}>🚴</Text>
        <Text style={styles.emptyTitle}>No rides yet</Text>
        <Text style={styles.emptySub}>Log your first ride to see history here</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={labelStyle}>Ride History</Text>
      {sessions.map(s => {
        const metrics = s.cardio_metrics;
        const isOutdoor = metrics?.session_subtype === 'outdoor';
        const dateStr = new Date(s.started_at).toLocaleDateString('en-PH', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        return (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.emoji}>{isOutdoor ? '🚴' : '🏠'}</Text>
                <Text style={styles.cardType}>{isOutdoor ? 'Outdoor' : 'Indoor'}</Text>
              </View>
              <Text style={styles.cardDate}>{dateStr}</Text>
              {metrics?.distance_km && (
                <Text style={styles.cardMeta}>
                  {metrics.distance_km} km
                  {metrics.avg_speed_kmh ? ` · ${metrics.avg_speed_kmh} km/h avg` : ''}
                </Text>
              )}
              {metrics?.duration_seconds && (
                <Text style={styles.cardMeta}>{formatDuration(metrics.duration_seconds)}</Text>
              )}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 14 },
  cardType: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.bold },
  cardDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  cardMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  check: { color: colors.success, fontSize: typography.lg, fontFamily: fonts.bold },
});
