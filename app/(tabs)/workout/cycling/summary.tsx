import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';
import { useSyncFromStrava, useStravaConnection } from '../../../../hooks/useStrava';

const RED = colors.error;
const STRAVA_ORANGE = '#FC4C02';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function CyclingSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useFeatureAccess();
  const { elapsed, subtype } = useLocalSearchParams<{ elapsed: string; subtype: string; sessionId: string }>();
  const { data: stravaConnection } = useStravaConnection();
  const { mutateAsync: syncStrava, isPending: syncing } = useSyncFromStrava();

  const [syncedMetrics, setSyncedMetrics] = useState<{
    distance_km: number;
    avg_speed_kmh: number;
    duration_seconds: number;
    elevation_gain_m: number;
  } | null>(null);

  const isOutdoor = subtype === 'outdoor';
  const elapsedSec = parseInt(elapsed ?? '0', 10);

  const handleStravaSync = async () => {
    try {
      await syncStrava('cycling');
      Alert.alert('Synced!', 'Your ride has been synced from Strava.');
    } catch {
      Alert.alert('Sync Failed', 'Could not sync from Strava. Make sure you have a completed activity.');
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.emoji}>🚴</Text>
      <Text style={styles.title}>Ride Complete!</Text>
      <Text style={styles.sub}>
        {isOutdoor ? 'Sync your results from Strava' : 'Great indoor session!'}
      </Text>

      {/* Strava sync (outdoor + Pro) */}
      {isPro && isOutdoor && stravaConnection && !syncedMetrics && (
        <View style={styles.stravaCard}>
          <Text style={styles.stravaTitle}>Sync from Strava</Text>
          <Text style={styles.stravaHint}>Pulls your latest completed ride</Text>
          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.syncBtnOff]}
            onPress={handleStravaSync}
            disabled={syncing}
          >
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Synced results */}
      {syncedMetrics && (
        <View style={styles.resultsCard}>
          <Text style={labelStyle}>Synced Results</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{syncedMetrics.distance_km} km</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{syncedMetrics.avg_speed_kmh}</Text>
              <Text style={styles.metricLabel}>Avg km/h</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDuration(syncedMetrics.duration_seconds)}</Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>
          </View>
          {syncedMetrics.elevation_gain_m > 0 && (
            <Text style={styles.elevationText}>
              {syncedMetrics.elevation_gain_m} m elevation gain
            </Text>
          )}
        </View>
      )}

      {/* Indoor session elapsed */}
      {!isOutdoor && elapsedSec > 0 && (
        <View style={styles.elapsedCard}>
          <Text style={styles.elapsedLabel}>Total session time</Text>
          <Text style={styles.elapsedValue}>{formatDuration(elapsedSec)}</Text>
        </View>
      )}

      {/* Outdoor elapsed when no Strava */}
      {isOutdoor && !syncedMetrics && elapsedSec > 0 && !stravaConnection && (
        <View style={styles.elapsedCard}>
          <Text style={styles.elapsedLabel}>Elapsed time</Text>
          <Text style={styles.elapsedValue}>{formatDuration(elapsedSec)}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/workout/cycling' as never)}>
        <Text style={styles.doneBtnText}>Back to Cycling</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 56 },
  title: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  sub: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center' },
  stravaCard: {
    width: '100%',
    backgroundColor: STRAVA_ORANGE + '15',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: STRAVA_ORANGE + '40',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stravaTitle: { color: STRAVA_ORANGE, fontSize: typography.base, fontFamily: fonts.bold },
  stravaHint: { color: colors.text.secondary, fontSize: typography.xs },
  syncBtn: {
    backgroundColor: STRAVA_ORANGE,
    borderRadius: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  syncBtnOff: { opacity: 0.5 },
  syncBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
  resultsCard: {
    width: '100%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metric: { alignItems: 'center' },
  metricValue: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  metricLabel: { color: colors.text.secondary, fontSize: typography.xs },
  elevationText: { color: colors.text.secondary, fontSize: typography.xs, textAlign: 'center' },
  elapsedCard: {
    width: '100%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  elapsedLabel: { color: colors.text.muted, fontSize: typography.xs },
  elapsedValue: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  doneBtn: {
    backgroundColor: RED,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
});
